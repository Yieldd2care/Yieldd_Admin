import { useCallback, useMemo, useState } from 'react';

import { MONTH_NAMES, overlapsMonthsYears } from '../lib/dates';
import type { Event } from '../types/event';

/**
 * Narrowing a list of events to the months and years someone picked.
 *
 * Lives here rather than in the events tab because two screens now show that
 * list — the tab, and the Reports picker behind the home screen's Reports tile
 * — and a second copy of this would eventually disagree with the first about
 * what "All years" means.
 *
 * NO className STRINGS IN THIS FILE. Tailwind's content globs are `./app/**`
 * and `./components/**`, so a class written under `hooks/` is never compiled
 * and the style silently does not exist. The look belongs to
 * `components/app/EventFilterBar.tsx`; this is only the arithmetic.
 */

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

export interface EventMonthYearFilter {
  months: number[];
  /**
   * The EFFECTIVE years, which are not always the ones that were picked — see
   * the narrowing below. Exposed as the only year list on purpose, so a label
   * and a filter built from this can never disagree.
   */
  years: number[];
  yearOptions: number[];
  visibleEvents: Event[];
  monthLabel: string;
  yearLabel: string;
  rangeLabel: string;
  openSheet: 'month' | 'year' | null;
  setOpenSheet: (sheet: 'month' | 'year' | null) => void;
  toggleMonth: (value: number) => void;
  toggleYear: (value: number) => void;
  clearMonths: () => void;
  clearYears: () => void;
  clearFilter: () => void;
}

export function useEventMonthYearFilter(events: Event[] | undefined): EventMonthYearFilter {
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

  // Stable identities, so the events tab's `reset` effect can depend on
  // `clearFilter` without re-firing on every render.
  const toggleMonth = useCallback((value: number) => {
    setMonths((current) => toggle(current, value));
  }, []);
  const toggleYear = useCallback((value: number) => {
    setYears((current) => toggle(current, value));
  }, []);
  const clearMonths = useCallback(() => setMonths([]), []);
  const clearYears = useCallback(() => setYears([]), []);
  const clearFilter = useCallback(() => {
    setMonths([]);
    setYears([]);
  }, []);

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

  return {
    months,
    years: effectiveYears,
    yearOptions,
    visibleEvents,
    monthLabel,
    yearLabel,
    rangeLabel,
    openSheet,
    setOpenSheet,
    toggleMonth,
    toggleYear,
    clearMonths,
    clearYears,
    clearFilter,
  };
}
