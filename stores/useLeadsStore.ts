import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CustomFieldValue, Lead } from '../data/leads';
import {
  fetchLeads,
  insertLead,
  newLeadId,
  updateLead as pushLeadUpdate,
  type LeadPatch,
} from '../lib/api/leads';
import { captureTimeLabel, initialOf, needsNoteFor } from '../lib/mappers/lead';
import { cardImagePath, extraPhotoPath, uploadCardImage, uploadExtraPhoto } from '../lib/api/storage';
import { claimCaptureFiles, discardCaptureFiles } from '../lib/captureFiles';
import { scanCard } from '../lib/api/cardScan';
import { isOnline } from '../lib/connectivity';
import { currentCaptureFix, settledCaptureLocation } from '../lib/location';
import { findDuplicateLead } from '../lib/api/leads';
import { fetchSentLeadIds } from '../lib/api/messageSends';
import { attachVoiceNote, requestTranscription } from '../lib/api/voiceNotes';
import { queryClient } from '../lib/queryClient';
import { eventKeys } from '../hooks/useEvents';
import { statsKeys } from '../hooks/useEventStats';

/**
 * Tells the event list and the ROI numbers that a lead has landed.
 *
 * Those figures are server-side aggregates — an event's lead count and every
 * stat come back with the event, not from this list, because a rep can only see
 * their own rows and counting on the device would report a fraction of the
 * truth. Nothing was telling them a capture had happened, so a rep who scanned
 * two cards saw "1 lead" against the event until they pulled to refresh.
 *
 * Invalidating is the right lever rather than shortening `staleTime`. The 30
 * seconds set in lib/queryClient.ts is deliberate — this app runs on exhibition
 * hall mobile data — and react-query only refetches queries that are actually
 * mounted, so this costs one request on the screen being looked at and nothing
 * anywhere else.
 */
function eventCountsChanged() {
  void queryClient.invalidateQueries({ queryKey: eventKeys.all });
  void queryClient.invalidateQueries({ queryKey: statsKeys.all });
}

/**
 * Leads on this device.
 *
 * This store *is* the offline outbox. There is no separate queue, because for
 * lead capture the queue and the list are the same thing: a lead whose
 * `syncStatus` is `draft` is one the server has not accepted yet, and a lead
 * carrying a `pendingPatch` has edits that have not landed. Draining is just
 * walking that list.
 *
 * Two properties make replaying safe:
 *
 *   1. The id is generated on the device (`newLeadId`) and is the real primary
 *      key, so sending the same insert twice collides instead of duplicating.
 *   2. Edits are stored as a patch of final values rather than a log of
 *      changes, so applying it twice lands in the same place.
 *
 * The whole thing is persisted because this app cold-starts in an exhibition
 * hall with no signal, and a rep who captured 40 leads offline cannot be shown
 * an empty list.
 */

/**
 * How many times a transient card-read failure is retried before the lead is
 * sent without a name.
 *
 * Three, because the failure this protects against is `extract-card` being
 * unreachable, and the cost of guessing wrong is asymmetric: retrying forever
 * means a rep's captures never reach the server at all, while giving up too
 * early means a lead arrives blank and can be re-read later with one tap.
 */
const MAX_EXTRACTION_ATTEMPTS = 3;

export type SyncStatus = 'draft' | 'synced';

export type StoredLead = Lead & {
  syncStatus: SyncStatus;
  /** Which event this lead belongs to. Every lead has one; the column is NOT NULL. */
  eventId: string;
  /** Who captured it. Persisted, not re-derived: a draft must never be pushed
   *  up under a different person's name if someone else signs in on the phone. */
  capturedBy: string;
  organizationId: string;
  /**
   * A photo taken on this device that has not reached the bucket yet.
   * Separate from `imageUri`, which also holds the object key once it has.
   */
  localImageUri?: string;
  /**
   * The back of the card, on this device and NEVER uploaded.
   *
   * It exists only so the extraction can read both sides. Under the old flow
   * the confirm screen read it while it was still in the camera store and threw
   * it away; extraction now happens down here, long after that screen is gone,
   * so it has to travel this far. Cleared the moment extraction is finished with
   * it — there is no column and no storage policy that would accept it.
   */
  localBackImageUri?: string;
  /**
   * The optional product photo, awaiting upload. Unlike the back of the card
   * this one does reach the bucket, under `leads.extra_photo_path`.
   */
  localExtraPhotoUri?: string;
  /**
   * A recording on this device that has not been attached yet. Cleared once the
   * `voice_notes` row and its audio are both on the server.
   */
  localVoiceUri?: string;
  voiceDurationSeconds?: number;
  voiceExtension?: string;
  /** Set when the recording could not be attached — usually the Free plan cap. */
  voiceError?: string;
  /** Edits made since the last successful push. Final values, not a diff log. */
  pendingPatch?: LeadPatch;
  /**
   * Set when the server refused for a reason retrying will not fix — the rep
   * was removed from the event, or the event was deleted. Retrying forever
   * would hide the problem; this surfaces it.
   */
  syncError?: string;
  /**
   * How many times the card reader has been tried and failed transiently.
   *
   * Bounded because the alternative is a lead that never reaches the server at
   * all: if `extract-card` is down for an afternoon, the rep's captures must
   * still arrive, just without names. At the cap the lead inserts anyway and
   * stays `pending`, which is what the "Read the card again" action picks up.
   */
  extractionAttempts?: number;
};

