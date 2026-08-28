import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Which event the app is currently working in.
 *
 * Only the id is kept, never a copy of the event — the row itself comes from
 * the query cache, so a renamed or reconfigured event is right everywhere at
 * once. Persisted because a rep works one show for four days straight and
 * should not have to re-pick it every cold start.
 *
 * `null` means "whatever is running now", which `useCurrentEvent` works out
 * from the dates.
 */
type CurrentEventState = {
  selectedEventId: string | null;
  selectEvent: (id: string | null) => void;
};

export const useCurrentEventStore = create<CurrentEventState>()(
  persist(
    (set) => ({
      selectedEventId: null,
      selectEvent: (selectedEventId) => set({ selectedEventId }),
    }),
    {
      name: 'yieldd-current-event',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    }
  )
);
