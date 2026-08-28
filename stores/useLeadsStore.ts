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
import { captureTimeLabel, initialOf } from '../lib/mappers/lead';
import { cardImagePath, uploadCardImage } from '../lib/api/storage';

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
  /** Edits made since the last successful push. Final values, not a diff log. */
  pendingPatch?: LeadPatch;
  /**
   * Set when the server refused for a reason retrying will not fix — the rep
   * was removed from the event, or the event was deleted. Retrying forever
   * would hide the problem; this surfaces it.
   */
  syncError?: string;
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
  companySummary?: string;
  customFieldValues?: Record<string, CustomFieldValue>;
  imageUri?: string;
  consentGiven?: boolean;
  source?: 'card_scan' | 'manual';
};

type LeadsState = {
  leads: StoredLead[];
  isSyncing: boolean;
  isRefreshing: boolean;
  loadError: string | null;
  lastSyncedAt: string | null;

  /** Pulls the server's rows in and merges them over the local cache. */
  refresh: (opts?: { eventId?: string }) => Promise<void>;
  /** Saves locally and returns immediately — the network never blocks a capture. */
  addLead: (input: NewLeadInput) => Promise<StoredLead>;
  /** Applies an edit locally and queues it. */
  editLead: (leadId: string, patch: LeadPatch) => void;
  /** Hand a lead to another team member. `null` gives it back to the person who captured it. */
  reassignLead: (leadId: string, memberId: string | null) => void;
  /**
   * Pushes everything unsynced. Safe to call repeatedly and concurrently.
   * Pass the signed-in user's id to skip captures belonging to anyone else.
   */
  syncDrafts: (currentUserId?: string) => Promise<void>;
  /** Wipes the cache — called on sign-out so the next account starts clean. */
  clear: () => void;
};

function applyPatch(lead: StoredLead, patch: LeadPatch): StoredLead {
  return {
    ...lead,
    ...(patch.name !== undefined ? { name: patch.name, initial: initialOf(patch.name) } : {}),
    ...(patch.company !== undefined ? { company: patch.company } : {}),
    ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
    ...(patch.email !== undefined ? { email: patch.email } : {}),
    ...(patch.designation !== undefined ? { designation: patch.designation } : {}),
    ...(patch.note !== undefined ? { note: patch.note, needsNote: !patch.note.trim() } : {}),
    ...(patch.companyLandline !== undefined ? { companyLandline: patch.companyLandline } : {}),
    ...(patch.companyWebsite !== undefined ? { companyWebsite: patch.companyWebsite } : {}),
    ...(patch.companyAddress !== undefined ? { companyAddress: patch.companyAddress } : {}),
    ...(patch.companySummary !== undefined ? { companySummary: patch.companySummary } : {}),
    ...(patch.customFieldValues !== undefined ? { customFieldValues: patch.customFieldValues } : {}),
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.followUpDate !== undefined ? { followUpDate: patch.followUpDate ?? undefined } : {}),
    ...(patch.reviewedAt !== undefined ? { reviewedAt: patch.reviewedAt ?? undefined } : {}),
    ...(patch.dealValue !== undefined ? { dealValue: patch.dealValue ?? undefined } : {}),
    ...(patch.dealClosedAt !== undefined ? { dealClosedAt: patch.dealClosedAt ?? undefined } : {}),
    ...(patch.assignedToId !== undefined ? { assignedToId: patch.assignedToId ?? undefined } : {}),
  };
}

