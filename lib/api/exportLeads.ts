import { supabase } from '../supabase';
import { toCsv } from '../csv';
import { paiseToRupees } from '../db';
import { statusFromDb, type LeadRow } from '../mappers/lead';

/**
 * Building the export file.
 *
 * The rows come from the server rather than the on-device cache, because an
 * export is the one thing a customer will treat as complete. The cache holds
 * what has been looked at; this asks for everything the person is allowed to
 * see. Row-level security still applies, so a rep exports their own leads and
 * an admin exports the organisation's — which is the correct behaviour, not a
 * limitation to work around.
 */

export type ExportScope =
  | { kind: 'event'; eventId: string }
  | { kind: 'won'; eventId?: string }
  | { kind: 'range'; from: string; to: string; eventId?: string };

export type ExportColumns = {
  identity: boolean;
  contact: boolean;
  statusAndFollowUp: boolean;
  dealValue: boolean;
  transcript: boolean;
  customFields: boolean;
};

export const DEFAULT_COLUMNS: ExportColumns = {
  identity: true,
  contact: true,
  statusAndFollowUp: true,
  dealValue: false,
  transcript: false,
  customFields: false,
};

type Row = LeadRow & {
  voice_notes?: { transcript: string | null; summary: string | null }[] | null;
};

function formatDate(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

export async function buildLeadsCsv(
  scope: ExportScope,
  columns: ExportColumns,
  fieldLabels: Record<string, string> = {}
): Promise<{ csv: string; rowCount: number }> {
  // The transcript is only fetched when it is actually being exported — it is
  // by far the largest column and this runs on hall wifi.
  const select = columns.transcript
    ? '*, voice_notes(transcript, summary)'
    : '*';

  let query = supabase.from('leads').select(select).order('created_at', { ascending: true });

  if (scope.kind === 'event') query = query.eq('event_id', scope.eventId);
  if (scope.kind === 'won') {
    query = query.eq('status', 'won');
    if (scope.eventId) query = query.eq('event_id', scope.eventId);
  }
  if (scope.kind === 'range') {
    query = query.gte('created_at', scope.from).lte('created_at', scope.to);
    if (scope.eventId) query = query.eq('event_id', scope.eventId);
  }

  const { data, error } = await query;
  if (error) throw new Error("Couldn't gather the leads. Check your connection and try again.");

  const rows = (data ?? []) as unknown as Row[];

  // Custom field answers are keyed by field id, so the header needs the labels
  // from the event. Without them a column would be headed by a UUID.
  const customKeys = columns.customFields
    ? Array.from(
        new Set(
          rows.flatMap((row) =>
            row.custom_field_values && typeof row.custom_field_values === 'object'
              ? Object.keys(row.custom_field_values as Record<string, unknown>)
              : []
          )
        )
      )
    : [];

  const headers: string[] = ['Captured on'];
  if (columns.identity) headers.push('Name', 'Designation', 'Company');
  if (columns.contact) headers.push('Phone', 'Email', 'Company landline', 'Website', 'Address');
  if (columns.statusAndFollowUp) headers.push('Status', 'Follow-up date', 'Note', 'Consent given');
  if (columns.dealValue) headers.push('Deal value (₹)', 'Closed on');
  if (columns.transcript) headers.push('Voice note summary', 'Voice note transcript');
  headers.push(...customKeys.map((key) => fieldLabels[key] ?? key));

  const body = rows.map((row) => {
    const cells: unknown[] = [formatDate(row.created_at)];

    if (columns.identity) cells.push(row.full_name, row.designation ?? '', row.company ?? '');
    if (columns.contact) {
      cells.push(
        row.phone ?? '',
        row.email ?? '',
        row.company_landline ?? '',
        row.company_website ?? '',
        row.company_address ?? ''
      );
    }
    if (columns.statusAndFollowUp) {
      cells.push(
        statusFromDb(row.status),
        formatDate(row.follow_up_date),
        row.note ?? '',
        row.consent_given ? 'Yes' : 'No'
      );
    }
    if (columns.dealValue) {
      cells.push(
        row.deal_value_paisa == null ? '' : paiseToRupees(row.deal_value_paisa),
        formatDate(row.deal_closed_at)
      );
    }
    if (columns.transcript) {
      const note = row.voice_notes?.[0];
      cells.push(note?.summary ?? '', note?.transcript ?? '');
    }

    const values = (row.custom_field_values ?? {}) as Record<string, unknown>;
    for (const key of customKeys) {
      const value = values[key];
      cells.push(typeof value === 'boolean' ? (value ? 'Yes' : 'No') : (value ?? ''));
    }

    return cells;
  });

  return { csv: toCsv(headers, body), rowCount: body.length };
}
