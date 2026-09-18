import { Pressable, View } from 'react-native';

import { Typography } from '../ui/Typography';
import { Button } from '../ui/Button';
import { CalendarIcon, ChevronDownIcon } from '../ui/icons';
import { FilterSelectSheet, type FilterOption } from './FilterSelectSheet';
import { MONTH_NAMES } from '../../lib/dates';
import type { EventMonthYearFilter } from '../../hooks/useEventMonthYearFilter';

/**
 * The month and year dropdowns over a list of events, and the state for when
 * they have matched nothing.
 *
 * Shared by the events tab and the Reports picker. The arithmetic behind it is
 * `useEventMonthYearFilter`; this file is only the look and the two sheets.
 */

const MONTH_OPTIONS: FilterOption[] = MONTH_NAMES.map((name, index) => ({
  value: String(index),
  label: name,
}));

export function EventFilterBar({
  show,
  filter,
}: {
  /**
   * Whether to draw the triggers. The SHEETS ARE MOUNTED EITHER WAY: gate the
   * whole component instead and an open sheet unmounts the moment the list
   * behind it empties, leaving `openSheet` set with nothing on screen.
   */
  show: boolean;
  filter: EventMonthYearFilter;
}) {
  const { months, years, yearOptions, monthLabel, yearLabel, openSheet, setOpenSheet } = filter;

  return (
    <>
      {show ? (
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
              years.length === 0 ? 'border-hairline bg-surface' : 'border-navy/[0.25] bg-white'
            }`}
          >
            <Typography className="text-[13px] font-bold text-navy" numberOfLines={1}>
              {yearLabel}
            </Typography>
            <ChevronDownIcon size={14} />
          </Pressable>
        </View>
      ) : null}

      {/* Siblings of the row, never children of it — these are plain RN Modals,
          which react-native-web renders fixed-positioned. */}
      <FilterSelectSheet
        visible={openSheet === 'month'}
        onClose={() => setOpenSheet(null)}
        title="Which months?"
        allLabel="All months"
        options={MONTH_OPTIONS}
        selected={months.map(String)}
        onToggle={(value) => filter.toggleMonth(Number(value))}
        onClear={filter.clearMonths}
      />

      <FilterSelectSheet
        visible={openSheet === 'year'}
        onClose={() => setOpenSheet(null)}
        title="Which years?"
        allLabel="All years"
        options={yearOptions.map((y) => ({ value: String(y), label: String(y) }))}
        // The EFFECTIVE years, so a year that has since stopped existing is not
        // shown ticked in a list that no longer offers it.
        selected={years.map(String)}
        onToggle={(value) => filter.toggleYear(Number(value))}
        onClear={filter.clearYears}
      />
    </>
  );
}

/**
 * There are events, but not in the months and years that are ticked.
 *
 * Deliberately not the same state as having no events at all: telling someone
 * with twelve shows that they have none reads as lost data. The button is the
 * only way back from a selection that matches nothing.
 */
export function EventFilterEmptyState({
  rangeLabel,
  onClear,
}: {
  rangeLabel: string;
  onClear: () => void;
}) {
  return (
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
      <Button label="Show all events" onPress={onClear} className="mt-6" />
    </View>
  );
}
