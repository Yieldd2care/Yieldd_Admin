import { supabase } from '../supabase';
import type { Enums, Inserts } from '../db';

export type LeadOutcome = Enums<'lead_outcome'>; // connected | no_answer | not_interested | meeting_set

/**
 * The screens say `No answer`, the column says `no_answer`.
 *
 * The outcome has its own typed column rather than living in
 * `lead_activity.metadata` — untyped JSON cannot be filtered or counted, and
 * "what happened last time I called" is exactly the thing the follow-up list
 * needs to sort by.
 */
export const OUTCOME_LABELS: Record<LeadOutcome, string> = {
  connected: 'Connected',
  no_answer: 'No answer',
  not_interested: 'Not interested',
  meeting_set: 'Meeting set',
};

export const OUTCOME_FROM_LABEL: Record<string, LeadOutcome> = {
  Connected: 'connected',
  'No answer': 'no_answer',
  'Not interested': 'not_interested',
  'Meeting set': 'meeting_set',
};

export type ActivityInput = {
  leadId: string;
  actorId: string;
  type: Enums<'activity_type'>;
  outcome?: LeadOutcome;
  metadata?: Record<string, unknown>;
};

/**
 * Records something that happened to a lead.
 *
 * Deliberately fire-and-forget from the caller's point of view: the lead's own
 * fields are the source of truth for what the app shows, and losing a history
 * entry to a dropped connection must never stop the rep logging the call.
 */
export async function logLeadActivity(input: ActivityInput): Promise<{ ok: boolean }> {
  const row: Inserts<'lead_activity'> = {
    lead_id: input.leadId,
    actor_id: input.actorId,
    activity_type: input.type,
    outcome: input.outcome ?? null,
    metadata: (input.metadata ?? {}) as Inserts<'lead_activity'>['metadata'],
  };

  const { error } = await supabase.from('lead_activity').insert(row);
  if (error) {
    if (__DEV__) console.warn('[leadActivity]', error);
    return { ok: false };
  }
  return { ok: true };
}
