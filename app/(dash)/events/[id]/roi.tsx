import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { DashShell } from '../../../../components/dash/DashShell';
import { Cap, Empty, GhostButton, GoldButton, Panel } from '../../../../components/dash/primitives';
import { Typography } from '../../../../components/ui/Typography';
import { useEvent } from '../../../../hooks/useEvents';
import { useEventStats } from '../../../../hooks/useEventStats';
import { buildRoiPdfHtml, eventSubtitle, PIPELINE_STATUS_COLORS } from '../../../../lib/roiPdf';
import { formatPercent } from '../../../../lib/roi';
import { formatPaise } from '../../../../lib/db';
import { buildLeadsCsv, DEFAULT_COLUMNS } from '../../../../lib/api/exportLeads';
import { csvFilename } from '../../../../lib/csv';

/**
 * The ROI sheet, in a browser.
 *
 * Every figure comes off the one `stats` object, exactly as the phone screen
 * does — nothing is recomputed here. That matters because the money fields are
 * null for a rep by design (`event_stats` returns null rather than 0 to a
 * non-admin), and a 0 would read as "this event made nothing".
 */

function printHtml(html: string) {
  // A hidden iframe, not a new window: a popup would be blocked, and
  // expo-print's printToFileAsync does not exist on web.
  const frame = globalThis.document.createElement('iframe');
  frame.style.position = 'fixed';
  frame.style.right = '0';
  frame.style.bottom = '0';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  globalThis.document.body.appendChild(frame);

  const doc = frame.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(html);
  doc.close();

  frame.contentWindow?.focus();
  frame.contentWindow?.print();
  // Left long enough for the print dialog to take its snapshot.
  globalThis.setTimeout(() => frame.remove(), 60_000);
}

