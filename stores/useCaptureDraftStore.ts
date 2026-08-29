import { create } from 'zustand';

/**
 * What has been gathered for the lead currently being captured.
 *
 * Not persisted, deliberately: it holds file URIs from the camera and the
 * recorder, which live in the OS cache and can be cleared between launches. A
 * persisted path to a file that no longer exists is worse than starting again.
 * The lead itself is persisted the moment it is saved — see useLeadsStore.
 */
type CaptureDraftState = {
  hasVoice: boolean;
  setHasVoice: (value: boolean) => void;

  imageUri: string | null;
  setImageUri: (uri: string | null) => void;

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
  voiceUri: null,
  voiceDurationSeconds: 0,
  voiceExtension: '.m4a',
};

export const useCaptureDraftStore = create<CaptureDraftState>((set) => ({
  ...EMPTY,

  setHasVoice: (value) => set({ hasVoice: value }),
  setImageUri: (uri) => set({ imageUri: uri }),

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
}));
