import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { DashShell } from '../../../../components/dash/DashShell';
import {
  Empty,
  GhostButton,
  GoldButton,
  Panel,
  SectionTitle,
  Stat,
  StatusChip,
} from '../../../../components/dash/primitives';
import { Hero, HeroMetric, HeroMetrics, HeroTitle } from '../../../../components/dash/hero';
import { Avatar, Icon, ICON, ProgressBar } from '../../../../components/dash/controls';
import { Typography } from '../../../../components/ui/Typography';
import { useEvent } from '../../../../hooks/useEvents';
import { useEventStats, useHourlyCapture, useLeaderboard } from '../../../../hooks/useEventStats';
import { useSessionStore } from '../../../../stores/useSessionStore';
import { eventSubtitle } from '../../../../lib/roiPdf';
import { formatPaise } from '../../../../lib/db';

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

/** Non-peak capture bars. Pale enough to recede, dark enough to be a bar. */
const BAR_IDLE = '#93A8CB';

function hourLabel(h: number) {
  return h === 12 ? '12' : h > 12 ? String(h - 12) : String(h);
}

function isoDay(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function DashEventDashboard() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = id ?? '';
  const isAdmin = useSessionStore((s) => s.user?.role === 'admin');

  const { data: event, isLoading } = useEvent(eventId || undefined);
  const { data: stats } = useEventStats(eventId || undefined);
  const { data: hourly } = useHourlyCapture(eventId || undefined);
  const { data: board } = useLeaderboard(eventId || undefined);

  const byHour = useMemo(() => {
    const map = new Map((hourly ?? []).map((h) => [h.hour, h.count]));
    const counts = HOURS.map((h) => map.get(h) ?? 0);
    const peak = Math.max(1, ...counts);
    return HOURS.map((h, i) => ({ hour: h, count: counts[i], pct: (counts[i] / peak) * 100 }));
  }, [hourly]);

  const busiest = useMemo(() => byHour.reduce((a, b) => (b.count > a.count ? b : a), byHour[0]), [byHour]);

  /** Today in the browser's own timezone — the day the person is standing in. */
  const todayKey = useMemo(() => isoDay(new Date()), []);

  /**
   * Every number on this page opens the rows behind it, on the Leads screen,
   * already narrowed — and always pinned to this event, because that is the only
   * thing this page is about. Built as a query STRING: the object form of
   * router.push silently drops these keys.
   */
  const openLeads = (focus: { status?: string; rep?: string; hour?: number; on?: string; filter?: string }) => {
    const query = new URLSearchParams();
    if (focus.status) query.set('status', focus.status);
    if (focus.rep) query.set('rep', focus.rep);
    if (focus.hour !== undefined) query.set('hour', String(focus.hour));
    if (focus.on) query.set('on', focus.on);
    if (focus.filter) query.set('filter', focus.filter);
    query.set('event', eventId);
    router.push(`/(dash)/leads?${query.toString()}`);
  };

  if (!event) {
    return (
      <DashShell title="Event" breadcrumb={[{ label: 'Events', href: '/(dash)/events' }]}>
        <Panel>
          <Empty
            title={isLoading ? 'Loading' : 'Event not found'}
            body={isLoading ? 'One moment.' : 'It may have been deleted, or you are not on it.'}
          />
        </Panel>
      </DashShell>
    );
  }

  return (
    <DashShell
      title={event.name}
      subtitle={eventSubtitle(event)}
      breadcrumb={[{ label: 'Events', href: '/(dash)/events' }]}
      actions={
        <>
          {isAdmin ? (
            <GhostButton label="Edit event" onPress={() => router.push(`/(dash)/events/${event.id}/edit`)} />
          ) : null}
          <GoldButton label="View ROI" onPress={() => router.push(`/(dash)/events/${event.id}/roi`)} />
        </>
      }
    >
      {/*
        The live view during the show. The money lives one screen over on ROI, so
        the band here carries what is moving right now — what has been captured,
        and what came in today.
      */}
      <Hero>
        <View className="flex-row items-start gap-10">
          <View className="flex-1 min-w-0">
            <HeroTitle
              title={event.name}
              live={event.status === 'live'}
              sub={`${eventSubtitle(event)}${event.stallNumber ? ` · Stall ${event.stallNumber}` : ''}${
                event.dayLabel ? ` · ${event.dayLabel}` : ''
              }`}
            />
          </View>
          <HeroMetrics>
            <HeroMetric
              label="Total leads"
              value={String(stats?.totalLeads ?? 0)}
              note="Across the whole show"
              onPress={() => openLeads({})}
            />
            <HeroMetric
              label="Captured today"
              value={String(stats?.leadsToday ?? 0)}
              note="In the event's own timezone"
              onPress={() => openLeads({ on: todayKey })}
            />
            <HeroMetric
              label="Deals won"
              value={String(stats?.dealsWon ?? 0)}
              // Money is null for a rep by design, and a lone dash hanging under
              // the number reads as a missing value rather than a withheld one —
              // so the line is simply not there. Never 0, which would say "this
              // event made nothing".
              note={stats?.wonValuePaise != null ? `${formatPaise(stats.wonValuePaise)} attributed` : undefined}
              onPress={() => openLeads({ status: 'Won' })}
            />
          </HeroMetrics>
        </View>
      </Hero>

      <View className="flex-row items-center gap-3 mt-6 mb-3">
        <StatusChip value={event.status} />
        <Typography className="text-[12.5px] text-slate">
          {stats?.totalLeads ? `${stats.totalLeads} captured so far` : 'Nothing captured yet'}
        </Typography>
      </View>

      {/* The operational counts: each one is a job, and each opens exactly the
          rows that job is about. */}
      <View className="flex-row gap-6">
        <Stat
          label="Needs a note"
          value={String(stats?.needsNote ?? 0)}
          sub="Captured without context"
          icon={<Icon d={ICON.note} size={16} color="#0B132B" />}
          onPress={() => openLeads({ filter: 'note' })}
        />
        <Stat
          label="Consent recorded"
          value={String(stats?.consentGiven ?? 0)}
          sub="Agreed to a follow-up"
          icon={<Icon d={ICON.check} size={16} color="#0B132B" />}
          onPress={() => openLeads({ filter: 'consent' })}
        />
        <Stat
          label="With a voice note"
          value={String(stats?.withVoiceNote ?? 0)}
          sub="Spoken, not typed"
          icon={<Icon d={ICON.sparkle} size={16} color="#0B132B" />}
        />
        <Stat
          label="What the stall cost"
          // Event.totalCost is rupees; formatPaise wants paise.
          value={formatPaise(event.totalCost * 100, { fallback: 'Not added' })}
          sub={event.totalCost > 0 ? 'Across seven cost lines' : 'Add it and the return works itself out'}
          icon={<Icon d={ICON.building} size={16} color="#0B132B" />}
          onPress={isAdmin ? () => router.push(`/(dash)/events/${event.id}/edit`) : undefined}
        />
      </View>

      <View className="flex-row gap-6 mt-6 items-stretch">
        <Panel className="flex-[1.45] px-6 py-6">
          <SectionTitle
            title="Capture by hour"
            right={<Typography className="text-[12px] text-slate font-medium">Today, 8am to 8pm</Typography>}
          />
          <Typography className="text-[13px] text-ink-muted leading-[1.55] mt-[6px]">
            {busiest.count > 0
              ? `Busiest at ${hourLabel(busiest.hour)}${busiest.hour < 12 ? 'am' : 'pm'}. Click an hour to open those leads.`
              : 'Nothing captured yet today.'}
          </Typography>

          <View className="mt-auto pt-[38px]">
            {busiest.count === 0 ? (
              <View className="h-[160px] items-center justify-center rounded-md bg-section">
                <Typography className="text-[12.5px] text-slate">
                  The first capture of the day will show up here.
                </Typography>
              </View>
            ) : (
              <View className="flex-row items-end gap-[10px] h-[160px]">
                {byHour.map((b) => (
                  // The whole column is the target, not just the coloured part.
                  // A one-lead hour is a three-pixel stub, and the empty space
                  // above it means the same thing. An hour with nothing in it is
                  // not pressable at all — an empty list is a worse answer than
                  // the bar staying put.
                  <Pressable
                    key={b.hour}
                    disabled={b.count === 0}
                    onPress={() => openLeads({ hour: b.hour, on: todayKey })}
                    className="flex-1 h-full justify-end items-center"
                  >
                    <View
                      className="w-full rounded-t-md"
                      style={{
                        height: `${Math.max(b.pct, 2)}%`,
                        backgroundColor:
                          b.count === 0 ? '#EEF1F7' : b.hour === busiest.hour ? '#F4B000' : BAR_IDLE,
                      }}
                    >
                      {b.hour === busiest.hour && b.count > 0 ? (
                        <View className="absolute items-center" style={{ bottom: '100%', left: -60, right: -60 }}>
                          <View className="rounded-full bg-navy-elevated px-3 py-[6px] mb-[9px]">
                            <Typography className="text-[11px] font-bold text-white">
                              {b.count} {b.count === 1 ? 'lead' : 'leads'}
                            </Typography>
                          </View>
                        </View>
                      ) : null}
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
            {busiest.count > 0 ? (
              <>
                <View className="h-px bg-hairline mt-[10px]" />
                <View className="flex-row gap-[10px] mt-[9px]">
                  {byHour.map((b) => (
                    <Typography
                      key={b.hour}
                      className="flex-1 text-[10.5px] text-label font-semibold text-center"
                    >
                      {hourLabel(b.hour)}
                    </Typography>
                  ))}
                </View>
              </>
            ) : null}
          </View>
        </Panel>

        <Panel className="flex-1 px-6 py-6">
          <SectionTitle
            title="Leaderboard"
            right={
              board?.length ? (
                <Typography className="text-[12px] text-slate font-medium">
                  {board.reduce((n, r) => n + r.leadCount, 0)} leads
                </Typography>
              ) : undefined
            }
          />
          {board?.length ? (
            <View className="mt-3">
              {board.map((r, i) => {
                const top = board[0]?.leadCount || 1;
                return (
                  <Pressable
                    key={r.profileId}
                    disabled={r.leadCount === 0}
                    onPress={() => openLeads({ rep: r.profileId })}
                    className="flex-row items-center gap-3 py-[7px]"
                  >
                    <Avatar name={r.name} size={30} tone={i === 0 ? 'gold' : 'surface'} />
                    <View className="flex-1 min-w-0">
                      <View className="flex-row items-baseline justify-between gap-2">
                        <Typography className="text-[13px] font-semibold text-navy flex-1 min-w-0" numberOfLines={1}>
                          {r.name}
                        </Typography>
                        <Typography className="text-[13px] font-bold text-navy">{r.leadCount}</Typography>
                      </View>
                      <View className="mt-[6px]">
                        <ProgressBar
                          pct={(r.leadCount / top) * 100}
                          color={i === 0 ? '#F4B000' : BAR_IDLE}
                          height={6}
                        />
                      </View>
                      <Typography className="text-[11.5px] text-slate mt-[5px]">
                        {r.dealsWon} won
                        {/* Null for a rep even when the board is shared — who
                            captured how many is the switch an admin flips, what
                            it is worth is not part of it. */}
                        {r.expectedValuePaise != null ? ` · ${formatPaise(r.expectedValuePaise)}` : ''}
                      </Typography>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Typography className="text-[13px] text-slate mt-4 leading-[1.5]">
              The leaderboard is not shared for this event, or nobody has captured yet.
            </Typography>
          )}
        </Panel>
      </View>
    </DashShell>
  );
}
