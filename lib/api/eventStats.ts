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

  return (data as { profile_id: string; full_name: string; lead_count: number; deals_won: number }[]).map(
    (row) => ({
      profileId: row.profile_id,
      name: row.full_name,
      leadCount: Number(row.lead_count),
      dealsWon: Number(row.deals_won),
    })
  );
}
