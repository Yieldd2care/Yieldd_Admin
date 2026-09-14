import { supabase } from '../supabase';
import {
  conversionPercent,
  costPerLeadPaise,
  costPerWonPaise,
  pipelineFromCounts,
  roiPercent,
  type PipelineRow,
} from '../roi';

/**
 * Event totals, aggregated on the server.
 *
 * Counted there, not here, because `leads_select_own_or_admin` hides other
 * reps' leads: a rep counting rows on the device would get a fraction of the
 * total, and then cost-per-lead would divide the FULL event cost by that
 * fraction and print a number several times too large.
 *
 * The money fields come back null for a rep — the database decides that, not
 * this file, so a caller cannot leak them by forgetting a check.
 */
export type EventStats = {
  totalLeads: number;
  leadsToday: number;
  dealsWon: number;
  withVoiceNote: number;
  needsNote: number;
  consentGiven: number;
  pipeline: PipelineRow[];

  /** Whether this viewer is allowed the money figures at all. */
  canSeeMoney: boolean;
  wonValuePaise: number | null;
  /** Qualified plus won: the pipeline this event produced, open and closed. */
  expectedValuePaise: number | null;
  spendPaise: number | null;
  roiPercent: number | null;
  costPerLeadPaise: number | null;
  costPerWonPaise: number | null;
  /** Deals won as a share of every lead captured. */
  conversionPercent: number | null;
};

type StatsRow = {
  total_leads: number;
  leads_today: number;
  deals_won: number;
  count_new: number;
  count_contacted: number;
  count_qualified: number;
  count_won: number;
  count_lost: number;
  with_voice_note: number;
  needs_note: number;
  consent_given: number;
  won_value_paisa: number | null;
  expected_value_paisa: number | null;
  spend_paisa: number | null;
};

export async function fetchEventStats(eventId: string): Promise<EventStats> {
  const { data, error } = await supabase.rpc('event_stats', { p_event_id: eventId });
  if (error) throw error;

  const row = (data as StatsRow[])?.[0];
  if (!row) throw new Error('Event not found');

  const spend = row.spend_paisa;
  const won = row.won_value_paisa;
  const canSeeMoney = spend != null;

  return {
    totalLeads: Number(row.total_leads),
    leadsToday: Number(row.leads_today),
    dealsWon: Number(row.deals_won),
    withVoiceNote: Number(row.with_voice_note),
    needsNote: Number(row.needs_note),
    consentGiven: Number(row.consent_given),
    pipeline: pipelineFromCounts([
      Number(row.count_new),
      Number(row.count_contacted),
      Number(row.count_qualified),
      Number(row.count_won),
      Number(row.count_lost),
    ]),

    canSeeMoney,
    wonValuePaise: won,
    expectedValuePaise: row.expected_value_paisa,
    spendPaise: spend,
    // Every one of these is null when an input is missing rather than 0 —
    // "we spent nothing" and "nobody recorded what we spent" are different
    // statements, and only one of them belongs on a report.
    roiPercent: canSeeMoney ? roiPercent(won ?? 0, spend ?? 0) : null,
    costPerLeadPaise: canSeeMoney ? costPerLeadPaise(spend ?? 0, Number(row.total_leads)) : null,
    costPerWonPaise: canSeeMoney ? costPerWonPaise(spend ?? 0, Number(row.deals_won)) : null,
    conversionPercent: conversionPercent(Number(row.deals_won), Number(row.total_leads)),
  };
}

/**
 * The same totals, across a SET of events.
 *
 * Aggregated on the server for the reason above, which only gets worse here: a
 * rep summing N events on the device gets N fractions added together, and a
 * blended ROI built on that is wrong by a factor nobody can see.
 *
 * Two figures the single-event version has are deliberately absent:
 *
 * - **Cost per lead.** A blended figure spanning an ₹80,000 show and a
 *   ₹4,75,000 one is not a number anyone can act on, and putting it on Home
 *   invites exactly that comparison. It is left off the type, not just off the
 *   screen, so it cannot be rendered later by accident.
 * - **Cost per won**, for the same reason.
 */
export type EventSetStats = {
  /** How many events these totals cover. */
  eventsCounted: number;
  totalLeads: number;
  /** Each event's own local day, added together — see `event_set_stats`. */
  leadsToday: number;
  dealsWon: number;
  withVoiceNote: number;
  needsNote: number;
  consentGiven: number;
  pipeline: PipelineRow[];

  /** Whether this viewer is allowed the money figures at all. */
  canSeeMoney: boolean;
  wonValuePaise: number | null;
  /** Qualified plus won, across the set. */
  expectedValuePaise: number | null;
  spendPaise: number | null;
  /**
   * How many of the selected events have a cost recorded at all.
   *
   * Not the same as "spend > 0". `events.total_cost_paisa` is generated with
   * `coalesce(component, 0)`, so an event nobody costed reports ₹0 rather than
   * unknown — and its won deals would otherwise inflate ROI while contributing
   * nothing to spend. The screen shows this beside the ROI figure so the reader
   * knows how much of the selection it actually covers.
   */
  pricedEvents: number | null;
  /**
   * Return across the events that have a cost recorded, computed once over the
   * whole set — never an average of per-event ROIs.
   */
  roiPercent: number | null;
  conversionPercent: number | null;
};

