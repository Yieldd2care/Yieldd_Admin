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

/**
 * Rupees per line, and `null` for a line nobody has filled in yet.
 *
 * The distinction is the whole point: an exhibitor who spent nothing on
 * marketing types 0, and an exhibitor who has not yet seen the invoice leaves
 * the box alone. Collapsing the two — which is what `|| 0` on the write path
 * used to do — makes "which costs are still missing?" an unanswerable question,
 * and makes an ROI computed against a partial cost look like a real return.
 */
export type EventCosts = Record<CostKey, number | null>;

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
  /** Rupees, keyed the way the cost screen labels them. `null` = not filled in. */
  costs: EventCosts;
  /**
   * Rupees. The generated column, converted once.
   *
   * ALWAYS A NUMBER, NEVER NULL — `total_cost_paisa` is generated as
   * `coalesce(cost_stall_paisa, 0) + …`, so an event nobody has costed totals 0
   * rather than unknown. Never test this to decide whether a cost was recorded;
   * that is what `isPriced` is for. A `formatPaise(totalCost * 100, { fallback })`
   * can never reach its fallback.
   */
  totalCost: number;
  /** The cost lines still waiting for a figure, in the order the form shows them. */
  blankCostKeys: CostKey[];
  /** Whether anyone has recorded any cost at all. */
  isPriced: boolean;
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

/**
 * Seven lines nobody has filled in — not seven lines that cost nothing.
 *
 * These were zeros until the write path learned the difference. Anything
 * spreading this is starting from "unknown", which is what a fresh draft and a
 * fresh form both genuinely are.
 */
export const EMPTY_COSTS: EventCosts = {
  Stall: null,
  Fabrication: null,
  Furniture: null,
  Travel: null,
  Staff: null,
  Accommodation: null,
  Marketing: null,
};

/** Total across all seven cost lines, in rupees. */
export function totalOfCosts(costs: EventCosts): number {
  return COST_KEYS.reduce((sum, key) => sum + (costs[key] || 0), 0);
}
