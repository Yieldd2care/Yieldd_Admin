import { create } from 'zustand';

type CaptureDraftState = {
  hasVoice: boolean;
  setHasVoice: (value: boolean) => void;
  imageUri: string | null;
  setImageUri: (uri: string | null) => void;
  reset: () => void;
};

export const useCaptureDraftStore = create<CaptureDraftState>((set) => ({
  hasVoice: false,
  setHasVoice: (value) => set({ hasVoice: value }),
  imageUri: null,
  setImageUri: (uri) => set({ imageUri: uri }),
  reset: () => set({ hasVoice: false, imageUri: null }),
}));
