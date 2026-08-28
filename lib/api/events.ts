import type { PostgrestError } from '@supabase/supabase-js';

import { supabase } from '../supabase';
import type { Tables, Updates } from '../db';
import { toDateOnly } from '../dates';
import { costsToColumns, toEvent } from '../mappers/event';
import type { Event, EventCosts, EventStatus } from '../../types/event';

type EventRow = Tables<'events'>;

/**
 * `leads(count)` is a PostgREST aggregate embed: it returns `[{ count: n }]`
 * rather than the rows, so the list can show "413 leads" without pulling 413
 * leads down a hall wifi connection.
 */
const SELECT_WITH_COUNTS = '*, leads(count)';

type RowWithCounts = EventRow & { leads?: { count: number }[] | null };

function rowToEvent(row: RowWithCounts): Event {
  return toEvent(row, row.leads?.[0]?.count ?? 0);
}

// ---------------------------------------------------------------------------
// Errors
//
// A row-level-security refusal arrives as a bare 42501 with the same wording
// whatever the reason, so the *why* has to be reconstructed from what we know
// about the caller. Getting this wrong is worse than saying nothing: telling an
// admin on a Free plan that they lack permission sends them to support instead
// of to the upgrade screen.
// ---------------------------------------------------------------------------

const RLS_VIOLATION = '42501';

export function describeEventWriteError(
  error: PostgrestError,
  context: { isAdmin: boolean; isPro: boolean; hasActiveEvent: boolean }
): string {
  if (error.code === RLS_VIOLATION) {
    if (!context.isAdmin) return 'Only an admin can create or change events.';
    if (!context.isPro && context.hasActiveEvent) {
      return 'Your free plan covers one active event. Close the current one or upgrade to run more than one at a time.';
    }
    return "You don't have permission to change this event.";
  }
  if (error.code === '23514') return 'One of those values is out of range — check the dates and costs.';
  if (__DEV__) console.warn('[events]', error);
  return "That didn't save. Check your connection and try again.";
}

/** Thrown by the write helpers so react-query's `error.message` is displayable. */
export class EventWriteError extends Error {
  constructor(message: string, readonly cause: PostgrestError) {
    super(message);
    this.name = 'EventWriteError';
  }
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function fetchEvents(): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select(SELECT_WITH_COUNTS)
    .order('start_date', { ascending: false });

  if (error) throw error;
  return (data as RowWithCounts[]).map(rowToEvent);
}

export async function fetchEvent(id: string): Promise<Event | null> {
  const { data, error } = await supabase
    .from('events')
    .select(SELECT_WITH_COUNTS)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data ? rowToEvent(data as RowWithCounts) : null;
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export type CreateEventInput = {
  organizationId: string;
  createdBy: string;
  name: string;
  city: string;
  startDate: Date | string;
  endDate: Date | string;
  timezone?: string;
  stallNumber?: string | null;
};

export type EventWriteContext = { isAdmin: boolean; isPro: boolean; hasActiveEvent: boolean };

export async function createEvent(
  input: CreateEventInput,
  context: EventWriteContext
): Promise<Event> {
  const start = toDateOnly(input.startDate);
  const end = toDateOnly(input.endDate);
  if (!start || !end) throw new Error('An event needs a start and an end date.');

  const { data, error } = await supabase
    .from('events')
    .insert({
      organization_id: input.organizationId,
      created_by: input.createdBy,
      name: input.name.trim(),
      city: input.city.trim() || null,
      start_date: start,
      end_date: end,
      // Free text on purpose: a CHECK against pg_timezone_names is impossible
      // (not immutable), so the app is what keeps this to a real zone.
      timezone: input.timezone ?? 'Asia/Kolkata',
      stall_number: input.stallNumber ?? null,
    })
    .select(SELECT_WITH_COUNTS)
    .single();

  if (error) throw new EventWriteError(describeEventWriteError(error, context), error);
  return rowToEvent(data as RowWithCounts);
}

export type UpdateEventInput = {
  name?: string;
  city?: string | null;
  startDate?: Date | string;
  endDate?: Date | string;
  stallNumber?: string | null;
  status?: EventStatus;
  costs?: EventCosts;
  leaderboardVisibleToReps?: boolean;
  whatsappTemplateId?: string | null;
  emailTemplateId?: string | null;
};

export async function updateEvent(
  id: string,
  input: UpdateEventInput,
  context: EventWriteContext
): Promise<Event> {
  const patch: Updates<'events'> = {};

  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.city !== undefined) patch.city = input.city?.trim() || null;
  // A date that will not parse is dropped rather than written as null — the
  // column is NOT NULL, so null would be a 23502 instead of a no-op.
  if (input.startDate !== undefined) patch.start_date = toDateOnly(input.startDate) ?? undefined;
  if (input.endDate !== undefined) patch.end_date = toDateOnly(input.endDate) ?? undefined;
  if (input.stallNumber !== undefined) patch.stall_number = input.stallNumber || null;
  if (input.status !== undefined) patch.status = input.status;
  if (input.leaderboardVisibleToReps !== undefined) {
    patch.leaderboard_visible_to_reps = input.leaderboardVisibleToReps;
  }
  if (input.whatsappTemplateId !== undefined) patch.whatsapp_template_id = input.whatsappTemplateId;
  if (input.emailTemplateId !== undefined) patch.email_template_id = input.emailTemplateId;
  if (input.costs) Object.assign(patch, costsToColumns(input.costs));

  const { data, error } = await supabase
    .from('events')
    .update(patch)
    .eq('id', id)
    .select(SELECT_WITH_COUNTS)
    .single();

  if (error) throw new EventWriteError(describeEventWriteError(error, context), error);
  return rowToEvent(data as RowWithCounts);
}

/**
 * Writes back the status the dates already imply.
 *
 * Nothing on the server does this, and it is not cosmetic: `active_event_count()`
 * — the Free plan's one-event gate — counts the *column*, not the calendar. An
 * event that finished in February would keep a Free organisation locked out of
 * creating a new one forever.
 *
 * Admin-only, because `events_admin_update` is. A rep still sees the right
 * status (the mapper derives it); the column catches up next time an admin
 * opens the app, which is also the only person the count affects.
 */
export async function reconcileEventStatuses(events: Event[]): Promise<number> {
  const stale = events.filter((e) => e.status !== e.storedStatus);
  if (!stale.length) return 0;

  let updated = 0;
  for (const event of stale) {
    const { error } = await supabase
      .from('events')
      .update({ status: event.status })
      .eq('id', event.id);
    if (error) {
      // A rep hits this every time; it is expected, not a fault.
      if (__DEV__ && error.code !== RLS_VIOLATION) console.warn('[events] reconcile', error);
      break;
    }
    updated += 1;
  }
  return updated;
}
