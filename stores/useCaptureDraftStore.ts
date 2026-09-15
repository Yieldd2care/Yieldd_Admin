import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { captureFileExists } from '../lib/captureFiles';

/**
 * What has been gathered for the lead currently being captured.
 *
 * ---------------------------------------------------------------------------
 * This store used to be deliberately NOT persisted, and that reasoning has
 * reversed. It read:
 *
 *   "it holds file URIs from the camera and the recorder, which live in the OS
 *    cache and can be cleared between launches. A persisted path to a file that
 *    no longer exists is worse than starting again."
 *
 * Correct at the time, and it stopped being correct for two reasons.
 *
 * First, the files are no longer in the cache. `lib/captureFiles.ts` copies
 * every one of them into the document directory at capture time, which the
 * system does not reclaim — so a persisted path now points at a file that is
 * still there.
 *
 * Second, the cost of losing this changed. Under the old flow the store held a
 * photo and the rep re-took it. Under the new one it holds a photo, a voice
 * note the rep spent thirty seconds recording, and the event fields they filled
 * in — and on a card-scan capture the photo is the ONLY place the person's name
 * exists until the AI reads it. Losing that to a backgrounded app being reaped
 * is not an inconvenience, it is a lost customer.
 *
 * The old objection is still answered, not ignored: `rehydrate()` below checks
 * every URI and clears the ones whose file has gone.
 * ---------------------------------------------------------------------------
 */
type CaptureDraftState = {
  hasVoice: boolean;
  setHasVoice: (value: boolean) => void;

  imageUri: string | null;
  setImageUri: (uri: string | null) => void;

  /**
   * The back of the same card, when the rep chose to take it.
   *
   * Optional on purpose — most cards have nothing useful on the back, so
   * requiring it would slow every capture to help a minority.
   *
   * It is read by the extraction and then discarded: only the front is
   * uploaded, because the `card-images` policies match `leads.card_image_path`
   * exactly and a second object would have no row to point at it. What changed
   * with the new flow is WHEN it is read — extraction now happens in the sync
   * drain, long after this screen is gone, so the back has to travel as far as
   * the draft lead (`StoredLead.localBackImageUri`) instead of being consumed
   * on the confirm screen. It is still never uploaded.
   */
  backImageUri: string | null;
  setBackImageUri: (uri: string | null) => void;

  /**
   * An optional second photo — the product the visitor asked about, a stall
   * banner, a scribbled note. Unlike the back of the card this one IS uploaded
   * and shown back on the lead, which is why it needed its own column and its
   * own storage-policy amendment (migration 20260915100000).
   */
  extraPhotoUri: string | null;
  setExtraPhotoUri: (uri: string | null) => void;

  /** The recording on disk, waiting for the lead to be saved. */
  voiceUri: string | null;
  voiceDurationSeconds: number;
  /** `.m4a` on a phone, `.webm` in a browser. */
  voiceExtension: string;
  setVoiceNote: (input: { uri: string; durationSeconds: number; extension: string } | null) => void;

  reset: () => void;
};

const EMPTY = {
  hasVoice: false,
  imageUri: null,
  backImageUri: null,
  extraPhotoUri: null,
  voiceUri: null,
  voiceDurationSeconds: 0,
  voiceExtension: '.m4a',
};

export const useCaptureDraftStore = create<CaptureDraftState>()(
  persist(
    (set) => ({
      ...EMPTY,

      setHasVoice: (value) => set({ hasVoice: value }),
      setImageUri: (uri) => set({ imageUri: uri }),
      setBackImageUri: (uri) => set({ backImageUri: uri }),
      setExtraPhotoUri: (uri) => set({ extraPhotoUri: uri }),

      setVoiceNote: (input) =>
        set(
          input
            ? {
                voiceUri: input.uri,
                voiceDurationSeconds: input.durationSeconds,
                voiceExtension: input.extension,
                // The two always move together — a lead that says it has a voice
                // note but carries no file is the bug this prevents.
                hasVoice: true,
              }
            : { voiceUri: null, voiceDurationSeconds: 0, hasVoice: false }
        ),

      reset: () => set({ ...EMPTY }),
    }),
    {
      name: 'yieldd-capture-draft',
      storage: createJSONStorage(() => AsyncStorage),
      // Only the gathered values. The setters are recreated by the initialiser
      // on every launch and persisting them would serialise functions to null.
      partialize: (state) => ({
        hasVoice: state.hasVoice,
        imageUri: state.imageUri,
        backImageUri: state.backImageUri,
        extraPhotoUri: state.extraPhotoUri,
        voiceUri: state.voiceUri,
        voiceDurationSeconds: state.voiceDurationSeconds,
        voiceExtension: state.voiceExtension,
      }),
      version: 1,

      /**
       * Never hand a screen a URI whose file has gone.
       *
       * This is the answer to the objection the old header raised. Anything
       * missing is cleared; and if a card photo was taken and its file has
       * since gone, the whole draft is reset — a card-scan capture with a voice
       * note and custom fields but no card is not one anyone can finish, since
       * the name was only ever going to come from that photo.
       *
       * `imageUri === null` is NOT that case. It is the manual-entry path,
       * where the rep types the details and may still have recorded a voice
       * note. Resetting on a null here would silently discard that recording
       * every time the app was backgrounded.
       */
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        if (state.imageUri && !captureFileExists(state.imageUri)) {
          state.reset();
          return;
        }
        if (!captureFileExists(state.backImageUri)) state.backImageUri = null;
        if (!captureFileExists(state.extraPhotoUri)) state.extraPhotoUri = null;
        if (!captureFileExists(state.voiceUri)) {
          state.voiceUri = null;
          state.voiceDurationSeconds = 0;
          state.hasVoice = false;
        }
      },
    }
  )
);