export type NewLeadInput = {
  organizationId: string;
  eventId: string;
  capturedBy: string;
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  hasVoice?: boolean;
  designation?: string;
  note?: string;
  companyLandline?: string;
  companyWebsite?: string;
  companyAddress?: string;
  branchAddress?: string;
  companySummary?: string;
  customFieldValues?: Record<string, CustomFieldValue>;
  imageUri?: string;
  /** The back of the card. Read by the extraction, never uploaded. */
  backImageUri?: string;
  /** The optional product photo. Uploaded alongside the card. */
  extraPhotoUri?: string;
  voiceUri?: string;
  voiceDurationSeconds?: number;
  voiceExtension?: string;
  consentGiven?: boolean;
  source?: 'card_scan' | 'manual';
};

type LeadsState = {
  leads: StoredLead[];
  isSyncing: boolean;
  isRefreshing: boolean;
  loadError: string | null;
  lastSyncedAt: string | null;
  /**
   * Leads this person has already handed a WhatsApp draft to, which is what
   * "WhatsApp N pending" counts the other side of.
   *
   * Kept as a plain array rather than a Set because it is persisted, and a Set
   * serialises to `{}`. Screens build their own Set from it.
   *
   * It is a UNION of the server's answer and whatever this device has done
   * since, never a replacement. A rep on a show floor with no signal still
   * opens WhatsApp and still messages the customer; `recordSend` drops that row
   * on the floor, and if a later refresh overwrote this list the lead would
   * come back as "pending" after the rep had already messaged them. Nothing is
   * ever removed from it either: a message that was sent stays sent.
   */
  whatsappSentIds: string[];

  /** Pulls the server's rows in and merges them over the local cache. */
  refresh: (opts?: { eventId?: string }) => Promise<void>;
  /** Saves locally and returns immediately — the network never blocks a capture. */
  addLead: (input: NewLeadInput) => Promise<StoredLead>;
  /** Applies an edit locally and queues it. */
  editLead: (leadId: string, patch: LeadPatch) => void;
  /** Corrections from the edit screen: applied locally, then pushed. */
  saveLeadEdits: (leadId: string, patch: LeadPatch) => void;
  /** Hand a lead to another team member. `null` gives it back to the person who captured it. */
  reassignLead: (leadId: string, memberId: string | null) => void;
  /** Records that this lead was put into the phone's contacts, and pushes it. */
  markSavedToContacts: (leadId: string) => void;
  /**
   * Records that a WhatsApp draft was handed to the rep for this lead.
   *
   * Local only, and deliberately: the database row is written by `recordSend`
   * on the same tap. This is what makes the count drop the instant the rep
   * taps, rather than after the next refresh, and what keeps it right when
   * that insert never reaches the server.
   */
  markWhatsAppSent: (leadId: string) => void;
  /**
   * Waits for the capture location to settle and attaches whatever arrived.
   *
   * Fired by `addLead` and never awaited by it. This is the "attach it
   * afterwards if it arrives late" half of the rule: the capture itself only
   * ever uses a fix that was already in hand.
   */
  attachCaptureLocation: (leadId: string) => Promise<void>;
  /**
   * Pushes everything unsynced. Safe to call repeatedly and concurrently.
   * Pass the signed-in user's id to skip captures belonging to anyone else.
   */
  syncDrafts: (currentUserId?: string) => Promise<void>;
  /** Wipes the cache — called on sign-out so the next account starts clean. */
  clear: () => void;
};

function applyPatch(lead: StoredLead, patch: LeadPatch): StoredLead {
  const next: StoredLead = {
    ...lead,
    ...(patch.name !== undefined ? { name: patch.name, initial: initialOf(patch.name) } : {}),
    ...(patch.company !== undefined ? { company: patch.company } : {}),
    ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
    ...(patch.email !== undefined ? { email: patch.email } : {}),
    ...(patch.designation !== undefined ? { designation: patch.designation } : {}),
    ...(patch.note !== undefined ? { note: patch.note } : {}),
    ...(patch.companyLandline !== undefined ? { companyLandline: patch.companyLandline } : {}),
    ...(patch.companyWebsite !== undefined ? { companyWebsite: patch.companyWebsite } : {}),
    ...(patch.companyAddress !== undefined ? { companyAddress: patch.companyAddress } : {}),
    ...(patch.branchAddress !== undefined ? { branchAddress: patch.branchAddress } : {}),
    ...(patch.companySummary !== undefined ? { companySummary: patch.companySummary } : {}),
    ...(patch.customFieldValues !== undefined ? { customFieldValues: patch.customFieldValues } : {}),
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.temperature !== undefined ? { temperature: patch.temperature } : {}),
    ...(patch.followUpDate !== undefined ? { followUpDate: patch.followUpDate ?? undefined } : {}),
    ...(patch.reviewedAt !== undefined ? { reviewedAt: patch.reviewedAt ?? undefined } : {}),
    ...(patch.dealValue !== undefined ? { dealValue: patch.dealValue ?? undefined } : {}),
    ...(patch.dealClosedAt !== undefined ? { dealClosedAt: patch.dealClosedAt ?? undefined } : {}),
    ...(patch.assignedToId !== undefined ? { assignedToId: patch.assignedToId ?? undefined } : {}),
    ...(patch.savedToContacts !== undefined ? { savedToContacts: patch.savedToContacts } : {}),
    ...(patch.captureLatitude !== undefined ? { captureLatitude: patch.captureLatitude } : {}),
    ...(patch.captureLongitude !== undefined ? { captureLongitude: patch.captureLongitude } : {}),
    ...(patch.captureAccuracyMetres !== undefined
      ? { captureAccuracyMetres: patch.captureAccuracyMetres }
      : {}),
    ...(patch.captureAddress !== undefined ? { captureAddress: patch.captureAddress } : {}),
  };

  /**
   * Derived last, from the MERGED lead, and never from the patch.
   *
   * This used to be recomputed inside the `note` branch above, which meant only
   * a typed note could ever move it — so a voice note landing on an existing
   * lead left the flag stale until someone happened to type something. Deriving
   * it here means that whatever changed, the answer is taken from the final
   * state of the lead.
   *
   * Read `next`, never `lead`: `lead` predates the patch, so deriving from it
   * would silently ignore the very note being set.
   */
  return { ...next, needsNote: needsNoteFor(next.note, next.hasVoice) };
}

