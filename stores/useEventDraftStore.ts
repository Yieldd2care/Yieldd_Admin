import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
 */

export const COST_KEYS = [
  'Stall',
  'Fabrication',
  'Furniture',
  'Travel',
  'Staff',
  'Accommodation',
  'Marketing',
] as const;

export type CostKey = (typeof COST_KEYS)[number];

export type DraftRep = { id: string; name: string; phone: string };

export type EventDraft = {
  name: string;
  city: string;
  /** ISO strings, not Date objects — persist serialises through JSON. */
  startDate: string | null;
  endDate: string | null;
  /** Rupees as typed, not paise. Converted at the database boundary. */
  costs: Record<CostKey, number>;
  /** Only the reps who were actually complete enough to invite. */
  invitedReps: DraftRep[];
  whatsappTemplate: string;
  emailSubject: string;
  emailBody: string;
};

type EventDraftState = EventDraft & {
  setDetails: (input: {
    name: string;
    city: string;
    startDate: Date | null;
    endDate: Date | null;
  }) => void;
  setCosts: (costs: Record<CostKey, number>) => void;
  setInvitedReps: (reps: DraftRep[]) => void;
  setTemplates: (input: { whatsappTemplate: string; emailSubject: string; emailBody: string }) => void;
  reset: () => void;
};

const EMPTY_COSTS: Record<CostKey, number> = {
  Stall: 0,
  Fabrication: 0,
  Furniture: 0,
  Travel: 0,
  Staff: 0,
  Accommodation: 0,
  Marketing: 0,
};

const EMPTY: EventDraft = {
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
      version: 1,
    }
  )
);

/** Total across all seven cost lines, in rupees. */
export function draftTotalCost(costs: Record<CostKey, number>): number {
  return COST_KEYS.reduce((sum, key) => sum + (costs[key] || 0), 0);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * `18–22 Feb 2026`, collapsing the month and year when they repeat, which is
 * the overwhelmingly common case for a trade show.
 */
export function formatDateRange(startISO: string | null, endISO: string | null): string {
  if (!startISO) return '';
  const start = new Date(startISO);
  if (!endISO) return `${start.getDate()} ${MONTHS[start.getMonth()]} ${start.getFullYear()}`;

  const end = new Date(endISO);
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();

  if (sameMonth) {
    return `${start.getDate()}–${end.getDate()} ${MONTHS[end.getMonth()]} ${end.getFullYear()}`;
  }
  if (sameYear) {
    return `${start.getDate()} ${MONTHS[start.getMonth()]} – ${end.getDate()} ${MONTHS[end.getMonth()]} ${end.getFullYear()}`;
  }
  return `${start.getDate()} ${MONTHS[start.getMonth()]} ${start.getFullYear()} – ${end.getDate()} ${MONTHS[end.getMonth()]} ${end.getFullYear()}`;
}