export default function DashEventRoi() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = id ?? '';
  const { data: event } = useEvent(eventId || undefined);
  const { data: stats, isLoading } = useEventStats(eventId || undefined);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const crumbs = [
    { label: 'Events', href: '/(dash)/events' },
    ...(event ? [{ label: event.name, href: `/(dash)/events/${event.id}` }] : []),
  ];

  async function downloadCsv() {
    if (busy || !event) return;
    setBusy(true);
    setMessage(null);
    try {
      const { csv, rowCount } = await buildLeadsCsv({ kind: 'event', eventId: event.id }, DEFAULT_COLUMNS);
      if (rowCount === 0) {
        setMessage('Nothing captured at this event yet.');
        return;
      }
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = globalThis.URL.createObjectURL(blob);
      const link = globalThis.document.createElement('a');
      link.href = url;
      link.download = csvFilename(event.name);
      link.click();
      globalThis.URL.revokeObjectURL(url);
      setMessage(`${rowCount} ${rowCount === 1 ? 'lead' : 'leads'} downloaded.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'That export did not go through.');
    } finally {
      setBusy(false);
    }
  }

  if (!event || !stats) {
    return (
      <DashShell title="Return on this stall" breadcrumb={crumbs}>
        <Panel>
          <Empty
            title={isLoading ? 'Loading' : 'Event not found'}
            body={isLoading ? 'One moment.' : 'It may have been deleted, or you are not on it.'}
          />
        </Panel>
      </DashShell>
    );
  }

  const hasSpend = stats.spendPaise != null && stats.spendPaise > 0;

  return (
    <DashShell
      title="Return on this stall"
      subtitle={eventSubtitle(event)}
      breadcrumb={crumbs}
      actions={
        <>
          <GhostButton label="Print / Save PDF" onPress={() => printHtml(buildRoiPdfHtml(event, stats))} />
          <GoldButton label={busy ? 'Preparing…' : 'Download leads'} disabled={busy} onPress={downloadCsv} />
        </>
      }
    >
      {!stats.canSeeMoney ? (
        <Panel className="p-[22px]">
          <Typography className="text-[15px] font-bold text-navy">Figures are for admins</Typography>
          <Typography className="text-[13px] text-slate leading-[1.6] mt-2">
            Event costs and deal values are visible to admins. The lead counts below are the whole
            event&rsquo;s, not just yours.
          </Typography>
        </Panel>
      ) : !hasSpend ? (
        <Panel className="p-[22px] flex-row items-center justify-between">
          <View className="flex-1 pr-4">
            <Typography className="text-[15px] font-bold text-navy">Add what this stall cost</Typography>
            <Typography className="text-[13px] text-slate leading-[1.6] mt-1">
              Return cannot be worked out until the spend is recorded. Seven lines, on the edit screen.
            </Typography>
          </View>
          <GoldButton label="Add costs" onPress={() => router.push(`/(dash)/events/${event.id}/edit`)} />
        </Panel>
      ) : (
        <View className="rounded-xl bg-navy p-7 flex-row">
          <View className="flex-1 pr-7">
            <Cap className="text-white/45">Return on investment</Cap>
            <Typography className="text-[40px] font-extrabold text-white mt-1 tracking-tight">
              {formatPercent(stats.roiPercent, 'Not enough data')}
            </Typography>
            <Typography className="text-[12.5px] text-white/55 mt-1">
              {formatPaise(stats.wonValuePaise)} won against {formatPaise(stats.spendPaise)} spent
            </Typography>
          </View>
          <View className="flex-1 px-7 border-l border-white/[0.14]">
            <Cap className="text-white/45">Cost per lead</Cap>
            <Typography className="text-[30px] font-extrabold text-gold mt-1 tracking-tight">
              {formatPaise(stats.costPerLeadPaise)}
            </Typography>
            <Typography className="text-[12.5px] text-white/55 mt-1">{stats.totalLeads} leads captured</Typography>
          </View>
          <View className="flex-1 pl-7 border-l border-white/[0.14]">
            <Cap className="text-white/45">Cost per deal won</Cap>
            <Typography className="text-[30px] font-extrabold text-white mt-1 tracking-tight">
              {stats.dealsWon > 0 ? formatPaise(stats.costPerWonPaise) : '—'}
            </Typography>
            <Typography className="text-[12.5px] text-white/55 mt-1">
              {stats.dealsWon} {stats.dealsWon === 1 ? 'deal' : 'deals'} closed
            </Typography>
          </View>
        </View>
      )}

      <View className="flex-row gap-4 mt-4">
        <Panel className="flex-1 px-[22px] py-5">
          <Typography className="text-[17px] font-bold text-navy">Pipeline by status</Typography>
          <View className="gap-3 mt-4">
            {stats.pipeline.map((p) => (
              <View key={p.status}>
                <View className="flex-row justify-between mb-[6px]">
                  <Typography className="text-[13px] text-ink-muted font-medium">{p.status}</Typography>
                  <Typography className="text-[13px] font-bold text-navy">{p.count}</Typography>
                </View>
                <View className="h-[8px] bg-surface rounded-full overflow-hidden">
                  <View
                    className="h-full rounded-full"
                    // barWidth is scaled against the largest bucket, not the
                    // total — shareOfTotal is the other one.
                    style={{ width: `${p.barWidth}%`, backgroundColor: PIPELINE_STATUS_COLORS[p.status] }}
                  />
                </View>
              </View>
            ))}
          </View>
        </Panel>

        <Panel className="flex-1 px-[22px] py-5">
          <Typography className="text-[17px] font-bold text-navy">Still open</Typography>
          <View className="flex-row gap-3 mt-4">
            <View className="flex-1 bg-section rounded-md p-4">
              <Cap>Qualified and won</Cap>
              <Typography className="text-[20px] font-extrabold text-navy mt-[5px]">
                {formatPaise(stats.expectedValuePaise)}
              </Typography>
              <Typography className="text-[11.5px] text-label mt-[2px]">Everything worth chasing</Typography>
            </View>
            <View className="flex-1 bg-section rounded-md p-4">
              <Cap>Conversion</Cap>
              <Typography className="text-[20px] font-extrabold text-navy mt-[5px]">
                {formatPercent(stats.conversionPercent)}
              </Typography>
              <Typography className="text-[11.5px] text-label mt-[2px]">Leads that became deals</Typography>
            </View>
          </View>
          {stats.canSeeMoney && hasSpend ? (
            <Typography className="text-[12px] text-slate leading-[1.6] mt-4 pt-4 border-t border-hairline">
              Return is (value won &minus; event cost) &divide; event cost. Only deals marked Won count towards
              it, so break-even is 0%, not 100%.
            </Typography>
          ) : null}
        </Panel>
      </View>

      {message ? (
        <Typography className="text-[12.5px] text-slate mt-4">{message}</Typography>
      ) : null}
    </DashShell>
  );
}
