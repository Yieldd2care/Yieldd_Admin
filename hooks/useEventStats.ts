import { useQuery } from '@tanstack/react-query';

import { fetchEventStats, fetchHourlyCapture, fetchLeaderboard } from '../lib/api/eventStats';
import { useSessionStore } from '../stores/useSessionStore';

export const statsKeys = {
  all: ['eventStats'] as const,
  stats: (eventId: string) => [...statsKeys.all, 'totals', eventId] as const,
  hourly: (eventId: string) => [...statsKeys.all, 'hourly', eventId] as const,
  leaderboard: (eventId: string) => [...statsKeys.all, 'leaderboard', eventId] as const,
};

export function useEventStats(eventId: string | undefined) {
  const signedIn = useSessionStore((s) => Boolean(s.user));

  return useQuery({
    queryKey: statsKeys.stats(eventId ?? 'none'),
    queryFn: () => fetchEventStats(eventId as string),
    enabled: Boolean(eventId) && signedIn,
    // Numbers on a stall move fast; a stale ROI figure is worse than a spinner.
    staleTime: 15_000,
  });
}

export function useHourlyCapture(eventId: string | undefined) {
  const signedIn = useSessionStore((s) => Boolean(s.user));

  return useQuery({
    queryKey: statsKeys.hourly(eventId ?? 'none'),
    queryFn: () => fetchHourlyCapture(eventId as string),
    enabled: Boolean(eventId) && signedIn,
    staleTime: 60_000,
  });
}

export function useLeaderboard(eventId: string | undefined) {
  const signedIn = useSessionStore((s) => Boolean(s.user));

  return useQuery({
    queryKey: statsKeys.leaderboard(eventId ?? 'none'),
    queryFn: () => fetchLeaderboard(eventId as string),
    enabled: Boolean(eventId) && signedIn,
    // The database refuses this outright when the event has the leaderboard
    // switched off for reps. That is an answer, not a network blip — retrying
    // it would just repeat the same refusal.
    retry: false,
    staleTime: 30_000,
  });
}