export const useLeadsStore = create<LeadsState>()(
  persist(
    (set, get) => ({
      leads: [],
      isSyncing: false,
      isRefreshing: false,
      loadError: null,
      lastSyncedAt: null,

      refresh: async (opts = {}) => {
        set({ isRefreshing: true });
        try {
          const rows = await fetchLeads(opts);
          set((state) => {
            // Anything still in the queue wins over the server's copy of it.
            // The server has not seen those edits yet, so taking its version
            // would silently undo what the rep just typed.
            const unsynced = new Map(
              state.leads
                .filter((l) => l.syncStatus === 'draft' || l.pendingPatch || l.localImageUri)
                .map((l) => [l.id, l])
            );

            const merged: StoredLead[] = rows.map((row) => {
              const local = unsynced.get(row.id);
              const base: StoredLead = {
                ...row,
                syncStatus: 'synced',
                eventId: local?.eventId ?? opts.eventId ?? '',
                capturedBy: local?.capturedBy ?? '',
                organizationId: local?.organizationId ?? '',
                localImageUri: local?.localImageUri,
              };
              if (!local?.pendingPatch) return base;
              return applyPatch({ ...base, pendingPatch: local.pendingPatch }, local.pendingPatch);
            });

            const onServer = new Set(rows.map((r) => r.id));
            const notYetSent = state.leads.filter((l) => !onServer.has(l.id) && l.syncStatus === 'draft');

            return {
              leads: [...notYetSent, ...merged],
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
        const lead: StoredLead = {
          id: newLeadId(),
          initial: initialOf(input.name),
          name: input.name,
          company: input.company ?? '',
          time: captureTimeLabel(capturedAt),
          status: 'New',
          hasVoice: input.hasVoice ?? false,
          needsNote: !input.note?.trim(),
          phone: input.phone,
          email: input.email,
          designation: input.designation,
          note: input.note,
          companyLandline: input.companyLandline,
          companyWebsite: input.companyWebsite,
          companyAddress: input.companyAddress,
          companySummary: input.companySummary,
          customFieldValues: input.customFieldValues,
          imageUri: input.imageUri,
          localImageUri: input.imageUri,
          syncStatus: 'draft',
          eventId: input.eventId,
          capturedBy: input.capturedBy,
          organizationId: input.organizationId,
          consentGiven: input.consentGiven ?? false,
          source: input.source ?? 'manual',
          capturedAt,
        };

        // Local first, always. The screen advances on this line; the network
        // happens afterwards and is allowed to take as long as it likes.
        set((state) => ({ leads: [lead, ...state.leads] }));

        void get().syncDrafts();
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

      reassignLead: (leadId, memberId) => {
        get().editLead(leadId, { assignedToId: memberId });
        void get().syncDrafts();
      },

      syncDrafts: async (currentUserId?: string) => {
        if (get().isSyncing) return;
        set({ isSyncing: true });

        try {
          for (const lead of [...get().leads]) {
            if (lead.syncError) continue; // Needs attention, not another attempt.
            // Row-level security pins captured_by to auth.uid(). Sending
            // someone else's queued capture would be refused anyway, and
            // attributing it to whoever is signed in now would be worse.
            if (currentUserId && lead.capturedBy && lead.capturedBy !== currentUserId) continue;

            if (lead.syncStatus === 'draft') {
              const outcome = await insertLead({
                id: lead.id,
                organizationId: lead.organizationId,
                eventId: lead.eventId,
                capturedBy: lead.capturedBy,
                name: lead.name,
                company: lead.company,
                phone: lead.phone,
                email: lead.email,
                designation: lead.designation,
                note: lead.note,
                companyLandline: lead.companyLandline,
                companyWebsite: lead.companyWebsite,
                companyAddress: lead.companyAddress,
                companySummary: lead.companySummary,
                customFieldValues: lead.customFieldValues,
                consentGiven: lead.consentGiven,
                source: lead.source,
                capturedAt: lead.capturedAt,
                // Written with the row because the bucket policy reads it back.
                cardImagePath: lead.localImageUri
                  ? cardImagePath(lead.organizationId, lead.id)
                  : undefined,
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
              set((state) => ({
                leads: state.leads.map((l) =>
                  l.id === lead.id ? { ...l, pendingPatch: undefined } : l
                ),
              }));
            }
          }
        } finally {
          set({ isSyncing: false, lastSyncedAt: new Date().toISOString() });
        }
      },

      clear: () => set({ leads: [], loadError: null, lastSyncedAt: null }),
    }),
    {
      name: 'yieldd-leads',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ leads: state.leads, lastSyncedAt: state.lastSyncedAt }),
      // v2: leads are real database rows now. A v1 cache is the seven fake
      // "Rajesh Menon / Northline Engineering" rows and must not be pushed to
      // anyone's account.
      version: 2,
      migrate: () => ({ leads: [], lastSyncedAt: null }),
    }
  )
);
