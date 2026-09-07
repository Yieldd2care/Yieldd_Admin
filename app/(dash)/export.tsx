import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { DashShell } from '../../components/dash/DashShell';
import { Cap, GoldButton, Panel, Pill } from '../../components/dash/primitives';
import { Typography } from '../../components/ui/Typography';
import { useCurrentEvent } from '../../hooks/useEvents';
import { useLeadsStore } from '../../stores/useLeadsStore';
import { buildLeadsCsv, DEFAULT_COLUMNS, type ExportScope } from '../../lib/api/exportLeads';

type Scope = 'event' | 'won';

export default function DashExport() {
  const { event } = useCurrentEvent();
  const leads = useLeadsStore((s) => s.leads);
  const [scope, setScope] = useState<Scope>('event');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const counts = useMemo(
    () => ({
      event: leads.filter((l) => l.eventId === event?.id).length,
      won: leads.filter((l) => l.status === 'Won').length,
    }),
    [leads, event?.id]
  );

  const rows = counts[scope];

  async function download() {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      // The counts above come from the device's own copy; the CSV is built from
      // the server so it carries everything this person is allowed to see, not
      // just what happens to be cached here.
      // buildLeadsCsv takes event / won / range. There is no "everything"
      // scope, so this screen does not offer one.
      const exportScope: ExportScope =
        scope === 'event' && event
          ? { kind: 'event', eventId: event.id }
          : { kind: 'won', eventId: scope === 'won' ? event?.id : undefined };

      const { csv, rowCount } = await buildLeadsCsv(exportScope, DEFAULT_COLUMNS);
      if (rowCount === 0) {
        setMessage('Nothing to export in that selection.');
        return;
      }

      // A browser has no filesystem to write to; the download is the delivery.
      const name = `yieldd-leads-${new Date().toISOString().slice(0, 10)}.csv`;
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = globalThis.URL.createObjectURL(blob);
      const link = globalThis.document.createElement('a');
      link.href = url;
      link.download = name;
      link.click();
      globalThis.URL.revokeObjectURL(url);
      setMessage(`${rowCount} ${rowCount === 1 ? 'lead' : 'leads'} downloaded.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'That export did not go through.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashShell title="Export" subtitle="Download your leads as a spreadsheet">
      <View className="flex-row gap-4">
        <Panel className="flex-1 p-[22px]">
          <Typography className="text-[17px] font-bold text-navy">What to export</Typography>

          <View className="flex-row flex-wrap gap-2 mt-4">
            <Pill
              label={`This event (${counts.event})`}
              active={scope === 'event'}
              onPress={() => setScope('event')}
            />
            <Pill label={`Won only (${counts.won})`} active={scope === 'won'} onPress={() => setScope('won')} />
          </View>

          {event ? (
            <View className="mt-5 pt-4 border-t border-hairline">
              <Cap>Current event</Cap>
              <Typography className="text-[13.5px] font-semibold text-navy mt-[5px]">{event.name}</Typography>
              {event.city ? <Typography className="text-[12.5px] text-slate mt-[2px]">{event.city}</Typography> : null}
            </View>
          ) : null}
        </Panel>

        <Panel className="flex-1 p-[22px]">
          <Typography className="text-[17px] font-bold text-navy">Ready to download</Typography>
          <Typography className="text-[30px] font-extrabold text-navy mt-[6px] tracking-tight">{rows}</Typography>
          <Typography className="text-[12.5px] text-slate mt-[2px]">
            {rows === 1 ? 'lead' : 'leads'} on this device
          </Typography>

          <View className="bg-section rounded-md p-[15px] mt-[18px]">
            <Typography className="text-[12px] text-slate leading-[1.55]">
              Values starting with = + - @ are escaped so a spreadsheet treats them as text rather than formulas.
            </Typography>
          </View>

          <View className="mt-5 flex-row">
            <GoldButton label={busy ? 'Preparing…' : 'Download CSV'} onPress={download} />
          </View>

          {message ? (
            <Typography className="text-[12.5px] text-slate mt-3 leading-[1.55]">{message}</Typography>
          ) : null}

          <Typography className="text-[11.5px] text-label mt-3 leading-[1.55]">
            Column choices and date ranges are on the event&rsquo;s own export screen in the phone app.
          </Typography>
        </Panel>
      </View>
    </DashShell>
  );
}
