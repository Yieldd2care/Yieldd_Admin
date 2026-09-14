import { useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createEvent,
  fetchEvent,
  fetchEvents,
  reconcileEventStatuses,
  updateEvent,
  type CreateEventInput,
  type EventWriteContext,
  type UpdateEventInput,
} from '../lib/api/events';
import { useSessionStore } from '../stores/useSessionStore';
import { useCurrentEventStore } from '../stores/useCurrentEventStore';
import { useEventSelectionStore } from '../stores/useEventSelectionStore';
import type { Event } from '../types/event';

export const eventKeys = {
  all: ['events'] as const,
  list: () => [...eventKeys.all, 'list'] as const,
  detail: (id: string) => [...eventKeys.all, 'detail', id] as const,
};

/**
 * Every event the signed-in person can see — the whole organisation's for an
 * admin, only the ones they are a member of for a rep. That split is RLS's job,
 * not a filter here.
 */
export function useEvents() {
  const enabled = useSessionStore((s) => Boolean(s.user));
  const isAdmin = useSessionStore((s) => s.user?.role === 'admin');

  const query = useQuery({
    queryKey: eventKeys.list(),
    queryFn: fetchEvents,
    enabled,
  });

  // An event whose dates have passed still says 'upcoming' in the column, and
  // that column is what the Free plan's one-event limit counts. Catching it up
  // here — after the data is on screen, never blocking it — is what stops a
  // finished show locking an organisation out of creating the next one.
  const events = query.data;
  useEffect(() => {
    if (!isAdmin || !events?.length) return;
    if (!events.some((e) => e.status !== e.storedStatus)) return;
    let cancelled = false;
    reconcileEventStatuses(events).then((updated) => {
      if (updated && !cancelled) query.refetch();
    });
    return () => {
      cancelled = true;
    };
    // `query.refetch` is stable; events is the real trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, isAdmin]);

  return query;
}

export function useEvent(id: string | undefined) {
  return useQuery({
    queryKey: eventKeys.detail(id ?? 'none'),
    queryFn: () => fetchEvent(id as string),
    enabled: Boolean(id),
  });
}

/**
 * The event the app is working in: whichever one was picked, otherwise the one
 * running now, otherwise the next one due.
 *
 * A stale pick — an event that was deleted, or that a rep was removed from —
 * falls back rather than leaving the home screen blank.
 */
export function useCurrentEvent(): { event: Event | undefined; isLoading: boolean } {
  const { data, isLoading } = useEvents();
  const selectedId = useCurrentEventStore((s) => s.selectedEventId);

  const event = useMemo(() => {
    if (!data?.length) return undefined;
    const picked = selectedId ? data.find((e) => e.id === selectedId) : undefined;
    return (
      picked ??
      data.find((e) => e.status === 'live') ??
      // fetchEvents sorts newest first, so the *soonest* upcoming one is last.
      [...data].reverse().find((e) => e.status === 'upcoming') ??
      data[0]
    );
  }, [data, selectedId]);

  return { event, isLoading };
}

/**
 * Which events the across-events figures on Home cover.
 *
 * The stored selection is always resolved against the list this viewer can
 * actually see before it reaches the database, for two reasons that are easy to
 * miss:
 *
 * - `event_set_stats` refuses the whole call if any id is not the caller's, so
 *   one deleted event — or one a rep was removed from — sitting in a persisted
 *   selection would strand the panel on an error with no way back. Narrowing
 *   here is visible: the picker list and its label both change with it.
 * - A selection that has gone empty falls back to all, so there is never a
 *   state where the section is scoped to nothing and says nothing.
 *
 * The server keeps its refusal regardless. This is the stale-data path, not the
 * permission check.
 */
export function useEventSelection(): {
  events: Event[];
  selectedIds: string[];
  isAll: boolean;
  isLoading: boolean;
  setSelection: (ids: string[] | null) => void;
} {
  const { data, isLoading } = useEvents();
  // Selected raw and derived below, never derived inside the selector — a
  // selector that builds a new array on every call re-renders without end.
  const stored = useEventSelectionStore((s) => s.selectedEventIds);
  const setSelection = useEventSelectionStore((s) => s.selectEvents);

  const events = useMemo(() => data ?? [], [data]);

  const selectedIds = useMemo(() => {
    const all = events.map((e) => e.id);
    if (!stored) return all;
    // Intersected in list order, so the ids and the ticks always agree.
    const kept = all.filter((id) => stored.includes(id));
    return kept.length > 0 ? kept : all;
  }, [events, stored]);

  return {
    events,
    selectedIds,
    isAll: selectedIds.length === events.length,
    isLoading,
    setSelection,
  };
}

/**
 * What a row-level-security refusal has to be explained with. The database
 * gives back one undifferentiated 42501 whatever the reason, so the reason is
 * reconstructed here from things the client already knows.
 */
export function useEventWriteContext(): EventWriteContext {
  const user = useSessionStore((s) => s.user);
  const { data } = useEvents();

  return {
    isAdmin: user?.role === 'admin',
    isPro: user?.planTier === 'pro',
    // Counts the stored status, exactly as active_event_count() does.
    hasActiveEvent: Boolean(
      data?.some((e) => e.storedStatus === 'upcoming' || e.storedStatus === 'live')
    ),
  };
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  const user = useSessionStore((s) => s.user);
  const context = useEventWriteContext();

  return useMutation({
    mutationFn: (input: Omit<CreateEventInput, 'organizationId' | 'createdBy'>) => {
      if (!user) throw new Error('You need to be signed in to create an event.');
      return createEvent(
        { ...input, organizationId: user.organizationId, createdBy: user.id },
        context
      );
    },
    onSuccess: (event) => {
      queryClient.setQueryData(eventKeys.detail(event.id), event);
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  const context = useEventWriteContext();

  return useMutation({
    mutationFn: ({ id, ...input }: UpdateEventInput & { id: string }) =>
      updateEvent(id, input, context),
    onSuccess: (event) => {
      queryClient.setQueryData(eventKeys.detail(event.id), event);
      queryClient.invalidateQueries({ queryKey: eventKeys.list() });
    },
  });
}
