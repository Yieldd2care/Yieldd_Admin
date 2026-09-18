import { useEffect } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { Button } from '../../../components/ui/Button';
import { CalendarIcon, PlusIcon } from '../../../components/ui/icons';
import { EventFilterBar, EventFilterEmptyState } from '../../../components/app/EventFilterBar';
import { EventGroupedList } from '../../../components/app/EventListCard';
import { TAB_BAR_HEIGHT } from '../../../components/app/TabBar';
import { useEventMonthYearFilter } from '../../../hooks/useEventMonthYearFilter';
import { useEvents } from '../../../hooks/useEvents';
import { usePendingLeadCounts } from '../../../hooks/usePendingLeadCounts';
import { useSessionStore } from '../../../stores/useSessionStore';

export default function EventListScreen() {
  const isAdmin = useSessionStore((s) => s.user?.role === 'admin');
  const insets = useSafeAreaInsets();
  const { data: events, isLoading, isRefetching, error, refetch } = useEvents();

  /**
   * Which months and years the list is narrowed to. The state and the labels
   * live in the hook, so the Reports picker narrows its copy of this list by
   * exactly the same rules.
   */
  const filter = useEventMonthYearFilter(events);
  const pendingByEvent = usePendingLeadCounts();

  /**
   * Arriving from somewhere that promised the whole list clears the filter.
   *
   * `EventPickerSheet` has a "See all events" link and a "Go to Events" button
   * for a rep with nothing to capture into. This tab stays mounted, so without
   * this both would land on a list still narrowed to some month chosen days
   * ago — a link saying *all* that shows *none* reads as lost data.
   *
   * The param is cleared the moment it is applied, exactly as the leads tab
   * does with its own: a route param persists on a tab, so otherwise this would
   * fire again on an ordinary tab press and wipe a filter set by hand. Empty
   * string rather than `undefined`, because that is removal under every router
   * version rather than the string "undefined".
   *
   * Stays on the tab rather than moving into the hook: it exists *because* a
   * tab stays mounted, and the pushed Reports screen — which unmounts on back —
   * has no stale filter to clear.
   */
  const { reset } = useLocalSearchParams<{ reset?: string }>();
  const { clearFilter } = filter;
  useEffect(() => {
    if (!reset) return;
    clearFilter();
    router.setParams({ reset: '' });
  }, [reset, clearFilter]);

  /**
   * Nothing at all, versus nothing *here*.
   *
   * `isEmpty` reads the RAW list, so the two states are mutually exclusive: an
   * organisation with events that the filter has emptied gets told the filter
   * did it, never "no events yet", which would read as having lost them.
   */
  const isEmpty = !isLoading && !error && !events?.length;
  const noMatches = !isLoading && !error && Boolean(events?.length) && !filter.visibleEvents.length;

  /**
   * The filter row appears whenever there are events to filter — gated on the
   * raw list, NEVER on the filtered one. Hiding the control when it happens to
   * match nothing would take away the only thing that could undo it.
   */
  const showFilters = !isLoading && !error && Boolean(events?.length);

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top']}>
      <View className="flex-row items-center justify-between px-5 pt-[18px] pb-2 bg-white">
        <Typography className="text-[26px] font-extrabold text-navy tracking-[-0.01em]">Events</Typography>
        {/* Only an admin can create one — `events_admin_insert` refuses a rep,
            and an affordance that always fails is worse than no affordance. */}
        {isAdmin ? (
          <Pressable
            onPress={() => router.push('/(app)/events/new')}
            className="w-9 h-9 rounded-full bg-gold items-center justify-center shadow-[0_8px_18px_rgba(244,176,0,0.32)]"
          >
            <PlusIcon color="#0B132B" />
          </Pressable>
        ) : null}
      </View>

      {/* Always mounted, `show` only draws the triggers — see EventFilterBar. */}
      <EventFilterBar show={showFilters} filter={filter} />

      <ScrollView
        contentContainerClassName="px-5 pt-4 flex-grow"
        // The tab bar floats over the content, so the list has to end above it
        // or the last event card sits underneath and cannot be tapped.
        contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {isLoading ? (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator color="#F4B000" />
          </View>
        ) : null}

        {error ? (
          <View className="items-center justify-center py-16 px-6">
            <Typography className="text-[15px] font-bold text-navy text-center">
              Couldn&rsquo;t load your events
            </Typography>
            <Typography className="text-[13px] text-slate text-center mt-2 leading-[1.5]">
              You may be offline. Pull down to try again.
            </Typography>
          </View>
        ) : null}

        {isEmpty ? (
          <View className="flex-1 items-center justify-center px-6 py-16">
            <View className="w-[62px] h-[62px] rounded-full bg-surface items-center justify-center">
              <CalendarIcon size={26} color="#0B132B" strokeWidth={1.6} />
            </View>
            <Typography className="text-[17px] font-extrabold text-navy text-center mt-4">
              No events yet
            </Typography>
            <Typography className="text-[13.5px] text-slate text-center mt-2 leading-[1.5] max-w-[280px]">
              {isAdmin
                ? 'Set up your first show and your team can start scanning the moment they sign in.'
                : 'You will see an event here once an admin adds you to one.'}
            </Typography>
            {isAdmin ? (
              <Button
                label="Create your first event"
                onPress={() => router.push('/(app)/events/new')}
                className="mt-6"
              />
            ) : null}
          </View>
        ) : null}

        {noMatches ? (
          <EventFilterEmptyState rangeLabel={filter.rangeLabel} onClear={filter.clearFilter} />
        ) : null}

        <EventGroupedList
          events={filter.visibleEvents}
          pendingByEvent={pendingByEvent}
          onPressEvent={(event) =>
            router.push({ pathname: '/(app)/events/[id]/dashboard', params: { id: event.id } })
          }
        />
      </ScrollView>
    </SafeAreaView>
  );
}
