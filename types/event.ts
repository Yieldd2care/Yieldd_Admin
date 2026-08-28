/**
 * The shape screens use for an event.
 *
 * Deliberately not the database row: money is in rupees here and paise there,
 * dates are calendar strings rather than Date objects, and `status` is what
 * the event *is right now* rather than what was last written down — see
 * `lib/mappers/event.ts` for why those differ.
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

export type EventCosts = Record<CostKey, number>;

/** Same three words the database uses, so no case translation is needed here. */
export type EventStatus = 'upcoming' | 'live' | 'closed';

export type Event = {
  id: string;
  organizationId: string;
  createdBy: string;
  name: string;
  city: string | null;
  stallNumber: string | null;
  /** `'2026-02-18'` — a calendar day, not an instant. */
  startDate: string;
  endDate: string;
  timezone: string;
  /**
   * What the event is today, which is not always what the `status` column says
   * — nothing on the server moves an event from upcoming to live when its start
   * date arrives. See `deriveStatus` in the mapper.
   */
  status: EventStatus;
  /** What the column actually holds, for the code that reconciles the two. */
  storedStatus: EventStatus;
  /** Rupees, keyed the way the cost screen labels them. */
  costs: EventCosts;
  /** Rupees. The generated column, converted once. */
  totalCost: number;
  leaderboardVisibleToReps: boolean;
  whatsappTemplateId: string | null;
  emailTemplateId: string | null;
  createdAt: string;

  // --- derived for the list and header UI ---
  /** `Bengaluru · 18–22 Feb` */
  sub: string;
  /** `Live · Day 3` while it is running, otherwise undefined. */
  dayLabel?: string;
  /** Number of leads captured, when the query asked for it. */
  leads?: number;
};

export const EMPTY_COSTS: EventCosts = {
  Stall: 0,
  Fabrication: 0,
  Furniture: 0,
  Travel: 0,
  Staff: 0,
  Accommodation: 0,
  Marketing: 0,
};

/** Total across all seven cost lines, in rupees. */
export function totalOfCosts(costs: EventCosts): number {
  return COST_KEYS.reduce((sum, key) => sum + (costs[key] || 0), 0);
}
