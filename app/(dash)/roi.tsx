import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import { DashShell } from '../../components/dash/DashShell';
import { Cap, Empty, GhostButton, GoldButton, Panel, Row, SectionTitle } from '../../components/dash/primitives';
import { Hero, HeroMetric, HeroMetrics } from '../../components/dash/hero';
import { Typography } from '../../components/ui/Typography';
import { useEvents } from '../../hooks/useEvents';
import { useEventSetStats } from '../../hooks/useEventStats';
import { PIPELINE_STATUS_COLORS } from '../../lib/roiPdf';
import { formatPercent } from '../../lib/roi';
import { formatPaise } from '../../lib/db';

const COLS = [1.7, 1, 0.6, 0.8, 0.8, 0.6];

/**
 * Return across every show, not one of them.
 *
 * The dashboard's "Return on spend" is an aggregate over the whole picker
 * selection, so pressing it used to land on a single event's ROI page showing a
 * different number — the complaint that produced this screen. It is deliberately
 * the same shape as `events/[id]/roi.tsx`, because it answers the same question
 * at a wider scope, and a reader who knows one should not have to learn the
 * other.
 */
export default function DashPortfolioRoi() {
  const router = useRouter();
  const { data: events, isLoading } = useEvents();

  const allIds = useMemo(() => (events ?? []).map((e) => e.id), [events]);
  const { data: all } = useEventSetStats(allIds);

  /**
   * The money figures are computed over the PRICED shows only.
   *
   * `all.spendPaise` already excludes shows with no cost recorded, but
   * `all.totalLeads` does not — so dividing one by the other would spread a
   * partial spend across every lead and quietly understate cost per lead. Asking
   * the same aggregate for just the priced ids keeps the numerator and the
   * denominator on the same set. When every show is priced this is the identical
   * query key, so it costs nothing.
   */
  const pricedIds = useMemo(() => {
    const unpriced = new Set(all?.unpricedEventIds ?? []);
    return allIds.filter((id) => !unpriced.has(id));
  }, [allIds, all?.unpricedEventIds]);
  const { data: priced } = useEventSetStats(pricedIds);

  const money = all?.canSeeMoney ?? false;
  const spend = priced?.spendPaise ?? 0;
  const hasSpend = spend > 0;

  const costPerLead = priced?.totalLeads ? Math.round(spend / priced.totalLeads) : null;
  const costPerWon = priced?.dealsWon ? Math.round(spend / priced.dealsWon) : null;

  const unpricedCount = all?.unpricedEventIds.length ?? 0;
  const pricedCount = all?.pricedEvents ?? 0;

  /** Pipeline presses widen the picker, because this page counts every show. */
  const openLeads = (status?: string) => {
    const query = new URLSearchParams();
    if (status) query.set('status', status);
    query.set('events', 'all');
    router.push(`/(dash)/leads?${query.toString()}`);
  };

  if (!events?.length) {
    return (
      <DashShell title="Return across your shows" breadcrumb={[{ label: 'Events', href: '/(dash)/events' }]}>
        <Panel>
          <Empty
            title={isLoading ? 'Loading' : 'No events yet'}
            body={isLoading ? 'One moment.' : 'Create an event and its return works itself out from there.'}
          />
        </Panel>
      </DashShell>
    );
  }

  return (
    <DashShell
      title="Return across your shows"
      subtitle={
        unpricedCount
          ? `${events.length} shows · ${pricedCount} with a cost entered`
          : `${events.length} ${events.length === 1 ? 'show' : 'shows'}`
      }
      breadcrumb={[{ label: 'Events', href: '/(dash)/events' }]}
      actions={<GhostButton label="All events" onPress={() => router.push('/(dash)/events')} />}
    >
      {!money ? (
        <Panel className="p-6">
          <Typography className="text-[15px] font-bold text-navy">Figures are for admins</Typography>
          <Typography className="text-[13px] text-slate leading-[1.6] mt-2">
            Event costs and deal values are visible to admins. The lead counts below are every
            event&rsquo;s, not just yours.
          </Typography>
        </Panel>
      ) : !hasSpend ? (
        <Panel className="p-6 flex-row items-center justify-between">
          <View className="flex-1 pr-4">
            <Typography className="text-[15px] font-bold text-navy">No show has a cost entered yet</Typography>
            <Typography className="text-[13px] text-slate leading-[1.6] mt-1">
              Return cannot be worked out until at least one stall has its spend recorded. Seven lines, on
              each event&rsquo;s edit screen.
            </Typography>
          </View>
          <GoldButton label="Open events" onPress={() => router.push('/(dash)/events')} />
        </Panel>
      ) : (
        <Hero>
          <View className="flex-row items-start gap-10">
            <HeroMetric
              large
              label="Return on investment"
              value={formatPercent(priced?.roiPercent ?? null, 'Not enough data')}
              note={`${formatPaise(priced?.wonValuePaise)} won against ${formatPaise(spend)} spent`}
            />
            <HeroMetrics>
              <HeroMetric
                label="Cost per lead"
                value={formatPaise(costPerLead)}
                valueClassName="text-gold"
                note={`${priced?.totalLeads ?? 0} leads across ${pricedCount} priced ${
                  pricedCount === 1 ? 'show' : 'shows'
                }`}
                onPress={() => openLeads()}
              />
              <HeroMetric
                label="Cost per deal won"
                value={formatPaise(costPerWon)}
                note={`${priced?.dealsWon ?? 0} ${priced?.dealsWon === 1 ? 'deal' : 'deals'} closed`}
                onPress={() => openLeads('Won')}
              />
            </HeroMetrics>
          </View>
        </Hero>
      )}

      {/* Said once, plainly: an averaged figure has to name what it averages. */}
      {money && hasSpend && unpricedCount ? (
        <Pressable onPress={() => router.push('/(dash)/events')} className="mt-[14px] self-start">
          <Typography className="text-[12.5px] font-semibold text-blue">
            {unpricedCount} {unpricedCount === 1 ? 'show has' : 'shows have'} no cost entered and{' '}
            {unpricedCount === 1 ? 'is' : 'are'} left out of every figure above
          </Typography>
        </Pressable>
      ) : null}

      <View className="flex-row gap-6 mt-6 items-stretch">
        <Panel className="flex-1 px-6 py-6">
          <SectionTitle
            title="Pipeline by status"
            right={<Typography className="text-[12px] text-slate font-medium">{all?.totalLeads ?? 0} leads</Typography>}
          />
          <View className="gap-3 mt-4">
            {(all?.pipeline ?? []).map((p) => (
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
            {/* Not pressable: this sums Qualified AND Won, and the Leads screen
                narrows to one status at a time. */}
            <View className="flex-1 bg-section rounded-md p-4">
              <Cap>Qualified and won</Cap>
              <Typography className="text-[20px] font-extrabold text-navy mt-[5px]">
                {formatPaise(all?.expectedValuePaise ?? null)}
              </Typography>
              <Typography className="text-[11.5px] text-label mt-[2px]">Everything worth chasing</Typography>
            </View>
            <Pressable className="flex-1 bg-section rounded-md p-4" onPress={() => openLeads('Won')}>
              <Cap>Conversion</Cap>
              <Typography className="text-[20px] font-extrabold text-navy mt-[5px]">
                {formatPercent(all?.conversionPercent ?? null)}
              </Typography>
              <Typography className="text-[11.5px] text-label mt-[2px]">Leads that became deals</Typography>
            </Pressable>
          </View>
          {money && hasSpend ? (
            <Typography className="text-[12px] text-slate leading-[1.6] mt-4 pt-4 border-t border-hairline">
              Return is (value won &minus; event cost) &divide; event cost, worked out once over every priced
              show rather than as an average of each show&rsquo;s own return. Only deals marked Won count
              towards it, so break-even is 0%, not 100%.
            </Typography>
          ) : null}
        </Panel>
      </View>

      {/* Which shows make up the average. Without this the figure above is a
          number with nothing behind it. */}
      <Panel className="overflow-hidden mt-6">
        <View className="px-6 py-[18px]">
          <SectionTitle
            title="Show by show"
            right={
              <Typography className="text-[12px] text-slate font-medium">
                Open one for its own return
              </Typography>
            }
          />
        </View>
        <Row cols={COLS} header cells={['Event', 'City', 'Leads', 'Spend', 'Dates', '']} />
        {events.map((e, i) => (
          <Pressable
            key={e.id}
            onPress={() => router.push(`/(dash)/events/${e.id}/roi`)}
            className="hover:bg-section"
          >
            <Row
              cols={COLS}
              last={i === events.length - 1}
              cells={[
                <Typography className="text-[14px] font-semibold text-blue" numberOfLines={1}>
                  {e.name}
                </Typography>,
                e.city || '-',
                <Typography className="text-[14px] font-bold text-navy">{e.leads ?? 0}</Typography>,
                <Typography className="text-[13px] font-semibold text-navy">
                  {/* totalCost is rupees; formatPaise wants paise. */}
                  {formatPaise(e.totalCost * 100, { fallback: 'Not added' })}
                </Typography>,
                <Typography className="text-[12.5px] text-slate">
                  {new Date(e.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </Typography>,
                <View className="flex-row justify-end">
                  <View className="px-3 py-[7px] rounded-sm border border-hairline bg-white">
                    <Typography className="text-[12.5px] font-semibold text-navy">ROI</Typography>
                  </View>
                </View>,
              ]}
            />
          </Pressable>
        ))}
      </Panel>
    </DashShell>
  );
}
