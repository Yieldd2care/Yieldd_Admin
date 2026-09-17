import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { DashShell } from '../../../../components/dash/DashShell';
import { Cap, Empty, GhostButton, GoldButton, Panel, SectionTitle } from '../../../../components/dash/primitives';
import { Hero, HeroMetric, HeroMetrics } from '../../../../components/dash/hero';
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

  /**
   * Open the leads behind a figure, always pinned to this event. Built as a
   * query STRING: the object form of router.push silently drops these keys.
   */
  const openLeads = (status?: string) => {
    const query = new URLSearchParams();
    if (status) query.set('status', status);
    query.set('event', eventId);
    router.push(`/(dash)/leads?${query.toString()}`);
  };

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
  // `spendPaise` is `total_cost_paisa`, generated as `coalesce(component, 0) + …`,
  // so it reads 0 both for an event nobody has costed AND for one genuinely
  // costed at zero. Only the components can tell those apart.
  const isPriced = event.isPriced;

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
            <Typography className="text-[15px] font-bold text-navy">
              {isPriced ? 'This show is recorded as costing nothing' : 'Add what this stall cost'}
            </Typography>
            <Typography className="text-[13px] text-slate leading-[1.6] mt-1">
              {isPriced
                ? 'Every cost line is zero, so there is no spend to work a return out against. Change it on the edit screen if that is not right.'
                : 'Return cannot be worked out until the spend is recorded. Seven lines, on the edit screen.'}
            </Typography>
          </View>
          <GoldButton
            label={isPriced ? 'Edit costs' : 'Add costs'}
            onPress={() => router.push(`/(dash)/events/${event.id}/edit`)}
          />
        </Panel>
      ) : (
        <Hero>
          <View className="flex-row items-start gap-10">
            <HeroMetric
              large
              label="Return on investment"
              value={formatPercent(stats.roiPercent, 'Not enough data')}
              note={`${formatPaise(stats.wonValuePaise)} won against ${formatPaise(stats.spendPaise)} spent`}
            />
            <HeroMetrics>
              <HeroMetric
                label="Cost per lead"
                value={formatPaise(stats.costPerLeadPaise)}
                valueClassName="text-gold"
                note={`${stats.totalLeads} leads captured`}
                onPress={() => openLeads()}
              />
              <HeroMetric
                label="Cost per deal won"
                value={stats.dealsWon > 0 ? formatPaise(stats.costPerWonPaise) : '-'}
                note={`${stats.dealsWon} ${stats.dealsWon === 1 ? 'deal' : 'deals'} closed`}
                onPress={() => openLeads('Won')}
              />
            </HeroMetrics>
          </View>
        </Hero>
      )}

      <View className="flex-row gap-6 mt-6 items-stretch">
        <Panel className="flex-1 px-6 py-6">
          <SectionTitle
            title="Pipeline by status"
            right={<Typography className="text-[12px] text-slate font-medium">{stats.totalLeads} leads</Typography>}
          />
          <View className="gap-3 mt-4">
            {stats.pipeline.map((p) => (
              // Every bar opens the leads it counts, pinned to this event.
              <Pressable key={p.status} disabled={p.count === 0} onPress={() => openLeads(p.status)}>
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
              </Pressable>
            ))}
          </View>
        </Panel>

        <Panel className="flex-1 px-6 py-6">
          <SectionTitle title="Still open" />
          <View className="flex-row gap-3 mt-4">
            {/* Not pressable on purpose: this sums Qualified AND Won, and the
                Leads screen narrows to one status at a time — so a press would
                land on roughly half the money the tile names. */}
            <View className="flex-1 bg-section rounded-md p-4">
              <Cap>Qualified and won</Cap>
              <Typography className="text-[20px] font-extrabold text-navy mt-[5px]">
                {formatPaise(stats.expectedValuePaise)}
              </Typography>
              <Typography className="text-[11.5px] text-label mt-[2px]">Everything worth chasing</Typography>
            </View>
            <Pressable className="flex-1 bg-section rounded-md p-4" onPress={() => openLeads('Won')}>
              <Cap>Conversion</Cap>
              <Typography className="text-[20px] font-extrabold text-navy mt-[5px]">
                {formatPercent(stats.conversionPercent)}
              </Typography>
              <Typography className="text-[11.5px] text-label mt-[2px]">Leads that became deals</Typography>
            </Pressable>
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
