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
