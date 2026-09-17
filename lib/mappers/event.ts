import type { Tables } from '../db';
import { paiseToRupees, rupeesToPaise } from '../db';
import { eventDayPosition, formatShortDateRange } from '../dates';
import {
  COST_KEYS,
  EMPTY_COSTS,
  type CostKey,
  type Event,
  type EventCosts,
  type EventStatus,
} from '../../types/event';

type EventRow = Tables<'events'>;

/**
 * The seven cost lines, from the label the wizard shows to the column that
 * holds it. Named once here so a renamed column is a one-line change and a
 * missed one is a type error.
 */
export const COST_COLUMNS: Record<CostKey, keyof EventRow & `cost_${string}`> = {
  Stall: 'cost_stall_paisa',
  Fabrication: 'cost_fabrication_paisa',
  Furniture: 'cost_furniture_paisa',
  Travel: 'cost_travel_paisa',
  Staff: 'cost_staff_paisa',
  Accommodation: 'cost_accommodation_paisa',
  Marketing: 'cost_marketing_paisa',
};

/**
 * What the event is today.
 *
 * Nothing on the server moves an event from `upcoming` to `live` when its start
 * date arrives — there is no scheduled job, and adding one is Phase 5 work. So
 * the column drifts out of date the moment a show opens, and a rep would see
 * "Upcoming" on the morning of day one.
 *
 * `closed` is taken at its word in both directions: an admin who closes an
 * event early means it, and the dates should not reopen it.
 */
export function deriveStatus(row: {
  status: EventStatus;
  start_date: string;
  end_date: string;
}): EventStatus {
  if (row.status === 'closed') return 'closed';

  const position = eventDayPosition(row.start_date, row.end_date);
  if (!position) return row.status;

  if (position.isCurrent) return 'live';
  if (position.hasEnded) return 'closed';
  return 'upcoming';
}

/**
 * Paise columns → rupees, keeping "nobody filled this in" as null.
 *
 * The `?? 0` this used to carry was where the distinction died for the whole
 * app: the columns are null-permissive by design, and coalescing on the way out
 * meant no screen could ever tell a free line from an unfilled one.
 */
function costsFromRow(row: EventRow): EventCosts {
  const costs = { ...EMPTY_COSTS };
  for (const key of COST_KEYS) {
    const paise = row[COST_COLUMNS[key]];
    costs[key] = paise == null ? null : paiseToRupees(paise);
  }
  return costs;
}

/**
 * Rupees → the seven paise columns, for an insert or update.
 *
 * The null branch is explicit rather than left to `rupeesToPaise`, which is
 * `Math.round(rupees * 100)` — and `Math.round(null * 100)` is 0, not null. So
 * dropping the old `|| 0` alone would have kept writing zeros, silently and
 * without a type error.
 */
export function costsToColumns(costs: EventCosts): Partial<EventRow> {
  const columns: Record<string, number | null> = {};
  for (const key of COST_KEYS) {
    const rupees = costs[key];
    columns[COST_COLUMNS[key]] = rupees == null ? null : rupeesToPaise(rupees);
  }
  return columns as Partial<EventRow>;
}

export function toEvent(row: EventRow, leads?: number): Event {
  const status = deriveStatus(row);
  const position = eventDayPosition(row.start_date, row.end_date);

  // Derived here rather than asked of the server: `event_stats` returns no
  // priced flag at all, and `total_cost_paisa` is generated with coalesce so it
  // reads 0 for an uncosted event. Both reads already select `*`, so the seven
  // columns are in hand and this costs nothing.
  const costs = costsFromRow(row);
  const blankCostKeys = COST_KEYS.filter((key) => costs[key] == null);

  const dates = formatShortDateRange(row.start_date, row.end_date);
  const sub = [row.city, dates].filter(Boolean).join(' · ');

  return {
    id: row.id,
    organizationId: row.organization_id,
    createdBy: row.created_by,
    name: row.name,
    city: row.city,
    stallNumber: row.stall_number,
    startDate: row.start_date,
    endDate: row.end_date,
    timezone: row.timezone,
    status,
    storedStatus: row.status,
    costs,
    totalCost: paiseToRupees(row.total_cost_paisa ?? 0),
    blankCostKeys,
    isPriced: blankCostKeys.length < COST_KEYS.length,
    leaderboardVisibleToReps: row.leaderboard_visible_to_reps,
    whatsappTemplateId: row.whatsapp_template_id,
    emailTemplateId: row.email_template_id,
    createdAt: row.created_at,

    sub,
    dayLabel:
      status === 'live' && position?.isCurrent
        ? `Live · Day ${position.dayNumber}`
        : undefined,
    leads,
  };
}
