import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type CardProfileFields = {
  designation: string;
  mobile: string;
  secondaryEmail: string;
  linkedin: string;
  website: string;
  officeAddress: string;
  bio: string;
};

export type SocialLink = { id: string; label: string; url: string };

type CardProfileState = CardProfileFields & {
  socialLinks: SocialLink[];
  setField: <K extends keyof CardProfileFields>(key: K, value: CardProfileFields[K]) => void;
  addSocialLink: () => void;
  updateSocialLink: (id: string, patch: Partial<SocialLink>) => void;
  removeSocialLink: (id: string) => void;
};

function socialId() {
  return `soc_${Math.random().toString(36).slice(2, 10)}`;
}

const DEFAULT_FIELDS: CardProfileFields = {
  designation: '',
  mobile: '',
  secondaryEmail: '',
  linkedin: '',
  website: '',
  officeAddress: '',
  bio: '',
};

export const useCardProfileStore = create<CardProfileState>()(
  persist(
    (set) => ({
      ...DEFAULT_FIELDS,
      socialLinks: [],
      setField: (key, value) => set({ [key]: value } as Partial<CardProfileState>),
      addSocialLink: () =>
        set((state) => ({ socialLinks: [...state.socialLinks, { id: socialId(), label: '', url: '' }] })),
      updateSocialLink: (id, patch) =>
        set((state) => ({
          socialLinks: state.socialLinks.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        })),
      removeSocialLink: (id) =>
        set((state) => ({ socialLinks: state.socialLinks.filter((s) => s.id !== id) })),
    }),
    {
      name: 'yieldd-card-profile',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