type SetStatsRow = {
  events_counted: number;
  total_leads: number;
  leads_today: number;
  deals_won: number;
  count_new: number;
  count_contacted: number;
  count_qualified: number;
  count_won: number;
  count_lost: number;
  with_voice_note: number;
  needs_note: number;
  consent_given: number;
  won_value_paisa: number | null;
  expected_value_paisa: number | null;
  spend_paisa: number | null;
  priced_events: number | null;
  priced_won_value_paisa: number | null;
};

/**
 * Throws when the caller is not on every event in the set — the database
 * refuses the whole call rather than quietly narrowing it, so a rep can never
 * read a total whose scope is narrower than the one they picked.
 *
 * Callers must pass ids that still exist and are still theirs; resolve the
 * selection against the event list first.
 */
export async function fetchEventSetStats(eventIds: string[]): Promise<EventSetStats> {
  const { data, error } = await supabase.rpc('event_set_stats', { p_event_ids: eventIds });
  if (error) throw error;

  const row = (data as SetStatsRow[])?.[0];
  if (!row) throw new Error('Events not found');

  const spend = row.spend_paisa == null ? null : Number(row.spend_paisa);
  const won = row.won_value_paisa == null ? null : Number(row.won_value_paisa);
  const pricedWon =
    row.priced_won_value_paisa == null ? null : Number(row.priced_won_value_paisa);
  const canSeeMoney = spend != null;

  return {
    eventsCounted: Number(row.events_counted),
    totalLeads: Number(row.total_leads),
    leadsToday: Number(row.leads_today),
    dealsWon: Number(row.deals_won),
    withVoiceNote: Number(row.with_voice_note),
    needsNote: Number(row.needs_note),
    consentGiven: Number(row.consent_given),
    pipeline: pipelineFromCounts([
      Number(row.count_new),
      Number(row.count_contacted),
      Number(row.count_qualified),
      Number(row.count_won),
      Number(row.count_lost),
    ]),

    canSeeMoney,
    wonValuePaise: won,
    expectedValuePaise: row.expected_value_paisa == null ? null : Number(row.expected_value_paisa),
    spendPaise: spend,
    pricedEvents: row.priced_events == null ? null : Number(row.priced_events),
    // Won value from priced events over spend, which is the same number whether
    // summed over the priced events or all of them — an unpriced event
    // contributes 0. `roiPercent` returns null at zero spend, so a selection
    // where nothing was ever costed shows "—" rather than a fabricated figure.
    roiPercent: canSeeMoney ? roiPercent(pricedWon ?? 0, spend ?? 0) : null,
    conversionPercent: conversionPercent(Number(row.deals_won), Number(row.total_leads)),
  };
}

export type HourlyCapture = { hour: number; count: number };

export async function fetchHourlyCapture(eventId: string, day?: string): Promise<HourlyCapture[]> {
  const { data, error } = await supabase.rpc('event_hourly_capture', {
    p_event_id: eventId,
    p_day: day ?? undefined,
  });
  if (error) throw error;

  return (data as { hour_of_day: number; lead_count: number }[]).map((row) => ({
    hour: Number(row.hour_of_day),
    count: Number(row.lead_count),
  }));
}

export type LeaderboardRow = {
  profileId: string;
  name: string;
  leadCount: number;
  dealsWon: number;
  /**
   * Qualified plus won, in paise. Null for a rep even when the leaderboard is
   * shared with them: "the team may see who captured how many" is the switch an
   * admin turns on, and what the deals are worth is not part of it. The
   * database decides that, not this file.
   */
  expectedValuePaise: number | null;
};

/**
 * Who captured what.
 *
 * Throws when the event has the leaderboard switched off and the viewer is not
 * an admin — the database enforces that, so the screen only has to render the
 * refusal rather than decide it.
 */
export async function fetchLeaderboard(eventId: string): Promise<LeaderboardRow[]> {
  const { data, error } = await supabase.rpc('event_leaderboard', { p_event_id: eventId });
  if (error) throw error;

  return (
    data as {
      profile_id: string;
      full_name: string;
      lead_count: number;
      deals_won: number;
      expected_value_paisa: number | null;
    }[]
  ).map((row) => ({
    profileId: row.profile_id,
    name: row.full_name,
    leadCount: Number(row.lead_count),
    dealsWon: Number(row.deals_won),
    expectedValuePaise:
      row.expected_value_paisa == null ? null : Number(row.expected_value_paisa),
  }));
}
