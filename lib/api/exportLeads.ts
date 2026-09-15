import { supabase } from '../supabase';
import {
  buildCsvFromRows,
  DEFAULT_COLUMNS,
  effectiveColumns,
  isColumnOffered,
  type ExportColumns,
  type ExportRow,
} from '../exportRows';

/**
 * Building the export file.
 *
 * The rows come from the server rather than the on-device cache, because an
 * export is the one thing a customer will treat as complete. The cache holds
 * what has been looked at; this asks for everything the person is allowed to
 * see.
 *
 * Which rows that is has not changed: `export_leads` is `security invoker`, so
 * `leads_select_own_or_admin` still applies and a rep exports their own leads
 * while an admin exports the organisation's. That is correct behaviour, not a
 * limitation to work around.
 *
 * What HAS changed is the money. The expected and won columns and the close
 * date come back NULL for a rep, decided inside the function rather than here,
 * so a caller cannot leak them by forgetting a check — the same rule
 * `event_stats` has enforced since it was written. `money_visible` on the row
 * says whether they were granted at all, which is what lets the headers be
 * dropped rather than printed empty.
 */

export type ExportScope =
  | { kind: 'event'; eventId: string }
  | { kind: 'won'; eventId?: string }
  | { kind: 'range'; from: string; to: string; eventId?: string };

// Re-exported so the screens keep importing their column types from one place.
export { DEFAULT_COLUMNS, effectiveColumns, isColumnOffered, type ExportColumns };

export async function buildLeadsCsv(
  scope: ExportScope,
  columns: ExportColumns,
  fieldLabels: Record<string, string> = {}
): Promise<{ csv: string; rowCount: number }> {
  const { data, error } = await supabase.rpc('export_leads', {
    p_event_id: scope.kind === 'event' ? scope.eventId : (scope.eventId ?? undefined),
    p_from: scope.kind === 'range' ? scope.from : undefined,
    p_to: scope.kind === 'range' ? scope.to : undefined,
    p_won_only: scope.kind === 'won',
    // The transcript is only fetched when it is actually being exported — it is
    // by far the largest column and this runs on hall wifi.
    p_with_transcript: columns.transcript,
  });

  if (error) throw new Error("Couldn't gather the leads. Check your connection and try again.");

  return buildCsvFromRows((data ?? []) as unknown as ExportRow[], columns, fieldLabels);
}
