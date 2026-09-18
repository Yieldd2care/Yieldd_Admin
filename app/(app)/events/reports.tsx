import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { ScreenHeader } from '../../../components/app/ScreenHeader';
import { BarChartIcon } from '../../../components/ui/icons';
import { EventFilterBar, EventFilterEmptyState } from '../../../components/app/EventFilterBar';
import { EventGroupedList } from '../../../components/app/EventListCard';
import { useEventMonthYearFilter } from '../../../hooks/useEventMonthYearFilter';
import { useEvents } from '../../../hooks/useEvents';
import { usePendingLeadCounts } from '../../../hooks/usePendingLeadCounts';

/**
 * Which event's report to look at.
 *
 * The Reports tile on Home used to open the ROI screen of whichever event was
 * current, which meant a rep with six shows could only ever reach one of them
 * from Home. This is the same list the events tab shows — same filters, same
 * grouping, same cards — with a tap going to that event's ROI report instead of
 * its dashboard.
 *
 * No plan check here. Pro is gated at the tile that pushes this, which is how
 * `follow-ups` and the ROI screen itself are gated too; `useProGate.gate`
 * navigates when it refuses, which from a screen body would be a push during
 * render.
 */
export default function EventReportsScreen() {
  const insets = useSafeAreaInsets();
  const { data: events, isLoading, isRefetching, error, refetch } = useEvents();

  const filter = useEventMonthYearFilter(events);
  const pendingByEvent = usePendingLeadCounts();

  // Both read the RAW list, so "no events at all" and "none in this month" stay
  // mutually exclusive, and the filter never hides the control that undoes it.
  const isEmpty = !isLoading && !error && !events?.length;
  const noMatches = !isLoading && !error && Boolean(events?.length) && !filter.visibleEvents.length;
  const showFilters = !isLoading && !error && Boolean(events?.length);

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top']}>
      <ScreenHeader title="Reports" />

      <EventFilterBar show={showFilters} filter={filter} />

      <ScrollView
        contentContainerClassName="px-5 pt-4 flex-grow"
        // No TAB_BAR_HEIGHT: this screen is pushed over the tabs, so there is no
        // floating bar to clear and adding one would end the list short.
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
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
              <BarChartIcon size={26} color="#0B132B" strokeWidth={1.6} />
            </View>
            <Typography className="text-[17px] font-extrabold text-navy text-center mt-4">
              No reports yet
            </Typography>
            {/* Deliberately no "create an event" button: this screen is for
                reading results, and an admin already has that button one tab
                away. A rep cannot create one at all. */}
            <Typography className="text-[13.5px] text-slate text-center mt-2 leading-[1.5] max-w-[280px]">
              Reports appear once you have an event with leads in it.
            </Typography>
          </View>
        ) : null}

        {noMatches ? (
          <EventFilterEmptyState rangeLabel={filter.rangeLabel} onClear={filter.clearFilter} />
        ) : null}

        {filter.visibleEvents.length ? (
          <Typography className="text-[12.5px] text-slate mb-3 leading-[1.5]">
            Pick an event to see its ROI report.
          </Typography>
        ) : null}

        <EventGroupedList
          events={filter.visibleEvents}
          pendingByEvent={pendingByEvent}
          onPressEvent={(event) =>
            router.push({ pathname: '/(app)/events/[id]/roi', params: { id: event.id } })
          }
        />
      </ScrollView>
    </SafeAreaView>
  );
}
