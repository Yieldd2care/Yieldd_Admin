import { useMemo } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { DashShell } from '../../components/dash/DashShell';
import { Cap, Empty, GoldButton, Panel, Row, Stat, StatusChip } from '../../components/dash/primitives';
import { Typography } from '../../components/ui/Typography';
import { useCurrentEvent } from '../../hooks/useEvents';
import { useEventStats, useHourlyCapture, useLeaderboard } from '../../hooks/useEventStats';
import { useLeadsStore } from '../../stores/useLeadsStore';
import { formatPaise } from '../../lib/db';

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

function hourLabel(h: number) {
  if (h === 12) return '12';
  return h > 12 ? String(h - 12) : String(h);
}

export default function DashHome() {
  const router = useRouter();
  const { event } = useCurrentEvent();
  const { data: stats } = useEventStats(event?.id);
  const { data: hourly } = useHourlyCapture(event?.id);
  const { data: board } = useLeaderboard(event?.id);

  // Selecting the array and deriving here, never inside the selector — a
  // selector that builds a new array on every call re-renders forever.
  const leads = useLeadsStore((s) => s.leads);
  const recent = useMemo(
    () => [...leads].sort((a, b) => (a.capturedAt < b.capturedAt ? 1 : -1)).slice(0, 5),
    [leads]
  );

  const byHour = useMemo(() => {
    const map = new Map((hourly ?? []).map((h) => [h.hour, h.count]));
    const counts = HOURS.map((h) => map.get(h) ?? 0);
    const peak = Math.max(1, ...counts);
    return HOURS.map((h, i) => ({ hour: h, count: counts[i], pct: (counts[i] / peak) * 100 }));
  }, [hourly]);

  const busiest = useMemo(() => byHour.reduce((a, b) => (b.count > a.count ? b : a), byHour[0]), [byHour]);

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <DashShell
      title="Home"
      subtitle={today}
      actions={<GoldButton label="Export leads" onPress={() => router.push('/(dash)/export')} />}
    >
      {!event ? (
        <Panel>
          <Empty
            title="No event yet"
            body="Create an event on the phone app and everything captured at it shows up here."
          />
        </Panel>
      ) : (
        <>
          <View className="flex-row items-center gap-3 mb-4">
            <View className="flex-row items-center gap-2 bg-surface rounded-full px-4 py-[9px]">
              <View className="w-[6px] h-[6px] rounded-full bg-success" />
              <Typography className="text-[12.5px] font-bold text-navy">{event.name}</Typography>
            </View>
            <StatusChip value={event.status} />
          </View>

          <View className="flex-row gap-4">
            <Stat label="Captured today" value={String(stats?.leadsToday ?? 0)} sub="At this event" />
            <Stat label="Total leads" value={String(stats?.totalLeads ?? 0)} sub={event.name} />
            <Stat label="Deals won" value={String(stats?.dealsWon ?? 0)} sub={formatPaise(stats?.wonValuePaise ?? null)} />
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
              <Typography className="text-[17px] font-bold text-navy">Team today</Typography>
              {board?.length ? (
                <View className="mt-4">
                  {board.slice(0, 5).map((r, i) => (
                    <View
                      key={r.profileId}
                      className={`flex-row items-center gap-3 py-[11px] ${
                        i === Math.min(board.length, 5) - 1 ? '' : 'border-b border-hairline'
                      }`}
                    >
                      <Typography
                        className={`w-[22px] text-[12px] font-extrabold ${i === 0 ? 'text-gold' : 'text-label'}`}
                      >
                        {i + 1}
                      </Typography>
                      <Typography className="flex-1 text-[13.5px] font-semibold text-navy" numberOfLines={1}>
                        {r.name}
                      </Typography>
                      <Typography className="text-[15px] font-extrabold text-navy">{r.leadCount}</Typography>
                    </View>
                  ))}
                </View>
              ) : (
                <Typography className="text-[13px] text-slate mt-4 leading-[1.5]">
                  The leaderboard is off for this event, or nobody has captured yet.
                </Typography>
              )}
            </Panel>
          </View>

          <Panel className="mt-4 overflow-hidden">
            <View className="px-[22px] py-[18px] border-b border-hairline">
              <Typography className="text-[17px] font-bold text-navy">Recent leads</Typography>
            </View>
            {recent.length ? (
              <>
                <Row cols={[1.4, 1.3, 0.8, 0.6]} header cells={['Name', 'Company', 'Captured by', 'Status']} />
                {recent.map((l, i) => (
                  <Row
                    key={l.id}
                    cols={[1.4, 1.3, 0.8, 0.6]}
                    last={i === recent.length - 1}
                    cells={[
                      <Typography className="text-[13.5px] font-semibold text-navy" numberOfLines={1}>
                        {l.name || 'Unnamed'}
                      </Typography>,
                      l.company || '—',
                      l.syncStatus === 'draft' ? 'Not synced' : '—',
                      <StatusChip value={l.status} />,
                    ]}
                  />
                ))}
              </>
            ) : (
              <Empty title="No leads yet" body="Leads captured on the phone appear here the moment they sync." />
            )}
          </Panel>
        </>
      )}
    </DashShell>
  );
}
