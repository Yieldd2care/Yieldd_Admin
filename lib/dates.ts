/**
 * Date handling for events.
 *
 * Two shapes arrive here and they are not the same thing:
 *
 *   - `'2026-02-18'`          — a `date` column. A calendar day, no instant.
 *   - `'2026-02-18T00:00:00Z'` — an ISO datetime, which is what the wizard's
 *                                persisted draft holds (JSON has no Date).
 *
 * `new Date('2026-02-18')` parses as UTC midnight, so anyone west of Greenwich
 * renders the *previous* day. A trade show starting "18 Feb" must say 18 Feb
 * everywhere, so date-only strings are split by hand into a local date.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * The same twelve months written out, indexed 0–11 like `Date#getMonth`.
 *
 * Shared rather than declared per screen: the calendar sheet and the events
 * filter both label months, and two copies would eventually disagree about
 * where the abbreviation stops.
 */
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parses either shape into a local Date, or null. */
export function parseEventDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = DATE_ONLY.exec(value);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** `Date` → `'2026-02-18'`, using the local calendar day, for a `date` column. */
export function toDateOnly(value: Date | string | null | undefined): string | null {
  const date = value instanceof Date ? value : parseEventDate(value);
  if (!date) return null;
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Midnight local today, so day comparisons ignore the clock. */
function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * `18–22 Feb 2026`, collapsing the month and year when they repeat, which is
 * the overwhelmingly common case for a trade show.
 */
export function formatDateRange(
  start: string | Date | null | undefined,
  end: string | Date | null | undefined
): string {
  const from = start instanceof Date ? start : parseEventDate(start);
  if (!from) return '';
  const to = end instanceof Date ? end : parseEventDate(end);

  if (!to) return `${from.getDate()} ${MONTHS[from.getMonth()]} ${from.getFullYear()}`;

  const sameYear = from.getFullYear() === to.getFullYear();
  const sameMonth = sameYear && from.getMonth() === to.getMonth();

  if (sameMonth) {
    return `${from.getDate()}–${to.getDate()} ${MONTHS[to.getMonth()]} ${to.getFullYear()}`;
  }
  if (sameYear) {
    return `${from.getDate()} ${MONTHS[from.getMonth()]} – ${to.getDate()} ${MONTHS[to.getMonth()]} ${to.getFullYear()}`;
  }
  return `${from.getDate()} ${MONTHS[from.getMonth()]} ${from.getFullYear()} – ${to.getDate()} ${MONTHS[to.getMonth()]} ${to.getFullYear()}`;
}

/** `18–22 Feb` — the events list already carries the city, so the year is noise. */
export function formatShortDateRange(
  start: string | Date | null | undefined,
  end: string | Date | null | undefined
): string {
  return formatDateRange(start, end).replace(/ \d{4}$/, '');
}

/**
 * Where today sits relative to the event, as whole days.
 * Returns null if the dates are unusable.
 */
export function eventDayPosition(
  start: string | null | undefined,
  end: string | null | undefined
): { dayNumber: number; totalDays: number; isCurrent: boolean; hasEnded: boolean } | null {
  const from = parseEventDate(start);
  const to = parseEventDate(end) ?? from;
  if (!from || !to) return null;

  const DAY = 86_400_000;
  const today = startOfToday().getTime();
  const totalDays = Math.max(1, Math.round((to.getTime() - from.getTime()) / DAY) + 1);
  const dayNumber = Math.round((today - from.getTime()) / DAY) + 1;

  return {
    dayNumber,
    totalDays,
    isCurrent: dayNumber >= 1 && dayNumber <= totalDays,
    hasEnded: dayNumber > totalDays,
  };
}

/**
 * Does an event touch any of the months and years being filtered on?
 *
 * `months` holds 0–11 values like `Date#getMonth`, `years` holds full years,
 * and an EMPTY list means "any" for that half. So `([], [2026])` is the whole of
 * 2026, `([2], [])` is March in every year, `([2, 5], [2025, 2026])` is March or
 * June of either year, and `([], [])` matches everything.
 *
 * The two halves are AND-ed and each half is OR-ed within itself, which is how
 * a pair of multi-select dropdowns reads: "March or June" *of* "2025 or 2026".
 *
 * OVERLAP, NOT START DATE. A show running 28 Feb – 3 Mar belongs to February
 * *and* March; filtering to March and not finding the show you spent March at
 * reads as lost data. So the whole run is walked, not just its first day.
 *
 * FAILS OPEN. A date that cannot be parsed, an end before its start, or a span
 * long enough to look like corruption all return `true`. Hiding a row is how a
 * filter turns a data problem into an apparent deletion; showing one that does
 * not quite belong is merely untidy, and visible.
 */
export function overlapsMonthsYears(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  months: readonly number[],
  years: readonly number[]
): boolean {
  // The default state of both dropdowns. No parsing at all, so an unfiltered
  // list costs nothing to render.
  if (months.length === 0 && years.length === 0) return true;

  const from = parseEventDate(startDate);
  const to = parseEventDate(endDate) ?? from;
  if (!from || !to) return true;

  const matches = (y: number, m: number) =>
    (years.length === 0 || years.includes(y)) && (months.length === 0 || months.includes(m));

  let y = from.getFullYear();
  let m = from.getMonth();
  const lastY = to.getFullYear();
  const lastM = to.getMonth();

  // An end before its start is bad data, not an empty range — walking it would
  // step past the guard below and return false, hiding the event.
  if (lastY * 12 + lastM < y * 12 + m) return true;

  // A trade show is days long, so this runs once or twice. The cap is for a
  // corrupt row claiming decades; it fails open rather than spinning.
  for (let step = 0; step < 600; step++) {
    if (matches(y, m)) return true;
    if (y === lastY && m === lastM) return false;
    if (m === 11) {
      m = 0;
      y += 1;
    } else {
      m += 1;
    }
  }
  return true;
}

/**
 * `just now`, `2 hours ago`, `3 days ago` — how long ago something happened.
 *
 * Lives here rather than in an api module so a component can render it without
 * pulling in the supabase client. `relativeLabel()` in lib/api/team.ts delegates
 * to this and adds its prefix.
 */
export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';

  const minutes = Math.round((Date.now() - then) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}
