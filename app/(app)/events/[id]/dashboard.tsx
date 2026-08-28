import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';

import { Typography } from '../../../../components/ui/Typography';
import { Toggle } from '../../../../components/ui/Toggle';
import { ScreenHeader } from '../../../../components/app/ScreenHeader';
import { RefreshIcon } from '../../../../components/ui/icons';
import { useEvent, useUpdateEvent } from '../../../../hooks/useEvents';
import { useEventStats, useHourlyCapture, useLeaderboard } from '../../../../hooks/useEventStats';
import { useSessionStore } from '../../../../stores/useSessionStore';
import { relativeLabel } from '../../../../lib/api/team';

/** `9am`, `12pm`, `5pm` — hour labels people read without converting. */
function hourLabel(hour: number): string {
  if (hour === 0) return '12am';
  if (hour === 12) return '12pm';
  return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
}

function initialOf(name: string): string {
  return name.trim()[0]?.toUpperCase() ?? '?';
}

export default function EventDashboardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = id ?? '';
  const { data: event } = useEvent(eventId || undefined);
  const updateEvent = useUpdateEvent();
  const isAdmin = useSessionStore((s) => s.user?.role === 'admin');

  const { data: stats, isLoading, isRefetching, refetch, dataUpdatedAt } = useEventStats(
    eventId || undefined
  );
  const { data: hourly } = useHourlyCapture(eventId || undefined);
  const { data: leaderboard, error: leaderboardError } = useLeaderboard(eventId || undefined);

  const isClosed = event?.status === 'closed';
  const isUpcoming = event?.status === 'upcoming';

  // Optimistic locally so the switch does not lag behind the finger, but the
  // event row is what it actually reads from — the toggle gates the roster for
  // every rep in `event_members_select`, so it cannot be screen-local state.
  const [leaderboardOverride, setLeaderboardOverride] = useState<boolean | null>(null);
  const leaderboardVisible = leaderboardOverride ?? event?.leaderboardVisibleToReps ?? true;
  const setLeaderboardVisible = (value: boolean) => {
    setLeaderboardOverride(value);
    if (eventId) {
      updateEvent.mutate(
        { id: eventId, leaderboardVisibleToReps: value },
        { onError: () => setLeaderboardOverride(null) }
      );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
      <ScreenHeader
        title={event?.name ?? 'Event'}
        right={
          <Pressable
            onPress={() => refetch()}
            className="w-[34px] h-[34px] rounded-md bg-surface items-center justify-center"
          >
            {isRefetching ? <ActivityIndicator size="small" color="#0B132B" /> : <RefreshIcon />}
          </Pressable>
        }
      />

      <ScrollView
        contentContainerClassName="px-5 pt-[18px] pb-8"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <View className="flex-row items-center gap-[6px] mb-[14px]">
          <View className="w-[6px] h-[6px] rounded-full bg-success" />
          <Typography className="text-[11.5px] font-bold text-slate">
            {dataUpdatedAt ? relativeLabel(new Date(dataUpdatedAt).toISOString(), 'Updated') : 'Loading…'}
          </Typography>
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1 rounded-2xl p-4" style={{ backgroundColor: '#101C3E' }}>
            <Typography className="text-[26px] font-extrabold text-white tracking-[-0.01em]">
              {isLoading ? '—' : stats?.leadsToday ?? 0}
            </Typography>
            {/* "Today" is the event's own day in its own timezone, worked out
                on the server — a show in Bengaluru rolls over at midnight IST
                for everyone looking at it, wherever their phone is. */}
            <Typography className="text-[11.5px] text-white/[0.55] mt-[3px]">Leads today</Typography>
          </View>
          <View className="flex-1 bg-white border border-hairline rounded-2xl p-4">
            <Typography className="text-[26px] font-extrabold text-navy tracking-[-0.01em]">
              {isLoading ? '—' : stats?.totalLeads ?? 0}
            </Typography>
            <Typography className="text-[11.5px] text-slate mt-[3px]">Cumulative</Typography>
          </View>
        </View>

        <Typography className="text-[10px] font-bold tracking-[0.12em] text-slate mt-[22px] mb-3" style={{ textTransform: 'uppercase' }}>
          Capture rate by hour
        </Typography>
        <View className="bg-white border border-hairline rounded-2xl p-4">
          {/*
            Only the hours a stall is actually open, 8am to 8pm. The full 24 are
            fetched so nothing is lost, but a chart with twelve dead bars either
            side makes a busy afternoon look like a flat line. Bar heights are a
            share of the busiest hour, and the busiest hour is highlighted.
          */}
          {(() => {
            const window = (hourly ?? []).filter((h) => h.hour >= 8 && h.hour <= 20);
            const peak = Math.max(...window.map((h) => h.count), 0);
            const anyCaptured = peak > 0;

            return (
              <>
                <View className="flex-row items-end gap-[6px]" style={{ height: 70 }}>
                  {window.map((h) => (
                    <View
                      key={h.hour}
                      className={`flex-1 rounded-t-[4px] ${anyCaptured && h.count === peak ? 'bg-gold' : 'bg-surface'}`}
                      // A minimum sliver so an hour with one lead is still
                      // visible, and a floor of 0 when nothing was captured.
                      style={{ height: anyCaptured ? `${Math.max(4, (h.count / peak) * 100)}%` : 2 }}
                    />
                  ))}
                </View>
                <View className="flex-row justify-between mt-2">
                  {[9, 11, 13, 15, 17].map((h) => (
                    <Typography key={h} className="text-[9.5px] font-semibold text-slate">
                      {hourLabel(h)}
                    </Typography>
                  ))}
                </View>
                {!anyCaptured ? (
                  <Typography className="text-[12px] text-slate text-center mt-3">
                    Nothing captured today yet.
                  </Typography>
                ) : null}
              </>
            );
          })()}
        </View>

        <View className="flex-row items-center justify-between mt-[22px] mb-3">
          <Typography className="text-[10px] font-bold tracking-[0.12em] text-slate" style={{ textTransform: 'uppercase' }}>
            Rep-wise leaderboard
          </Typography>
          {/* Only an admin can flip this — `events_admin_update` refuses a rep,
              so showing them a switch would only produce an error. */}
          {isAdmin ? (
            <View className="flex-row items-center gap-2">
              <Typography className="text-[11px] font-bold text-slate">Visible to reps</Typography>
              <Toggle value={leaderboardVisible} onValueChange={setLeaderboardVisible} />
            </View>
          ) : null}
        </View>
        <View className="bg-white border border-hairline rounded-2xl px-4">
          {leaderboardError ? (
            <Typography className="text-[12.5px] text-slate text-center py-5 leading-[1.5]">
              The leaderboard is not shared for this event.
            </Typography>
          ) : !leaderboard?.length ? (
            <Typography className="text-[12.5px] text-slate text-center py-5">
              No one has captured a lead yet.
            </Typography>
          ) : (
            leaderboard.map((rep, i) => (
              <View
                key={rep.profileId}
                className={`flex-row items-center gap-3 py-3 ${i < leaderboard.length - 1 ? 'border-b border-section' : ''}`}
              >
                <Typography className={`w-[18px] text-[12.5px] font-extrabold ${i === 0 ? 'text-gold' : 'text-slate'}`}>
                  {i + 1}
                </Typography>
                <View className="w-8 h-8 rounded-[9px] bg-surface items-center justify-center">
                  <Typography className="text-[12.5px] font-extrabold text-navy">
                    {initialOf(rep.name)}
                  </Typography>
                </View>
                <View className="flex-1">
                  <Typography className="text-[13px] font-semibold text-navy">{rep.name}</Typography>
                  {rep.dealsWon > 0 ? (
                    <Typography className="text-[11px] text-slate mt-[1px]">
                      {rep.dealsWon} won
                    </Typography>
                  ) : null}
                </View>
                <Typography className="text-[13px] font-bold text-navy">{rep.leadCount}</Typography>
              </View>
            ))
          )}
        </View>

        <View className="mt-6 gap-3">
          {!isClosed ? (
            <Pressable
              onPress={() => router.push({ pathname: '/(app)/events/[id]/fields', params: { id: eventId } })}
              className="h-[52px] rounded-md border border-hairline bg-white items-center justify-center"
            >
              <Typography className="text-[14.5px] font-bold text-navy">Manage custom fields</Typography>
            </Pressable>
          ) : null}

          {!isUpcoming ? (
            <Pressable
              onPress={() => router.push({ pathname: '/(app)/events/[id]/export', params: { id: eventId } })}
              className="h-[52px] rounded-md border border-hairline bg-white items-center justify-center"
            >
              <Typography className="text-[14.5px] font-bold text-navy">Export leads</Typography>
            </Pressable>
          ) : null}

          <Pressable
            onPress={() => router.push({ pathname: '/(app)/events/[id]/roi', params: { id: eventId } })}
            className="h-[52px] rounded-md bg-navy items-center justify-center"
          >
            <Typography className="text-[14.5px] font-bold text-white">View ROI dashboard</Typography>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
