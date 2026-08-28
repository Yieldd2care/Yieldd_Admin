import type { PostgrestError } from '@supabase/supabase-js';

import { supabase } from '../supabase';
import type { Enums, Tables } from '../db';

type TemplateRow = Tables<'message_templates'>;
export type MessageChannel = Enums<'message_channel'>; // 'whatsapp' | 'email'

export type MessageTemplate = {
  id: string;
  channel: MessageChannel;
  name: string;
  subject: string | null;
  body: string;
  isDefault: boolean;
  attachment: { path: string; name: string; sizeBytes: number | null; mimeType: string | null } | null;
};

function toTemplate(row: TemplateRow): MessageTemplate {
  return {
    id: row.id,
    channel: row.channel,
    name: row.name,
    subject: row.subject,
    body: row.body,
    isDefault: row.is_default,
    attachment: row.attachment_path
      ? {
          path: row.attachment_path,
          name: row.attachment_name ?? 'Attachment',
          sizeBytes: row.attachment_size_bytes,
          mimeType: row.attachment_mime_type,
        }
      : null,
  };
}

export function describeTemplateError(error: PostgrestError): string {
  if (error.code === '42501') return 'Only an admin can change message templates.';
  if (error.code === '23505') return 'There is already a default template for that channel.';
  if (error.code === '23514') return 'Check the template — a name is required, and only email templates can have a subject.';
  if (__DEV__) console.warn('[messageTemplates]', error);
  return "That template didn't save. Check your connection and try again.";
}

export async function fetchTemplates(channel?: MessageChannel): Promise<MessageTemplate[]> {
  let query = supabase.from('message_templates').select('*').order('created_at', { ascending: true });
  if (channel) query = query.eq('channel', channel);

  const { data, error } = await query;
  if (error) throw error;
  return (data as TemplateRow[]).map(toTemplate);
}

export type TemplateInput = {
  channel: MessageChannel;
  name: string;
  /** Ignored for WhatsApp — the column has a CHECK that forbids it. */
  subject?: string | null;
  body: string;
  isDefault?: boolean;
};

export async function createTemplate(
  input: TemplateInput & { organizationId: string; createdBy: string }
): Promise<MessageTemplate> {
  const { data, error } = await supabase
    .from('message_templates')
    .insert({
      organization_id: input.organizationId,
      created_by: input.createdBy,
      channel: input.channel,
      name: input.name.trim().slice(0, 80),
      subject: input.channel === 'email' ? (input.subject?.trim() || null) : null,
      body: input.body,
      is_default: input.isDefault ?? false,
    })
    .select()
    .single();

  if (error) throw new Error(describeTemplateError(error));
  return toTemplate(data as TemplateRow);
}

export async function updateTemplate(
  id: string,
  patch: Partial<Pick<TemplateInput, 'name' | 'subject' | 'body'>>
): Promise<MessageTemplate> {
  const { data, error } = await supabase
    .from('message_templates')
    .update({
      ...(patch.name !== undefined ? { name: patch.name.trim().slice(0, 80) } : {}),
      ...(patch.subject !== undefined ? { subject: patch.subject?.trim() || null } : {}),
      ...(patch.body !== undefined ? { body: patch.body } : {}),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(describeTemplateError(error));
  return toTemplate(data as TemplateRow);
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase.from('message_templates').delete().eq('id', id);
  if (error) throw new Error(describeTemplateError(error));
}

/**
 * Makes one template the default for its channel.
 *
 * Goes through the RPC rather than two updates: a partial unique index enforces
 * one default per channel and cannot be deferred, so clearing and setting in a
 * single statement can raise 23505 depending on row order. The function also
 * refuses a rep outright — as a plain update, RLS would match zero rows and
 * report success having changed nothing.
 */
export async function setDefaultTemplate(id: string): Promise<void> {
  const { error } = await supabase.rpc('set_default_message_template', { p_template_id: id });
  if (error) throw new Error(error.message || 'That template could not be made the default.');
}

/**
 * The template an event should point at for a channel, creating one only when
 * the wording is genuinely new.
 *
 * The wizard shows a default message every time. Without this check, five
 * events would leave five byte-identical templates in the organisation's list
 * for the admin to wade through later.
 */
export async function ensureTemplate(input: {
  organizationId: string;
  createdBy: string;
  channel: MessageChannel;
  name: string;
  subject?: string | null;
  body: string;
}): Promise<MessageTemplate> {
  const existing = await fetchTemplates(input.channel);
  const subject = input.channel === 'email' ? (input.subject?.trim() || null) : null;

  const match = existing.find((t) => t.body === input.body && t.subject === subject);
  if (match) return match;

  return createTemplate({
    ...input,
    subject,
    // The organisation's first template for a channel becomes its default —
    // otherwise the bulk-send screen opens with nothing selected.
    isDefault: existing.length === 0,
  });
}
