import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { COST_KEYS, EMPTY_COSTS, totalOfCosts, type CostKey, type EventCosts } from '../types/event';
import { formatDateRange } from '../lib/dates';

/**
 * The create-event wizard's answers, gathered across its five screens.
 *
 * Each step used to keep its own local state, which meant the "You're set up"
 * screen at the end had nothing to render and showed a fixed IMTEX 2026
 * example instead (PENDING.md #3). This is the shared draft the last screen
 * reads back.
 *
 * Persisted for the same reason the capture draft is: the wizard is long, a
 * phone call mid-way through kills the process on Android, and losing four
 * screens of typing to that is not acceptable. Cleared once the event is
 * finished.
 *
 * Since step 1 now writes a real `events` row, the draft also holds that row's
 * id — so re-entering an abandoned wizard resumes the same event rather than
 * creating a second one and burning a Free plan's only slot.
 */

export { COST_KEYS, type CostKey };
export { formatDateRange };

export type DraftRep = { id: string; name: string; phone: string };

export type EventDraft = {
  /** The `events` row this draft is editing, once step 1 has been saved. */
  eventId: string | null;
  name: string;
  city: string;
  /** ISO strings, not Date objects — persist serialises through JSON. */
  startDate: string | null;
  endDate: string | null;
  /** Rupees as typed, not paise. Converted at the database boundary. */
  costs: EventCosts;
  /** Only the reps who were actually complete enough to invite. */
  invitedReps: DraftRep[];
  whatsappTemplate: string;
  emailSubject: string;
  emailBody: string;
};

type EventDraftState = EventDraft & {
  setEventId: (id: string | null) => void;
  setDetails: (input: {
    name: string;
    city: string;
    startDate: Date | null;
    endDate: Date | null;
  }) => void;
  setCosts: (costs: EventCosts) => void;
  setInvitedReps: (reps: DraftRep[]) => void;
  setTemplates: (input: { whatsappTemplate: string; emailSubject: string; emailBody: string }) => void;
  reset: () => void;
};

const EMPTY: EventDraft = {
  eventId: null,
  name: '',
  city: '',
  startDate: null,
  endDate: null,
  costs: EMPTY_COSTS,
  invitedReps: [],
  whatsappTemplate: '',
  emailSubject: '',
  emailBody: '',
};

export const useEventDraftStore = create<EventDraftState>()(
  persist(
    (set) => ({
      ...EMPTY,

      setEventId: (eventId) => set({ eventId }),

      setDetails: ({ name, city, startDate, endDate }) =>
        set({
          name: name.trim(),
          city: city.trim(),
          startDate: startDate ? startDate.toISOString() : null,
          endDate: endDate ? endDate.toISOString() : null,
        }),

      setCosts: (costs) => set({ costs }),
      setInvitedReps: (invitedReps) => set({ invitedReps }),
      setTemplates: ({ whatsappTemplate, emailSubject, emailBody }) =>
        set({ whatsappTemplate, emailSubject, emailBody }),

      reset: () => set({ ...EMPTY, costs: { ...EMPTY_COSTS } }),
    }),
    {
      name: 'yieldd-event-draft',
      storage: createJSONStorage(() => AsyncStorage),
      // v2 adds eventId. A v1 draft has no row behind it, so it starts over
      // rather than being adopted by whatever event is created next.
      version: 2,
      migrate: () => ({ ...EMPTY, costs: { ...EMPTY_COSTS } }),
    }
  )
);

/** Total across all seven cost lines, in rupees. */
export function draftTotalCost(costs: EventCosts): number {
  return totalOfCosts(costs);
}
