import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { SessionState, User } from '../types/session';

function mockId() {
  return `usr_${Math.random().toString(36).slice(2, 10)}`;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      isNewSignup: false,
      signUp: ({ name, company, email }) => {
        const user: User = {
          id: mockId(),
          email,
          name,
          company,
          role: 'admin',
          createdAt: new Date().toISOString(),
        };
        set({ user, isNewSignup: true });
      },
      signIn: ({ email }) => {
        const user: User = {
          id: mockId(),
          email,
          name: 'Priya Sharma',
          company: 'Acme Industries Pvt Ltd',
          role: 'admin',
          createdAt: new Date().toISOString(),
        };
        set({ user, isNewSignup: false });
      },
      signOut: () => set({ user: null, isNewSignup: false }),
    }),
    {
      name: 'yieldd-session',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