export const useLeadsStore = create<LeadsState>()(
  persist(
    (set, get) => ({
      leads: [],
      isSyncing: false,
      isRefreshing: false,
      loadError: null,
      lastSyncedAt: null,
      whatsappSentIds: [],

      refresh: async (opts = {}) => {
        set({ isRefreshing: true });
        try {
          // The sends come back alongside the leads rather than in a request of
          // their own, and its failure is swallowed on purpose: a "WhatsApp
          // pending" figure that could not be recomputed is a stale number, not
          // a reason to leave the rep looking at no leads at all.
          const [rows, whatsappSent] = await Promise.all([
            fetchLeads(opts),
            fetchSentLeadIds('whatsapp').catch(() => new Set<string>()),
          ]);
          set((state) => {
            // Anything still in the queue wins over the server's copy of it.
            // The server has not seen those edits yet, so taking its version
            // would silently undo what the rep just typed.
            const unsynced = new Map(
              state.leads
                .filter(
                  (l) =>
                    l.syncStatus === 'draft' ||
                    l.pendingPatch ||
                    l.localImageUri ||
                    l.localBackImageUri ||
                    l.localExtraPhotoUri ||
                    l.localVoiceUri
                )
                .map((l) => [l.id, l])
            );

            const merged: StoredLead[] = rows.map((row) => {
              const local = unsynced.get(row.id);
              /**
               * A recording still sitting in the outbox is a recording.
               *
               * The server cannot see it until the upload lands, so taking its
               * answer wholesale would strip the microphone off a lead the rep
               * recorded against minutes ago — and, since the prompt is derived
               * from this, put "needs a note" back on it until the drain runs.
               * Both keys must come AFTER the spread or `...row` overwrites them.
               */
              const hasVoice = row.hasVoice || Boolean(local?.localVoiceUri);
              const base: StoredLead = {
                ...row,
                hasVoice,
                needsNote: needsNoteFor(row.note, hasVoice),
                syncStatus: 'synced',
                /**
                 * The server is the authority on who a lead belongs to, and it
                 * now sends these back.
                 *
                 * They used to fall back to `''` whenever the lead was not
                 * still sitting in the local outbox — which is every lead after
                 * a cold start, since the outbox only holds what has not synced
                 * yet. An empty `eventId` is why a follow-up went out with no
                 * event name and no stall number: the message screen looks the
                 * event up by that id, found nothing, and rendered `{{event}}`
                 * and `{{stall}}` as blanks.
                 */
                eventId: row.eventId || local?.eventId || opts.eventId || '',
                capturedBy: row.capturedBy || local?.capturedBy || '',
                organizationId: row.organizationId || local?.organizationId || '',
                localImageUri: local?.localImageUri,
                // Both of these are device-only and the server knows nothing
                // about them, so a refresh that dropped them would silently
                // lose a product photo and the back of the card - with no error
                // anywhere, which is what makes the omission so easy to miss.
                localBackImageUri: local?.localBackImageUri,
                localExtraPhotoUri: local?.localExtraPhotoUri,
                localVoiceUri: local?.localVoiceUri,
                extractionAttempts: local?.extractionAttempts,
                extractionError: local?.extractionError,
                voiceDurationSeconds: local?.voiceDurationSeconds,
                voiceExtension: local?.voiceExtension,
                voiceError: local?.voiceError,
              };
              if (!local?.pendingPatch) return base;
              return applyPatch({ ...base, pendingPatch: local.pendingPatch }, local.pendingPatch);
            });

            const onServer = new Set(rows.map((r) => r.id));
            const notYetSent = state.leads.filter((l) => !onServer.has(l.id) && l.syncStatus === 'draft');

            return {
              leads: [...notYetSent, ...merged],
              whatsappSentIds: Array.from(new Set([...state.whatsappSentIds, ...whatsappSent])),
              loadError: null,
              isRefreshing: false,
              lastSyncedAt: new Date().toISOString(),
            };
          });
        } catch {
          // Offline is the normal case here, not an error worth shouting about.
          // What is already cached stays on screen.
          set({
            isRefreshing: false,
            loadError: "Couldn't reach the server. Showing what's on this device.",
          });
        }
      },

      addLead: async (input) => {
        const capturedAt = new Date().toISOString();
        const id = newLeadId();

        /**
         * Move this capture's files out of `captures/pending/` and under the id
         * that now exists, then rewrite the URIs to match.
         *
         * Everything the camera and the recorder produced was copied into
         * durable storage as it was taken (see lib/captureFiles.ts) — but under
         * a shared "pending" name, because there was no lead id yet. This is
         * where they get one. `rebase` passes through unchanged any URI whose
         * copy failed and is still a cache path, so the fail-soft promise holds
         * end to end.
         */
        const rebase = await claimCaptureFiles(id);

        // Derived from whether a recording is actually here. A lead that claims
        // a voice note it does not have shows a microphone icon that leads
        // nowhere. Hoisted out of the object below because `needsNote` is
        // derived from it too.
        const hasVoice = Boolean(input.voiceUri) || (input.hasVoice ?? false);

        /**
         * Whatever fix the phone ALREADY has. There is no `await` on this line
         * and there must never be one.
         *
         * A GPS fix takes seconds and fails indoors, and an exhibition hall is
         * indoors, so a capture is not allowed to wait for one - the same rule
         * the card reader and the transcription already work under. The capture
         * screens call `primeCaptureLocation()` when they open, which is
         * seconds to minutes before this runs, so in the ordinary case the fix
         * is sitting there and rides the insert for nothing. When it is not,
         * this is `undefined` and the lead is saved without it.
         */
        const here = currentCaptureFix();

        const lead: StoredLead = {
          id,
          initial: initialOf(input.name),
          name: input.name,
          company: input.company ?? '',
          time: captureTimeLabel(capturedAt),
          status: 'New',
          hasVoice,
          needsNote: needsNoteFor(input.note, hasVoice),
          phone: input.phone,
          email: input.email,
          designation: input.designation,
          note: input.note,
          companyLandline: input.companyLandline,
          companyWebsite: input.companyWebsite,
          companyAddress: input.companyAddress,
          branchAddress: input.branchAddress,
          companySummary: input.companySummary,
          customFieldValues: input.customFieldValues,
          imageUri: rebase(input.imageUri),
          localImageUri: rebase(input.imageUri),
          localBackImageUri: rebase(input.backImageUri),
          extraPhotoUri: rebase(input.extraPhotoUri),
          localExtraPhotoUri: rebase(input.extraPhotoUri),
          localVoiceUri: rebase(input.voiceUri),
          voiceDurationSeconds: input.voiceDurationSeconds,
          voiceExtension: input.voiceExtension,
          /**
           * `pending` ONLY for a card scan that actually has a photo to read.
           *
           * Everything else is `completed`, and the distinction is load-bearing
           * in both directions: a hand-typed lead marked `pending` would sit in
           * the list saying "Reading card…" forever, and a card scan marked
           * `completed` would never be picked up by the extraction step at all.
           */
          extractionStatus:
            (input.source ?? 'manual') === 'card_scan' && input.imageUri ? 'pending' : 'completed',
          syncStatus: 'draft',
          eventId: input.eventId,
          capturedBy: input.capturedBy,
          organizationId: input.organizationId,
          consentGiven: input.consentGiven ?? false,
          source: input.source ?? 'manual',
          capturedAt,
          captureLatitude: here?.latitude,
          captureLongitude: here?.longitude,
          captureAccuracyMetres: here?.accuracyMetres,
        };

        // Local first, always. The screen advances on this line; the network
        // happens afterwards and is allowed to take as long as it likes.
        set((state) => ({ leads: [lead, ...state.leads] }));

        /**
         * Pass the capturer, which this call used to omit.
         *
         * Without it the drain skips its ownership filter and walks every
         * queued lead on the device, including ones captured by whoever was
         * signed in before. That was harmless while the first thing it did was
         * an insert — RLS refuses those anyway. It is not harmless now: the
         * first step is a billed card read, which happens long before the
         * database gets an opinion.
         */
        void get().syncDrafts(input.capturedBy);

        /**
         * The slow half, off the capture path entirely.
         *
         * `void`, after the return value is already settled: the screen has
         * advanced, the lead is in the list, and this may take as long as it
         * likes or never finish at all. It is what turns a fix that arrived
         * late into a located lead, and coordinates into an address.
         */
        void get().attachCaptureLocation(id);
        return lead;
      },

      editLead: (leadId, patch) =>
        set((state) => ({
          leads: state.leads.map((lead) => {
            if (lead.id !== leadId) return lead;
            const merged = { ...(lead.pendingPatch ?? {}), ...patch };
            return applyPatch({ ...lead, pendingPatch: merged, syncError: undefined }, patch);
          }),
        })),

      /**
       * What the edit screen calls.
       *
       * A named action for the same reason reassignLead and
       * markSavedToContacts are: editLead only queues into `pendingPatch`, so
       * on its own a correction would look right on the phone and never reach
       * the server. Calling it with nothing to change is a no-op rather than
       * an error, so the screen does not have to guard the case twice.
       */
      saveLeadEdits: (leadId, patch) => {
        if (Object.keys(patch).length === 0) return;
        get().editLead(leadId, patch);
        void get().syncDrafts();
      },

      reassignLead: (leadId, memberId) => {
        get().editLead(leadId, { assignedToId: memberId });
        void get().syncDrafts();
      },

      /**
       * Records that this lead went into the phone's contacts.
       *
       * A named action rather than a bare editLead call, for the same reason
       * reassignLead is one: editLead only queues into pendingPatch, so without
       * the syncDrafts() the flag would look right on the device and never
       * reach the server. For a lead still in `draft`, syncDrafts inserts the
       * row first and applies the patch after, so the ordering works out.
       */
      markSavedToContacts: (leadId) => {
        get().editLead(leadId, { savedToContacts: true });
        void get().syncDrafts();
      },

      markWhatsAppSent: (leadId) =>
        set((state) =>
          state.whatsappSentIds.includes(leadId)
            ? state
            : { whatsappSentIds: [...state.whatsappSentIds, leadId] }
        ),

      /**
       * The capture location, once it has finished settling.
       *
       * Two things can still be missing by the time `addLead` has returned: a
       * fix, if none had arrived yet, and the address, which always takes a
       * round trip through the geocoder. This waits for both and writes only
       * what actually moved.
       *
       * ONLY FILLS BLANKS, and that is deliberate rather than defensive. If the
       * insert already carried the coordinates - the ordinary case - resending
       * them would cost a request per capture to say nothing. And a lead that
       * somehow already has a location must not have it overwritten by wherever
       * the rep happens to be standing several seconds later.
       *
       * Every exit is silent. A capture that never got a fix, a geocode that
       * failed, a lead deleted while this was in flight: none of these is
       * something a rep needs to hear about.
       */
      attachCaptureLocation: async (leadId) => {
        const settled = await settledCaptureLocation();
        if (!settled) return;

        const lead = get().leads.find((l) => l.id === leadId);
        if (!lead) return;

        const patch: LeadPatch = {};
        if (lead.captureLatitude === undefined || lead.captureLongitude === undefined) {
          patch.captureLatitude = settled.latitude;
          patch.captureLongitude = settled.longitude;
          if (settled.accuracyMetres !== undefined) {
            patch.captureAccuracyMetres = settled.accuracyMetres;
          }
        }
        if (settled.address && lead.captureAddress === undefined) {
          patch.captureAddress = settled.address;
        }

        // `saveLeadEdits` is a no-op on an empty patch, but returning here also
        // saves the sync pass it would otherwise kick off for nothing.
        if (Object.keys(patch).length === 0) return;
        get().saveLeadEdits(leadId, patch);
      },

      syncDrafts: async (currentUserId?: string) => {
        if (get().isSyncing) return;
        set({ isSyncing: true });

        // Whether anything reached the server this pass. Collected rather than
        // invalidated per lead: a rep who captured forty offline would
        // otherwise fire forty refetches of the same two queries on reconnect.
        let serverChanged = false;

        /**
         * Aggregates moved, but nothing was inserted or patched.
         *
         * Kept apart from `serverChanged` deliberately. That flag also feeds the
         * re-run guard at the bottom of this function, and a re-run can retry a
         * transiently-failed card read — which is a BILLED call. Attaching a
         * voice note moves `needs_note` and `with_voice_note` on the server and
         * so has to invalidate the stats queries, but it must not buy anyone a
         * second card scan to do it.
         */
        let statsChanged = false;

        /**
         * Asked once, before the loop, and used only to gate the card reader.
         *
         * A failed read costs an attempt, and three of them push a perfectly
         * readable card into the "gave up" bucket. Burning that budget while
         * the phone is in a basement would mark cards unreadable for a reason
         * that was never about the card. The rest of the drain does not need
         * this - it finds out by trying, and its transient `break` is the right
         * response - but extraction has state that survives the attempt.
         */
        const online = await isOnline();

        try {
          for (const lead of [...get().leads]) {
            if (lead.syncError) continue; // Needs attention, not another attempt.
            // Row-level security pins captured_by to auth.uid(). Sending
            // someone else's queued capture would be refused anyway, and
            // attributing it to whoever is signed in now would be worse.
            if (currentUserId && lead.capturedBy && lead.capturedBy !== currentUserId) continue;

            /**
             * STEP 0 - read the card, before the row is written.
             *
             * This used to happen on the confirm screen while the rep stood
             * there waiting. It lives here now so that a capture taken with no
             * signal is complete work: the photo, the recording and the event
             * fields are all on the device, and the reading finishes itself
             * whenever the network comes back.
             *
             * Before the insert rather than after it, deliberately. The
             * alternative - insert a nameless row, then patch the fields in -
             * costs two writes per capture, puts a blank-named lead on the
             * server on every single scan, and routes machine output through
             * `pendingPatch`, which is the channel for the REP's edits. A rep
             * correcting a name while an extraction patch was queued for the
             * same lead would get a three-way merge, and one of the two would
             * lose. Reading first avoids all of it.
             *
             * Guarded on `extractionStatus === 'pending'` and nothing looser.
             * That value is written only by the new `addLead`, so a draft
             * queued before this change - which already carries a name the rep
             * typed by hand - has `undefined` here, skips this entirely, and
             * inserts exactly as it always did. A falsy check would re-read
             * those cards and overwrite their names.
             */
            if (
              lead.syncStatus === 'draft' &&
              lead.extractionStatus === 'pending' &&
              lead.localImageUri &&
              online &&
              // Never spend a billed read on a capture belonging to whoever was
              // signed in before. The insert below would be refused by RLS, but
              // that refusal arrives after the money is gone.
              (!currentUserId || !lead.capturedBy || lead.capturedBy === currentUserId)
            ) {
              const attempts = lead.extractionAttempts ?? 0;
              const result = await scanCard(lead.localImageUri, lead.localBackImageUri);

              if (result.ok) {
                const f = result.fields;
                /**
                 * Fill only what is still empty.
                 *
                 * The same rule the confirm screen used. It matters less here -
                 * nobody is typing underneath - but a lead can reach this point
                 * with fields already set, from a retry whose insert failed, and
                 * the rep's own corrections must always win over the machine's.
                 */
                const fill = (current: string | undefined, next: string | null) =>
                  current?.trim() ? current : (next ?? undefined);

                const name = fill(lead.name, f.fullName) ?? '';
                const phone = fill(lead.phone, f.phone);

                /**
                 * STEP 0b - the duplicate check, now that a number exists.
                 *
                 * It used to run on the confirm screen against a field the rep
                 * was typing into. There is no such field any more, so the only
                 * moment this can happen is here, between the card being read
                 * and the row being written. Never blocks the insert - a flagged
                 * duplicate is information, not a refusal.
                 */
                let duplicateOfLeadId: string | undefined;
                if (phone) {
                  const match = await findDuplicateLead(lead.eventId, phone);
                  if (match) duplicateOfLeadId = match.leadId;
                }

                /**
                 * Written to the device BEFORE the insert is attempted.
                 *
                 * `scanCard` costs money. If the insert below fails transiently
                 * - and it will, on the hall wifi this whole feature exists for
                 * - the next drain must not read the same card again. Recording
                 * `completed` here makes the step idempotent, which is the same
                 * property the id-on-the-device trick already gives the insert.
                 */
                set((state) => ({
                  leads: state.leads.map((l) =>
                    l.id === lead.id
                      ? {
                          ...l,
                          name,
                          initial: initialOf(name),
                          phone,
                          company: fill(l.company, f.company) ?? '',
                          email: fill(l.email, f.email),
                          designation: fill(l.designation, f.designation),
                          companyLandline: fill(l.companyLandline, f.companyLandline),
                          companyWebsite: fill(l.companyWebsite, f.companyWebsite),
                          companyAddress: fill(l.companyAddress, f.companyAddress),
                          branchAddress: fill(l.branchAddress, f.branchAddress),
                          duplicateOfLeadId,
                          // `read: false` means the call worked and the photo
                          // held nothing legible - a photo of a badge, a thumb
                          // over the card. Not retryable, and not an error the
                          // rep can be asked to do anything about except look.
                          extractionStatus: result.read ? 'completed' : 'failed',
                          extractionError: result.read
                            ? undefined
                            : 'Nothing readable on that photo.',
                          // The back has done its only job and is never uploaded.
                          localBackImageUri: undefined,
                        }
                      : l
                  ),
                }));
              } else if (!result.retryable || attempts + 1 >= MAX_EXTRACTION_ATTEMPTS) {
                /**
                 * Give up reading, but never give up the lead.
                 *
                 * The photo, the recording and the custom fields are real work
                 * the rep did; the reading is enrichment on top. So this falls
                 * through to the insert below carrying blanks, and the lead
                 * shows in the list marked as needing attention. Losing it here
                 * would be the one outcome this rework must not introduce.
                 */
                set((state) => ({
                  leads: state.leads.map((l) =>
                    l.id === lead.id
                      ? {
                          ...l,
                          extractionAttempts: attempts + 1,
                          // A permanent failure is final and says so. Running
                          // out of attempts is not: it stays `pending` so the
                          // "Read the card again" action can pick it up once
                          // whatever was wrong has passed.
                          extractionStatus: result.retryable ? 'pending' : 'failed',
                          extractionError: result.message,
                          localBackImageUri: undefined,
                        }
                      : l
                  ),
                }));
              } else {
                /**
                 * Transient, with attempts left: skip THIS lead and carry on.
                 *
                 * Emphatically not `break`. The insert below breaks the drain on
                 * a transient failure because "the rest will fail the same way"
                 * - true when the connection is dead. It is not true here:
                 * `extract-card` can be rate-limited or erroring while Postgres
                 * is perfectly healthy, and breaking would strand every other
                 * lead's insert, every photo, every recording, and every queued
                 * status change and deal value on leads that are already synced.
                 * One 429 must not hold the outbox hostage.
                 */
                set((state) => ({
                  leads: state.leads.map((l) =>
                    l.id === lead.id ? { ...l, extractionAttempts: attempts + 1 } : l
                  ),
                }));
                continue;
              }
            }

            // Re-read: step 0 above may have just filled in the name and the
            // number this insert is about to send.
            const forInsert = get().leads.find((l) => l.id === lead.id) ?? lead;

            if (forInsert.syncStatus === 'draft') {
              // Every field below comes from `forInsert`, never `lead`: the
              // snapshot taken at the top of the loop predates step 0, so
              // using it here would send the blanks the card was read to fill.
              const outcome = await insertLead({
                id: forInsert.id,
                organizationId: forInsert.organizationId,
                eventId: forInsert.eventId,
                capturedBy: forInsert.capturedBy,
                name: forInsert.name,
                company: forInsert.company,
                phone: forInsert.phone,
                email: forInsert.email,
                designation: forInsert.designation,
                note: forInsert.note,
                companyLandline: forInsert.companyLandline,
                companyWebsite: forInsert.companyWebsite,
                companyAddress: forInsert.companyAddress,
                branchAddress: forInsert.branchAddress,
                companySummary: forInsert.companySummary,
                customFieldValues: forInsert.customFieldValues,
                consentGiven: forInsert.consentGiven,
                source: forInsert.source,
                capturedAt: forInsert.capturedAt,
                // Written with the row because the bucket policy reads it back.
                cardImagePath: forInsert.localImageUri
                  ? cardImagePath(forInsert.organizationId, forInsert.id)
                  : undefined,
                extraPhotoPath: forInsert.localExtraPhotoUri
                  ? extraPhotoPath(forInsert.organizationId, forInsert.id)
                  : undefined,
                extractionStatus: forInsert.extractionStatus,
                duplicateOfLeadId: forInsert.duplicateOfLeadId,
                // Read from `forInsert` like everything else here, so a fix or
                // an address that landed while this lead was waiting its turn
                // goes in the insert instead of costing a second request.
                captureLatitude: forInsert.captureLatitude,
                captureLongitude: forInsert.captureLongitude,
                captureAccuracyMetres: forInsert.captureAccuracyMetres,
                captureAddress: forInsert.captureAddress,
              });

              if (!outcome.ok) {
                if (outcome.permanent) {
                  set((state) => ({
                    leads: state.leads.map((l) =>
                      l.id === lead.id ? { ...l, syncError: outcome.message } : l
                    ),
                  }));
                }
                // Transient: leave it queued and stop — the rest will fail the
                // same way, and hammering a dead connection drains the battery.
                if (!outcome.permanent) break;
                continue;
              }

              // A new row on the server: the event's lead count just moved.
              serverChanged = true;
              set((state) => ({
                leads: state.leads.map((l) =>
                  l.id === lead.id ? { ...l, syncStatus: 'synced' as const } : l
                ),
              }));
            }

            // The photo goes after the row, never before: storage refuses the
            // object until the lead exists carrying its key. A failure here
            // costs the photo, never the lead — every typed field is already
            // safely on the server by this point.
            const current = get().leads.find((l) => l.id === lead.id);
            if (current?.localImageUri && current.syncStatus === 'synced') {
              const outcome = await uploadCardImage(
                current.organizationId,
                current.id,
                current.localImageUri
              );
              if (outcome.ok) {
                set((state) => ({
                  leads: state.leads.map((l) =>
                    l.id === lead.id
                      ? { ...l, localImageUri: undefined, imageUri: outcome.path }
                      : l
                  ),
                }));
              } else if (outcome.permanent) {
                // Stop trying. The lead keeps everything else.
                set((state) => ({
                  leads: state.leads.map((l) =>
                    l.id === lead.id ? { ...l, localImageUri: undefined } : l
                  ),
                }));
              }
            }

            /**
             * STEP 2b - the product photo, on exactly the same rule as the card.
             *
             * Same bucket, same policy, same ordering constraint: the row has to
             * exist carrying `extra_photo_path` before storage will accept the
             * object. A failure here costs the photo and never the lead, which
             * is why it neither sets `syncError` nor breaks the drain.
             */
            const withExtra = get().leads.find((l) => l.id === lead.id);
            if (withExtra?.localExtraPhotoUri && withExtra.syncStatus === 'synced') {
              const outcome = await uploadExtraPhoto(
                withExtra.organizationId,
                withExtra.id,
                withExtra.localExtraPhotoUri
              );
              if (outcome.ok) {
                set((state) => ({
                  leads: state.leads.map((l) =>
                    l.id === lead.id
                      ? { ...l, localExtraPhotoUri: undefined, extraPhotoUri: outcome.path }
                      : l
                  ),
                }));
              } else if (outcome.permanent) {
                set((state) => ({
                  leads: state.leads.map((l) =>
                    l.id === lead.id ? { ...l, localExtraPhotoUri: undefined } : l
                  ),
                }));
              }
            }

            // The recording, on the same rule as the photo: the voice_notes row
            // carries the object key, so it has to exist before storage will
            // take the audio. Transcription is asked for afterwards and is
            // fire-and-forget — the rep has already walked away.
            const withVoice = get().leads.find((l) => l.id === lead.id);
            if (withVoice?.localVoiceUri && withVoice.syncStatus === 'synced' && !withVoice.voiceError) {
              const outcome = await attachVoiceNote({
                leadId: withVoice.id,
                organizationId: withVoice.organizationId,
                recordedBy: withVoice.capturedBy,
                uri: withVoice.localVoiceUri,
                durationSeconds: withVoice.voiceDurationSeconds ?? 1,
                extension: withVoice.voiceExtension,
              });

              if (outcome.ok) {
                void requestTranscription(outcome.voiceNote.id);
                // The server's needs_note and with_voice_note both just moved.
                statsChanged = true;
                set((state) => ({
                  leads: state.leads.map((l) =>
                    l.id === lead.id
                      ? {
                          ...l,
                          localVoiceUri: undefined,
                          hasVoice: true,
                          // The recording IS the note now, so the prompt comes off.
                          needsNote: needsNoteFor(l.note, true),
                        }
                      : l
                  ),
                }));
              } else if (outcome.reason === 'limit' || outcome.reason === 'file') {
                // No amount of retrying gets past a plan limit or a file the
                // OS has cleared. The lead keeps everything else, and the
                // microphone icon comes off so it does not promise audio that
                // is not there.
                set((state) => ({
                  leads: state.leads.map((l) =>
                    l.id === lead.id
                      ? {
                          ...l,
                          localVoiceUri: undefined,
                          hasVoice: false,
                          // The recording is never arriving, so the prompt has to
                          // come BACK. This lead now has neither kind of note,
                          // which is exactly what the filter exists to catch.
                          needsNote: needsNoteFor(l.note, false),
                          voiceError: outcome.message,
                        }
                      : l
                  ),
                }));
              }
            }

            const patch = get().leads.find((l) => l.id === lead.id)?.pendingPatch;
            if (patch && Object.keys(patch).length) {
              const outcome = await pushLeadUpdate(lead.id, patch);
              if (!outcome.ok) {
                if (outcome.permanent) {
                  set((state) => ({
                    leads: state.leads.map((l) =>
                      l.id === lead.id ? { ...l, syncError: outcome.message } : l
                    ),
                  }));
                  continue;
                }
                break;
              }
              // A status change or a deal value moves the ROI figures and the
              // leaderboard, not just the count.
              serverChanged = true;
              set((state) => ({
                leads: state.leads.map((l) =>
                  l.id === lead.id ? { ...l, pendingPatch: undefined } : l
                ),
              }));
            }

            /**
             * Delete this capture's durable files once nothing points at them.
             *
             * `lib/captureFiles.ts` copies every photo and recording into the
             * document directory so the OS cannot reclaim them mid-capture -
             * which also means the OS will never reclaim them afterwards. Without
             * this, a rep working a three-day show accumulates a permanent photo
             * archive that only a reinstall clears.
             *
             * Every one of the four has to be clear, not just the card: each is
             * cleared by its own step above, and deleting the directory while the
             * recording was still queued would turn a retryable upload into a
             * permanent one.
             */
            const drained = get().leads.find((l) => l.id === lead.id);
            if (
              drained &&
              drained.syncStatus === 'synced' &&
              !drained.localImageUri &&
              !drained.localBackImageUri &&
              !drained.localExtraPhotoUri &&
              !drained.localVoiceUri
            ) {
              discardCaptureFiles(drained.id);
            }
          }
        } finally {
          set({ isSyncing: false, lastSyncedAt: new Date().toISOString() });
          if (serverChanged || statsChanged) eventCountsChanged();
        }

        /**
         * A capture made *while* this pass was running was not in its snapshot,
         * and its own `syncDrafts()` call hit the re-entrancy guard at the top
         * and did nothing. Two cards scanned back to back is the ordinary case
         * at a stall, so without this the second one waits for the next app
         * foreground — and the event really does show one lead.
         *
         * Guarded on `serverChanged`, so this only runs again when the last
         * pass made progress. Every pass either turns a draft into a row or
         * clears a patch, both finite, so it cannot spin.
         *
         * A QUEUED PATCH COUNTS TOO, not just a queued capture. The capture
         * location is the case that made this matter: it is attached seconds
         * after the lead is saved, which is very often while this very pass is
         * still running, and a patch on a lead the loop has already walked past
         * would otherwise sit on the device until the next app foreground.
         * Excluding `syncError` is what keeps that finite - a patch the server
         * refuses permanently sets it and stops being retried.
         */
        const unfinished = (l: StoredLead) =>
          !l.syncError &&
          (l.syncStatus === 'draft' || Boolean(l.pendingPatch && Object.keys(l.pendingPatch).length));
        if (serverChanged && get().leads.some(unfinished)) {
          void get().syncDrafts(currentUserId);
        }
      },

      // `whatsappSentIds` goes with the leads: it is a list of lead ids from an
      // account that is signing out, and leaving it behind would carry one
      // person's sends into the next person's counts.
      clear: () => set({ leads: [], whatsappSentIds: [], loadError: null, lastSyncedAt: null }),
    }),
    {
      name: 'yieldd-leads',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        leads: state.leads,
        lastSyncedAt: state.lastSyncedAt,
        // Persisted so an offline send is still known after a restart. A cache
        // written before this key existed simply has none, and zustand's merge
        // leaves the initial `[]` in place — no version bump is needed for an
        // added key, only for one whose meaning changed.
        whatsappSentIds: state.whatsappSentIds,
      }),
      // v2: leads are real database rows now. A v1 cache is the seven fake
      // "Rajesh Menon / Northline Engineering" rows and must not be pushed to
      // anyone's account.
      /**
       * v3: three new device-only fields (the back photo, the product photo and
       * the extraction attempt count).
       *
       * The migration KEEPS the cache, unlike v2's. That wipe was correct for
       * what it faced - a v1 cache held seven fake seeded leads that must never
       * be pushed to a real account - but copying it here would delete every
       * unsynced capture on the device the moment the app updated, which is
       * exactly the data this whole rework exists to protect. The new fields are
       * all optional, so an untouched v2 lead is already a valid v3 lead.
       */
      version: 3,
      migrate: (persisted) =>
        persisted as {
          leads: StoredLead[];
          lastSyncedAt: string | null;
          whatsappSentIds?: string[];
        },
    }
  )
);
