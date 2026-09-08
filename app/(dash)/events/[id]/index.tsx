import { useMemo } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { DashShell } from '../../../../components/dash/DashShell';
import { Cap, Empty, GhostButton, GoldButton, Panel, Stat, StatusChip } from '../../../../components/dash/primitives';
import { Typography } from '../../../../components/ui/Typography';
import { useEvent } from '../../../../hooks/useEvents';
import { useEventStats, useHourlyCapture, useLeaderboard } from '../../../../hooks/useEventStats';
import { useSessionStore } from '../../../../stores/useSessionStore';
import { eventSubtitle } from '../../../../lib/roiPdf';
import { formatPaise } from '../../../../lib/db';

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

function hourLabel(h: number) {
  return h === 12 ? '12' : h > 12 ? String(h - 12) : String(h);
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
      <View className="flex-row items-center gap-3 mb-4">
        <StatusChip value={event.status} />
        {event.stallNumber ? (
          <Typography className="text-[12.5px] text-slate">Stall {event.stallNumber}</Typography>
        ) : null}
      </View>

      <View className="flex-row gap-4">
        <Stat label="Captured today" value={String(stats?.leadsToday ?? 0)} sub="In the event's own timezone" />
        <Stat label="Total leads" value={String(stats?.totalLeads ?? 0)} sub="Across the whole show" />
        <Stat
          label="Deals won"
          value={String(stats?.dealsWon ?? 0)}
          // Null for a rep, and formatPaise renders that as a dash. Never 0 —
          // that would read as "this event made nothing".
          sub={formatPaise(stats?.wonValuePaise ?? null)}
        />
        <Stat label="Needs a note" value={String(stats?.needsNote ?? 0)} sub="Captured without context" />
      </View>

      <View className="flex-row gap-4 mt-4">
        <Panel className="flex-[1.45] px-[22px] py-5">
          <View className="flex-row items-center justify-between">
            <Typography className="text-[17px] font-bold text-navy">Capture by hour</Typography>
            <Typography className="text-[12px] text-slate font-medium">Today, 8am to 8pm</Typography>
          </View>
          <View className="flex-row items-end gap-[10px] h-[180px] mt-[22px]">
            {byHour.map((b) => (
              <View key={b.hour} className="flex-1 h-full justify-end items-center gap-2">
                <View
                  className="w-full rounded-t-md"
                  style={{
                    height: `${Math.max(b.pct, 2)}%`,
                    backgroundColor: b.count === 0 ? '#EEF1F7' : b.hour === busiest.hour ? '#F4B000' : '#1D3F8A',
                  }}
                />
                <Typography className="text-[10.5px] text-label font-semibold">{hourLabel(b.hour)}</Typography>
              </View>
            ))}
          </View>
          <View className="mt-4 pt-[14px] border-t border-hairline">
            <Typography className="text-[12.5px] text-slate">
              {busiest.count > 0
                ? `Busiest hour was ${hourLabel(busiest.hour)}${busiest.hour < 12 ? 'am' : 'pm'} with ${busiest.count} leads.`
                : 'Nothing captured yet today.'}
            </Typography>
          </View>
        </Panel>

        <Panel className="flex-1 px-[22px] py-5">
          <Typography className="text-[17px] font-bold text-navy">Leaderboard</Typography>
          {board?.length ? (
            <View className="mt-4">
              {board.map((r, i) => (
                <View
                  key={r.profileId}
                  className={`flex-row items-center gap-3 py-[11px] ${
                    i === board.length - 1 ? '' : 'border-b border-hairline'
                  }`}
                >
                  <Typography className={`w-[22px] text-[12px] font-extrabold ${i === 0 ? 'text-gold' : 'text-label'}`}>
                    {i + 1}
                  </Typography>
                  <View className="flex-1 min-w-0">
                    <Typography className="text-[13.5px] font-semibold text-navy" numberOfLines={1}>
                      {r.name}
                    </Typography>
                    <Typography className="text-[11.5px] text-label">
                      {r.dealsWon} won
                      {/* Null for a rep even when the board is shared — who
                          captured how many is the switch an admin flips, what
                          it is worth is not part of it. */}
                      {r.expectedValuePaise != null ? ` · ${formatPaise(r.expectedValuePaise)}` : ''}
                    </Typography>
                  </View>
                  <Typography className="text-[15px] font-extrabold text-navy">{r.leadCount}</Typography>
                </View>
              ))}
            </View>
          ) : (
            <Typography className="text-[13px] text-slate mt-4 leading-[1.5]">
              The leaderboard is not shared for this event, or nobody has captured yet.
            </Typography>
          )}
        </Panel>
      </View>

      <View className="flex-row gap-4 mt-4">
        <Panel className="flex-1 px-[22px] py-5">
          <Typography className="text-[17px] font-bold text-navy">How they were captured</Typography>
          <View className="flex-row gap-6 mt-4">
            <View className="flex-1">
              <Cap>With a voice note</Cap>
              <Typography className="text-[22px] font-extrabold text-navy mt-1">
                {stats?.withVoiceNote ?? 0}
              </Typography>
            </View>
            <View className="flex-1">
              <Cap>Consent recorded</Cap>
              <Typography className="text-[22px] font-extrabold text-navy mt-1">
                {stats?.consentGiven ?? 0}
              </Typography>
            </View>
            <View className="flex-1">
              <Cap>Still need a note</Cap>
              <Typography className="text-[22px] font-extrabold text-navy mt-1">{stats?.needsNote ?? 0}</Typography>
            </View>
          </View>
        </Panel>

        <Panel className="flex-1 px-[22px] py-5">
          <Typography className="text-[17px] font-bold text-navy">What the stall cost</Typography>
          <View className="flex-row items-baseline gap-3 mt-3">
            <Typography className="text-[26px] font-extrabold text-navy tracking-tight">
              {/* Event.totalCost is rupees; formatPaise wants paise. */}
              {formatPaise(event.totalCost * 100, { fallback: 'Not added' })}
            </Typography>
          </View>
          <Typography className="text-[12.5px] text-slate leading-[1.6] mt-2">
            {event.totalCost > 0
              ? 'Across seven lines — stall, fabrication, furniture, travel, staff, accommodation and marketing.'
              : 'Add it on the edit screen and the return works itself out.'}
          </Typography>
        </Panel>
      </View>
    </DashShell>
  );
}
