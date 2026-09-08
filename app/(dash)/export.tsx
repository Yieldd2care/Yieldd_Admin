import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { DashShell } from '../../components/dash/DashShell';
import { Cap, Empty, GoldButton, Panel, Pill } from '../../components/dash/primitives';
import { Typography } from '../../components/ui/Typography';
import { DateField } from '../../components/app/DateField';
import { useEvents, useCurrentEvent } from '../../hooks/useEvents';
import { buildLeadsCsv, DEFAULT_COLUMNS, type ExportColumns, type ExportScope } from '../../lib/api/exportLeads';
import { fetchEventFields } from '../../lib/api/eventFields';
import { csvFilename } from '../../lib/csv';

type ScopeKind = 'event' | 'range' | 'won';

/**
 * What each toggle actually adds. The phone's labels understate it — `contact`
 * is six columns, not two — so they are spelled out here where there is room.
 */
const FIELD_ROWS: { key: keyof ExportColumns; label: string; detail: string }[] = [
  { key: 'identity', label: 'Name, company, designation', detail: 'Who they are' },
  { key: 'contact', label: 'Phone and email', detail: 'Plus landline, website, address, branch address' },
  { key: 'statusAndFollowUp', label: 'Status, follow-up date and note', detail: 'Where the lead has got to' },
  { key: 'dealValue', label: 'Deal value', detail: 'And the date it closed' },
  { key: 'transcript', label: 'Voice note transcript', detail: 'The largest column — slow on hall wifi' },
  { key: 'customFields', label: 'Your custom fields', detail: 'Headers use the labels you set' },
];

function Check({ on, label, detail, onPress }: { on: boolean; label: string; detail: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="flex-row items-start gap-3 py-[10px]">
      <View
        className={`w-[18px] h-[18px] rounded-sm items-center justify-center mt-[2px] ${
          on ? 'bg-navy' : 'border border-hairline bg-white'
        }`}
      >
        {on ? <Typography className="text-[11px] font-bold text-white">✓</Typography> : null}
      </View>
      <View className="flex-1">
        <Typography className="text-[13.5px] font-medium text-navy">{label}</Typography>
        <Typography className="text-[11.5px] text-label mt-[1px]">{detail}</Typography>
      </View>
    </Pressable>
  );
}

