import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { Button } from '../../../components/ui/Button';
import { CalendarIcon, ChevronDownIcon, PlusIcon } from '../../../components/ui/icons';
import { FilterSelectSheet, type FilterOption } from '../../../components/app/FilterSelectSheet';
import { TAB_BAR_HEIGHT } from '../../../components/app/TabBar';
import { STATUS_CLASSES, STATUS_LABEL, STATUS_TEXT, type EventStatus } from '../../../data/events';
import { MONTH_NAMES, overlapsMonthsYears } from '../../../lib/dates';
import { useEvents } from '../../../hooks/useEvents';
import { useLeadsStore } from '../../../stores/useLeadsStore';
import { useSessionStore } from '../../../stores/useSessionStore';

const GROUPS: EventStatus[] = ['live', 'upcoming', 'closed'];

const MONTH_OPTIONS: FilterOption[] = MONTH_NAMES.map((name, index) => ({
  value: String(index),
  label: name,
}));

/** Adds or removes one value, keeping the list in its natural order. */
function toggle(list: number[], value: number): number[] {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value].sort((a, b) => a - b);
}

/**
 * What the trigger and the empty state call the current selection.
 *
 * Naming one choice is worth it — "March" says more than "1 month". Past that
 * the names stop fitting in a half-width chip, so a count takes over.
 */
function describe(count: number, singleLabel: string, allLabel: string, noun: string): string {
  if (count === 0) return allLabel;
  if (count === 1) return singleLabel;
  return `${count} ${noun}s`;
}

