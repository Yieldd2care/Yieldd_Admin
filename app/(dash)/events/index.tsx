import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import { DashShell } from '../../../components/dash/DashShell';
import { Empty, GoldButton, Panel, Row, SectionTitle, StatusChip } from '../../../components/dash/primitives';
import { Hero, HeroMetric, HeroMetrics, HeroTitle } from '../../../components/dash/hero';
import { Typography } from '../../../components/ui/Typography';
import { useEvents } from '../../../hooks/useEvents';
import { useEventSetStats } from '../../../hooks/useEventStats';
import { useSessionStore } from '../../../stores/useSessionStore';
import { formatPaise } from '../../../lib/db';
import { formatPercent } from '../../../lib/roi';

const COLS = [1.6, 1, 0.95, 0.6, 0.5, 0.7, 0.75];

function dateRange(start: string, end: string) {
  const fmt = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return `${fmt(start)} – ${fmt(end)} ${new Date(end).getFullYear()}`;
}

export default function DashEvents() {
  const router = useRouter();
  const { data: events, isLoading } = useEvents();
  const isAdmin = useSessionStore((s) => s.user?.role === 'admin');

  /**
   * The portfolio, from the same server aggregate the dashboard's hero uses.
   *
   * Not summed on the device. Money has to come from `event_set_stats` for two
   * reasons: won value is not on the event row at all, and the aggregate is the
   * thing that decides which events are priced enough to count towards a return.
   * Adding up here would quietly include a ₹0 event in the denominator and
   * flatter the number.
   *
   * Pressing "Return on spend" on the dashboard lands here, so the figure it was
   * pressed from has to still be true on arrival — which is exactly why this
   * reads the same aggregate rather than recomputing its own version.
   */
  const allIds = useMemo(() => (events ?? []).map((e) => e.id), [events]);
  const { data: setStats } = useEventSetStats(allIds);
  const money = setStats?.canSeeMoney ?? false;

  const totals = useMemo(() => {
    const list = events ?? [];
    return {
      count: list.length,
      live: list.filter((e) => e.status === 'live').length,
      unpriced: setStats?.unpricedEventIds.length ?? list.filter((e) => !e.totalCost).length,
    };
  }, [events, setStats?.unpricedEventIds]);

  return (
    <DashShell
      title="Events"
      subtitle={events?.length ? `${events.length} in total` : undefined}
      actions={
        isAdmin ? <GoldButton label="New event" onPress={() => router.push('/(dash)/events/new')} /> : undefined
      }
    >
      <Hero>
        <View className="flex-row items-start gap-10">
          <View className="flex-1 min-w-0">
            <HeroTitle
              title={totals.live ? `${totals.live} show${totals.live === 1 ? '' : 's'} running` : 'Your shows'}
              live={totals.live > 0}
              sub={
                totals.unpriced
                  ? `${totals.unpriced} of ${totals.count} ${
                      totals.unpriced === 1 ? 'has' : 'have'
                    } no cost entered, so ${totals.unpriced === 1 ? 'it sits' : 'they sit'} outside the return above`
                  : 'Every show you have run, with what it cost and what it brought in'
              }
            />
          </View>
          <HeroMetrics>
            <HeroMetric
              label="Leads captured"
              value={String(setStats?.totalLeads ?? 0)}
              note={`Across ${totals.count} ${totals.count === 1 ? 'show' : 'shows'}`}
              // `events=all` widens the picker on arrival. Without it this
              // lands inside whatever narrower selection was already set and
              // shows fewer leads than the number just pressed.
              onPress={() => router.push('/(dash)/leads?events=all')}
            />
            {money ? (
              <>
                <HeroMetric
                  label="Total spend"
                  value={formatPaise(setStats?.spendPaise)}
                  note="What the stalls came to"
                  onPress={() => router.push('/(dash)/roi')}
                />
                <HeroMetric
                  label="Return on spend"
                  value={formatPercent(setStats?.roiPercent ?? null)}
                  note={`${formatPaise(setStats?.wonValuePaise)} closed across every priced show`}
                  onPress={() => router.push('/(dash)/roi')}
                />
              </>
            ) : (
              <HeroMetric label="Events" value={String(totals.count)} note="Upcoming, live and closed" />
            )}
          </HeroMetrics>
        </View>
      </Hero>

      <View className="mt-6">
        <Panel className="overflow-hidden">
          <View className="px-6 py-[18px]">
            <SectionTitle
              title="All events"
              right={
                <Typography className="text-[12px] text-slate font-medium">
                  Click a row to open its dashboard
                </Typography>
              }
            />
          </View>
          {events?.length ? (
            <>
              <Row cols={COLS} header cells={['Event', 'City', 'Dates', 'Status', 'Leads', 'Spend', '']} />
              {events.map((e, i) => (
                // The whole row opens the event. The buttons on the right still
                // win their own clicks, because a press on a child never reaches
                // this one.
                <Pressable
                  key={e.id}
                  onPress={() => router.push(`/(dash)/events/${e.id}`)}
                  className="hover:bg-section"
                >
                  <Row
                    cols={COLS}
                    last={i === events.length - 1}
                    cells={[
                      <View>
                        <Typography className="text-[14px] font-semibold text-blue" numberOfLines={1}>
                          {e.name}
                        </Typography>
                        {e.stallNumber ? (
                          <Typography className="text-[11.5px] text-label mt-[2px]">Stall {e.stallNumber}</Typography>
                        ) : null}
                      </View>,
                      e.city || '-',
                      dateRange(e.startDate, e.endDate),
                      <StatusChip value={e.status} />,
                      <Typography className="text-[14px] font-bold text-navy">{e.leads ?? 0}</Typography>,
                      <Typography className="text-[13px] font-semibold text-navy">
                        {/* totalCost is rupees; formatPaise wants paise. */}
                        {formatPaise(e.totalCost * 100, { fallback: 'Not added' })}
                      </Typography>,
                      <View className="flex-row gap-2 justify-end">
                        <Pressable
                          onPress={() => router.push(`/(dash)/events/${e.id}/roi`)}
                          className="px-3 py-[7px] rounded-sm border border-hairline bg-white hover:border-blue"
                        >
                          <Typography className="text-[12.5px] font-semibold text-navy">ROI</Typography>
                        </Pressable>
                        {isAdmin ? (
                          <Pressable
                            onPress={() => router.push(`/(dash)/events/${e.id}/edit`)}
                            className="px-3 py-[7px] rounded-sm border border-hairline bg-white hover:border-blue"
                          >
                            <Typography className="text-[12.5px] font-semibold text-navy">Edit</Typography>
                          </Pressable>
                        ) : null}
                      </View>,
                    ]}
                  />
                </Pressable>
              ))}
            </>
          ) : (
            <Empty
              title={isLoading ? 'Loading events' : 'No events yet'}
              body={
                isLoading
                  ? 'One moment.'
                  : isAdmin
                    ? 'Create one and everything captured at it collects here.'
                    : 'An admin creates the event; once you are added to one it shows up here.'
              }
            />
          )}
        </Panel>
      </View>
    </DashShell>
  );
}
