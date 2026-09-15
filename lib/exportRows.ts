import { toCsv } from './csv';
import { paiseToRupees } from './db';
import { statusFromDb } from './mappers/lead';

/**
 * Turning export rows into the CSV table.
 *
 * Split out of `lib/api/exportLeads.ts` so it can be checked without pulling in
 * `lib/supabase`, which needs React Native to load. `npm run verify:export`
 * compiles this file on its own and asserts the money columns against every
 * lead status. The fetch stays next door; nothing here talks to the network.
 */

/** What a status is called in the database, spelled out rather than imported. */
type DbLeadStatus = 'new' | 'contacted' | 'qualified' | 'won' | 'lost';

/**
 * One row as `public.export_leads` returns it.
 *
 * Hand-written rather than taken from the generated types, the same way
 * `StatsRow` is in `lib/api/eventStats.ts`: `types/database.ts` is disposable
 * and only `lib/db.ts` may import it.
 */
export type ExportRow = {
  created_at: string;
  full_name: string;
  designation: string | null;
  company: string | null;
  phone: string | null;
  email: string | null;
  company_landline: string | null;
  company_website: string | null;
  company_address: string | null;
  branch_address: string | null;
  status: DbLeadStatus;
  follow_up_date: string | null;
  note: string | null;
  consent_given: boolean;

  /**
   * Whether the caller was allowed the money columns at all.
   *
   * This is what separates "this lead has no value" from "you may not see it",
   * and it is decided by the database, not here. The three money headers are
   * dropped entirely when it is false, so a rep gets a file without those
   * columns rather than a file with three empty ones.
   */
  money_visible: boolean;
  /** Qualified plus won. Null for a rep, and for any other status. */
  expected_value_paisa: number | null;
  /** Won alone. Null for a rep, and for any other status. */
  won_value_paisa: number | null;
  /** Won alone: a lead that has not closed has no closing date. */
  deal_closed_at: string | null;

  voice_summary: string | null;
  voice_transcript: string | null;
  custom_field_values: unknown;
};

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

/**
 * Which column toggles a viewer is offered.
 *
 * This is NOT the lock. `export_leads` withholds the money columns in SQL and
 * that is what actually protects them. This only stops a rep being shown a tick
 * that could produce nothing, which the report for PENDING 47 called worse than
 * no tick at all.
 *
 * It lives here, shared, because the phone and the web dashboard keep separate
 * column lists and the same export has to produce the same file whichever one
 * asked for it.
 */
export function isColumnOffered(key: keyof ExportColumns, isAdmin: boolean): boolean {
  return isAdmin || key !== 'dealValue';
}

/**
 * What the caller actually asks for, once the viewer is taken into account.
 *
 * A column that will not be written must not be able to enable the Generate
 * button on its own either, so both screens derive "has anything been picked"
 * from this rather than from the raw toggles.
 */
export function effectiveColumns(columns: ExportColumns, isAdmin: boolean): ExportColumns {
  return { ...columns, dealValue: isAdmin && columns.dealValue };
}

function formatDate(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

function rupees(paise: number | null): string | number {
  return paise == null ? '' : paiseToRupees(paise);
}

/**
 * Whether the money columns belong in this file at all.
 *
 * Every row carries the same answer, so any one of them will do. An export with
 * no rows never reaches a file — both screens stop at "Nothing to export".
 */
export function moneyAllowed(rows: ExportRow[]): boolean {
  return rows.some((row) => row.money_visible);
}

export function buildCsvFromRows(
  rows: ExportRow[],
  columns: ExportColumns,
  fieldLabels: Record<string, string> = {}
): { csv: string; rowCount: number } {
  // Deal value is two columns, never one. Expected is what the pipeline is
  // worth (qualified plus won), won is what has actually closed. A single
  // column mixing a forecast with a closed deal is how a finance team reads a
  // forecast as revenue, which is the whole reason this is split.
  const money = columns.dealValue && moneyAllowed(rows);

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
  if (columns.contact)
    headers.push('Phone', 'Email', 'Company landline', 'Website', 'Address', 'Branch address');
  if (columns.statusAndFollowUp) headers.push('Status', 'Follow-up date', 'Note', 'Consent given');
  // "Closed on" sits with won, not with expected: a qualified lead has not
  // closed and has no date to show.
  if (money) headers.push('Expected deal value (₹)', 'Won deal value (₹)', 'Closed on');
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
        row.company_address ?? '',
        row.branch_address ?? ''
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
    if (money) {
      cells.push(
        rupees(row.expected_value_paisa),
        rupees(row.won_value_paisa),
        formatDate(row.deal_closed_at)
      );
    }
    if (columns.transcript) {
      cells.push(row.voice_summary ?? '', row.voice_transcript ?? '');
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
