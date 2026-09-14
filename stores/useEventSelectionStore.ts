import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Which events the dashboard's across-events figures cover.
 *
 * Separate from `useCurrentEventStore`, and deliberately so. That one answers
 * "which show am I working in", which scopes the single-event panels and
 * persists for days while a rep works one stall. This answers "which shows am I
 * comparing", which is a reporting question asked from a desk. Collapsing them
 * would mean picking an event to work in also silently changed what the yearly
 * totals covered.
 *
 * Only ids are kept, never copies of the events — the rows come from the query
 * cache, so a renamed event is right everywhere at once. Its own storage key, so
 * the existing `yieldd-current-event` entry needs no version migration.
 *
 * `null` means "all of them", which is the default and what the picker falls
 * back to. An empty array is never stored: totals over no events are not zero,
 * they are a question nobody asked, and the database refuses that call outright.
 */
type EventSelectionState = {
  selectedEventIds: string[] | null;
  /** Pass null for "all events". An empty array is normalised to null. */
  selectEvents: (ids: string[] | null) => void;
};

export const useEventSelectionStore = create<EventSelectionState>()(
  persist(
    (set) => ({
      selectedEventIds: null,
      selectEvents: (ids) =>
        set({ selectedEventIds: ids && ids.length > 0 ? ids : null }),
    }),
    {
      name: 'yieldd-event-selection',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    }
  )
);
