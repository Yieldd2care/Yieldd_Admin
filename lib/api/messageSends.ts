import { supabase } from '../supabase';
import type { Enums } from '../db';

export type MessageChannel = Enums<'message_channel'>;

/**
 * What was sent, to whom, and when.
 *
 * A careful distinction runs through this file: the app opens WhatsApp or the
 * mail app with a draft ready — it cannot know whether the rep then pressed
 * send. So a row here means "the rep was handed this message for this lead",
 * and `skipped` means they passed on it. Nothing in this app may claim a
 * message was delivered, because nothing in this app can know that.
 */

export async function startBatch(input: {
  organizationId: string;
  eventId: string | null;
  createdBy: string;
  channel: MessageChannel;
  totalCount: number;
}): Promise<string | null> {
  const { data, error } = await supabase
    .from('message_batches')
    .insert({
      organization_id: input.organizationId,
      event_id: input.eventId,
      created_by: input.createdBy,
      channel: input.channel,
      total_count: input.totalCount,
    })
    .select('id')
    .single();

  if (error) {
    // A lost batch id costs the "3 of 8" counter, not the sending itself.
    if (__DEV__) console.warn('[messageSends] startBatch', error);
    return null;
  }
  return data.id;
}

export async function completeBatch(batchId: string | null): Promise<void> {
  if (!batchId) return;
  await supabase
    .from('message_batches')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', batchId);
}

export async function recordSend(input: {
  leadId: string;
  sentBy: string;
  channel: MessageChannel;
  /** The template's name, kept as a label even if the template is later deleted. */
  templateUsed?: string | null;
  templateId?: string | null;
  batchId?: string | null;
  status: Enums<'message_status'>;
}): Promise<void> {
  const { error } = await supabase.from('message_sends').insert({
    lead_id: input.leadId,
    sent_by: input.sentBy,
    channel: input.channel,
    template_used: input.templateUsed ?? null,
    template_id: input.templateId ?? null,
    batch_id: input.batchId ?? null,
    status: input.status,
  });

  // Losing the record must never block the rep from moving to the next lead.
  if (error && __DEV__) console.warn('[messageSends] recordSend', error);
}

/**
 * How many messages have gone out to one lead, per channel.
 *
 * Feeds the counts on the dashboard's quick-action buttons — "WhatsApp 2"
 * beside the button that sends the next one. `skipped` rows are left out
 * deliberately: the rep was offered that message and declined it, so counting
 * it would say they made contact when they chose not to.
 */
export async function fetchSendCounts(leadId: string): Promise<Record<MessageChannel, number>> {
  const empty: Record<MessageChannel, number> = { whatsapp: 0, email: 0 };

  const { data, error } = await supabase
    .from('message_sends')
    .select('channel')
    .eq('lead_id', leadId)
    .eq('status', 'sent');

  if (error) {
    if (__DEV__) console.warn('[messageSends] fetchSendCounts', error);
    return empty;
  }

  return (data as { channel: MessageChannel }[]).reduce((counts, row) => {
    counts[row.channel] = (counts[row.channel] ?? 0) + 1;
    return counts;
  }, empty);
}

/** Lead ids this person has already been sent something on, for the given channel. */
export async function fetchSentLeadIds(channel?: MessageChannel): Promise<Set<string>> {
  let query = supabase.from('message_sends').select('lead_id').eq('status', 'sent');
  if (channel) query = query.eq('channel', channel);

  const { data, error } = await query;
  if (error) return new Set();
  return new Set((data as { lead_id: string }[]).map((row) => row.lead_id));
}