export default function EventListScreen() {
  const isAdmin = useSessionStore((s) => s.user?.role === 'admin');
  const insets = useSafeAreaInsets();
  const { data: events, isLoading, isRefetching, error, refetch } = useEvents();

  /**
   * Which months and years the list is narrowed to. An EMPTY list is "all",
   * which is also the state both dropdowns start in.
   *
   * Multi-select because a rep comparing two shows wants both at once — March
   * and June, or 2025 and 2026 — and a single pick would make that two passes.
   *
   * Only one sheet id, so a second sheet can never mount while the first is
   * still dismissing — two overlapping modals leave iOS unresponsive.
   */
  const [months, setMonths] = useState<number[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [openSheet, setOpenSheet] = useState<'month' | 'year' | null>(null);

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
   */
  const { reset } = useLocalSearchParams<{ reset?: string }>();
  useEffect(() => {
    if (!reset) return;
    setMonths([]);
    setYears([]);
    router.setParams({ reset: '' });
  }, [reset]);

  /**
   * Only years that actually have an event, newest first — offering an empty
   * year would be offering a dead end.
   *
   * Both ends of the run count: a show over New Year belongs to the year it
   * started in and the one it finished in.
   */
  const yearOptions = useMemo(() => {
    const found = new Set<number>();
    for (const event of events ?? []) {
      const start = Number(event.startDate?.slice(0, 4));
      const end = Number(event.endDate?.slice(0, 4));
      if (Number.isFinite(start)) found.add(start);
      if (Number.isFinite(end)) found.add(end);
    }
    return [...found].sort((a, b) => b - a);
  }, [events]);

  /**
   * The years actually in force, which are not always the ones that were
   * picked.
   *
   * Delete the last 2024 event while 2024 is ticked and that year stops
   * existing; left alone, the trigger would keep counting it over a list that
   * can never again have anything in it. Narrowing here — rather than in an
   * effect — means the label and the filter read the same value and cannot
   * disagree for a render. Same guard `useEventSelection` applies to a stale
   * event selection.
   */
  const effectiveYears = useMemo(
    () => years.filter((y) => yearOptions.includes(y)),
    [years, yearOptions]
  );

  const visibleEvents = useMemo(
    () => (events ?? []).filter((e) => overlapsMonthsYears(e.startDate, e.endDate, months, effectiveYears)),
    [events, months, effectiveYears]
  );

  const clearFilter = () => {
    setMonths([]);
    setYears([]);
  };

  const monthLabel = describe(months.length, MONTH_NAMES[months[0]], 'All months', 'month');
  const yearLabel = describe(effectiveYears.length, String(effectiveYears[0]), 'All years', 'year');

  /**
   * How the empty state names what was asked for. One month of one year is the
   * common case and reads as a date — "No events in March 2026". Anything
   * wider gets the two halves separated, because "3 months 2026" does not read
   * as anything.
   */
  const rangeLabel =
    months.length === 1 && effectiveYears.length === 1
      ? `${MONTH_NAMES[months[0]]} ${effectiveYears[0]}`
      : [months.length ? monthLabel : null, effectiveYears.length ? yearLabel : null]
          .filter(Boolean)
          .join(' · ');

  /**
   * Captures still in the outbox, per event.
   *
   * `event.leads` is counted by the server and is right, but for a few seconds
   * after a scan — or for as long as there is no signal — it is legitimately
   * behind what the rep just did. Shown separately rather than added in: a
   * single merged total would be a number the server does not agree with, and
   * a lead that was inserted just as the response was lost would briefly be
   * counted twice.
   *
   * Selected raw and grouped here, never inside the selector — deriving in a
   * zustand selector returns a new object every render and loops.
   */
  const allLeads = useLeadsStore((s) => s.leads);
  const pendingByEvent = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const lead of allLeads) {
      if (lead.syncStatus !== 'draft') continue;
      counts[lead.eventId] = (counts[lead.eventId] ?? 0) + 1;
    }
    return counts;
  }, [allLeads]);

  /**
   * Nothing at all, versus nothing *here*.
   *
   * `isEmpty` reads the RAW list, so the two states are mutually exclusive: an
   * organisation with events that the filter has emptied gets told the filter
   * did it, never "no events yet", which would read as having lost them.
   */
  const isEmpty = !isLoading && !error && !events?.length;
  const noMatches = !isLoading && !error && Boolean(events?.length) && !visibleEvents.length;

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

      {showFilters ? (
        <View className="flex-row gap-2 px-5 pb-3 bg-white border-b border-hairline">
          <Pressable
            onPress={() => setOpenSheet('month')}
            accessibilityRole="button"
            accessibilityLabel={`Filter by month, currently ${monthLabel}`}
            // Background and border only. A class list that gains its first
            // shadow, ring or transform after the first render is what makes
            // NativeWind throw the bogus navigation error in AGENTS.md.
            className={`flex-1 flex-row items-center justify-between rounded-md border px-[14px] py-[9px] ${
              months.length === 0 ? 'border-hairline bg-surface' : 'border-navy/[0.25] bg-white'
            }`}
          >
            <Typography className="text-[13px] font-bold text-navy" numberOfLines={1}>
              {monthLabel}
            </Typography>
            <ChevronDownIcon size={14} />
          </Pressable>

          <Pressable
            onPress={() => setOpenSheet('year')}
            accessibilityRole="button"
            accessibilityLabel={`Filter by year, currently ${yearLabel}`}
            className={`flex-1 flex-row items-center justify-between rounded-md border px-[14px] py-[9px] ${
              effectiveYears.length === 0 ? 'border-hairline bg-surface' : 'border-navy/[0.25] bg-white'
            }`}
          >
            <Typography className="text-[13px] font-bold text-navy" numberOfLines={1}>
              {yearLabel}
            </Typography>
            <ChevronDownIcon size={14} />
          </Pressable>
        </View>
      ) : null}

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
          <View className="flex-1 items-center justify-center px-6 py-16">
            <View className="w-[62px] h-[62px] rounded-full bg-surface items-center justify-center">
              <CalendarIcon size={26} color="#0B132B" strokeWidth={1.6} />
            </View>
            <Typography className="text-[17px] font-extrabold text-navy text-center mt-4">
              No events in {rangeLabel}
            </Typography>
            <Typography className="text-[13.5px] text-slate text-center mt-2 leading-[1.5] max-w-[280px]">
              Your other shows are still here — widen the filter to see them.
            </Typography>
            <Button label="Show all events" onPress={clearFilter} className="mt-6" />
          </View>
        ) : null}

        {GROUPS.map((group) => {
          const items = visibleEvents.filter((e) => e.status === group);
          if (!items.length) return null;
          return (
            <View key={group}>
              <Typography className="text-[10.5px] font-bold tracking-[0.12em] text-slate mb-[10px]" style={{ textTransform: 'uppercase' }}>
                {STATUS_LABEL[group]}
              </Typography>
              {items.map((event) => (
                <Pressable
                  key={event.id}
                  onPress={() => router.push({ pathname: '/(app)/events/[id]/dashboard', params: { id: event.id } })}
                  className={`flex-row items-center gap-[14px] bg-white border rounded-2xl p-4 mb-3 ${event.status === 'live' ? 'border-gold/[0.45] shadow-[0_10px_24px_rgba(244,176,0,0.10)]' : 'border-hairline shadow-[0_10px_24px_rgba(244,176,0,0)]'}`}
                >
                  <View className={`w-11 h-11 rounded-xl items-center justify-center ${event.status === 'live' ? 'bg-navy' : 'bg-surface'}`}>
                    <CalendarIcon color={event.status === 'live' ? '#F4B000' : '#0B132B'} strokeWidth={1.75} />
                  </View>
                  <View className="flex-1">
                    <Typography className="text-[14.5px] font-bold text-navy">{event.name}</Typography>
                    <Typography className="text-[12px] text-slate mt-[2px]">{event.sub}</Typography>
                  </View>
                  <View className="items-end gap-[6px]">
                    <View className={`rounded-full px-[9px] py-[4px] ${STATUS_CLASSES[event.status]}`}>
                      <Typography className={`text-[10px] font-bold ${STATUS_TEXT[event.status]}`} style={{ textTransform: 'uppercase' }}>
                        {event.dayLabel ?? STATUS_LABEL[event.status]}
                      </Typography>
                    </View>
                    {event.leads ? (
                      <Typography className="text-[12px] font-bold text-navy">
                        {event.leads} leads
                      </Typography>
                    ) : null}
                    {pendingByEvent[event.id] ? (
                      <Typography className="text-[11px] font-semibold text-slate">
                        +{pendingByEvent[event.id]} syncing
                      </Typography>
                    ) : null}
                  </View>
                </Pressable>
              ))}
            </View>
          );
        })}
      </ScrollView>

      <FilterSelectSheet
        visible={openSheet === 'month'}
        onClose={() => setOpenSheet(null)}
        title="Which months?"
        allLabel="All months"
        options={MONTH_OPTIONS}
        selected={months.map(String)}
        onToggle={(value) => setMonths((current) => toggle(current, Number(value)))}
        onClear={() => setMonths([])}
      />

      <FilterSelectSheet
        visible={openSheet === 'year'}
        onClose={() => setOpenSheet(null)}
        title="Which years?"
        allLabel="All years"
        options={yearOptions.map((y) => ({ value: String(y), label: String(y) }))}
        // The EFFECTIVE years, so a year that has since stopped existing is not
        // shown ticked in a list that no longer offers it.
        selected={effectiveYears.map(String)}
        onToggle={(value) => setYears((current) => toggle(current, Number(value)))}
        onClear={() => setYears([])}
      />
    </SafeAreaView>
  );
}
