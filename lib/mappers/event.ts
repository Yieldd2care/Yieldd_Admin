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

function costsFromRow(row: EventRow): EventCosts {
  const costs = { ...EMPTY_COSTS };
  for (const key of COST_KEYS) {
    costs[key] = paiseToRupees(row[COST_COLUMNS[key]] ?? 0);
  }
  return costs;
}

/** Rupees → the seven paise columns, for an insert or update. */
export function costsToColumns(costs: EventCosts): Partial<EventRow> {
  const columns: Record<string, number> = {};
  for (const key of COST_KEYS) {
    columns[COST_COLUMNS[key]] = rupeesToPaise(costs[key] || 0);
  }
  return columns as Partial<EventRow>;
}

export function toEvent(row: EventRow, leads?: number): Event {
  const status = deriveStatus(row);
  const position = eventDayPosition(row.start_date, row.end_date);

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
    costs: costsFromRow(row),
    totalCost: paiseToRupees(row.total_cost_paisa ?? 0),
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