export default function DashExport() {
  const { data: events } = useEvents();
  const { event: current } = useCurrentEvent();

  const [eventId, setEventId] = useState<string | null>(null);
  const [scope, setScope] = useState<ScopeKind>('event');
  const [columns, setColumns] = useState<ExportColumns>(DEFAULT_COLUMNS);
  const [from, setFrom] = useState<Date | null>(null);
  const [to, setTo] = useState<Date | null>(null);
  const [fieldLabels, setFieldLabels] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Start on whatever the app is pointed at, then let them pick.
  useEffect(() => {
    if (!eventId && current) setEventId(current.id);
  }, [current, eventId]);

  const chosen = useMemo(() => events?.find((e) => e.id === eventId), [events, eventId]);

  // Labels for the custom-field headers, so a column reads "Budget range"
  // rather than a UUID. A failure here falls back to the raw keys.
  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    fetchEventFields(eventId)
      .then((defs) => {
        if (!cancelled) setFieldLabels(Object.fromEntries(defs.map((d) => [d.id, d.name])));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const anyColumn = Object.values(columns).some(Boolean);
  const rangeReady = scope !== 'range' || (from !== null && to !== null);
  const canDownload = anyColumn && rangeReady && !busy && (scope !== 'event' || Boolean(eventId));

  async function download() {
    if (!canDownload) return;
    setBusy(true);
    setMessage(null);
    try {
      const selection: ExportScope =
        scope === 'event'
          ? { kind: 'event', eventId: eventId as string }
          : scope === 'won'
            ? { kind: 'won', eventId: eventId ?? undefined }
            : {
                kind: 'range',
                from: (from as Date).toISOString(),
                // The last day has to be taken whole, or everything captured
                // after midnight on it is silently left out.
                to: new Date((to as Date).setHours(23, 59, 59, 999)).toISOString(),
                eventId: eventId ?? undefined,
              };

      const { csv, rowCount } = await buildLeadsCsv(selection, columns, fieldLabels);
      if (!rowCount) {
        setMessage('No leads match that selection.');
        return;
      }

      // A browser has no filesystem; the download is the delivery.
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = globalThis.URL.createObjectURL(blob);
      const link = globalThis.document.createElement('a');
      link.href = url;
      link.download = csvFilename(chosen?.name ?? 'Leads');
      link.click();
      globalThis.URL.revokeObjectURL(url);
      setMessage(`${rowCount} ${rowCount === 1 ? 'lead' : 'leads'} downloaded.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'That export did not go through.');
    } finally {
      setBusy(false);
    }
  }

  if (!events?.length) {
    return (
      <DashShell title="Export" subtitle="Download your leads as a spreadsheet">
        <Panel>
          <Empty title="No events yet" body="Once an event exists, everything captured at it can be exported here." />
        </Panel>
      </DashShell>
    );
  }

  return (
    <DashShell title="Export" subtitle="Download your leads as a spreadsheet">
      <View className="flex-row gap-4 items-start">
        <View className="flex-1 gap-4">
          <Panel className="p-[22px]">
            <Typography className="text-[17px] font-bold text-navy">Which event</Typography>
            <View className="flex-row flex-wrap gap-2 mt-4">
              {events.map((e) => (
                <Pill key={e.id} label={e.name} active={e.id === eventId} onPress={() => setEventId(e.id)} />
              ))}
            </View>
            {chosen ? (
              <Typography className="text-[12px] text-slate mt-3">
                {[chosen.city, chosen.stallNumber ? `Stall ${chosen.stallNumber}` : null].filter(Boolean).join(' · ')}
              </Typography>
            ) : null}
          </Panel>

          <Panel className="p-[22px]">
            <Typography className="text-[17px] font-bold text-navy">What to include</Typography>
            <View className="gap-2 mt-4">
              {(
                [
                  ['event', 'Everything from this event', chosen?.name ?? 'the chosen event'],
                  ['won', 'Won deals only', 'Across this event'],
                  ['range', 'A date range', 'Any window, within this event'],
                ] as const
              ).map(([kind, label, detail]) => (
                <Pressable
                  key={kind}
                  onPress={() => setScope(kind)}
                  className={`flex-row items-center gap-3 rounded-md px-4 py-[14px] ${
                    scope === kind ? 'border-[1.5px] border-navy bg-section' : 'border border-hairline bg-white'
                  }`}
                >
                  <View
                    className={`w-4 h-4 rounded-full ${
                      scope === kind ? 'border-[5px] border-navy' : 'border-[1.5px] border-hairline'
                    }`}
                  />
                  <View className="flex-1">
                    <Typography className="text-[13.5px] font-semibold text-navy">{label}</Typography>
                    <Typography className="text-[12px] text-slate mt-[2px]">{detail}</Typography>
                  </View>
                </Pressable>
              ))}
            </View>

            {scope === 'range' ? (
              <View className="flex-row gap-4 mt-4">
                <View className="flex-1">
                  <DateField label="From" value={from} onChange={setFrom} />
                </View>
                <View className="flex-1">
                  <DateField label="To" value={to} minDate={from} onChange={setTo} />
                </View>
              </View>
            ) : null}
          </Panel>
        </View>

        <View className="flex-1 gap-4">
          <Panel className="p-[22px]">
            <Typography className="text-[17px] font-bold text-navy">Columns</Typography>
            <View className="mt-2">
              {FIELD_ROWS.map((f) => (
                <Check
                  key={f.key}
                  on={columns[f.key]}
                  label={f.label}
                  detail={f.detail}
                  onPress={() => setColumns((c) => ({ ...c, [f.key]: !c[f.key] }))}
                />
              ))}
            </View>
            {!anyColumn ? (
              <Typography className="text-[11.5px] text-[#C23B3B] font-semibold mt-2">
                Pick at least one column.
              </Typography>
            ) : null}
          </Panel>

          <Panel className="p-[22px]">
            <Cap>Ready</Cap>
            <Typography className="text-[13.5px] text-navy font-semibold mt-[6px]">
              {chosen?.name ?? 'Choose an event'}
            </Typography>
            <View className="bg-section rounded-md p-[15px] mt-4">
              <Typography className="text-[12px] text-slate leading-[1.55]">
                Values starting with = + - @ are escaped so a spreadsheet treats them as text rather than
                formulas — a phone number beginning +91 is left exactly as it is.
              </Typography>
            </View>
            <View className="mt-4 flex-row">
              <GoldButton
                label={busy ? 'Preparing…' : 'Download CSV'}
                disabled={!canDownload}
                onPress={download}
              />
            </View>
            {!rangeReady ? (
              <Typography className="text-[11.5px] text-label mt-3">Pick both dates first.</Typography>
            ) : null}
            {message ? (
              <Typography className="text-[12.5px] text-slate mt-3 leading-[1.55]">{message}</Typography>
            ) : null}
          </Panel>
        </View>
      </View>
    </DashShell>
  );
}
