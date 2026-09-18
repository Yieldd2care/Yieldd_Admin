import { eventDayPosition, formatShortDateRange } from './dates';
import type { Event } from '../types/event';

/**
 * The secondary line under an event's name in a picker.
 *
 * `Bengaluru · Day 3 of 4` while the show is running, `Bengaluru · 18–22 Feb`
 * otherwise. Shared rather than copied per sheet: two sheets list events now —
 * `EventPickerSheet` (which show a lead is saved to) and `LeadScopeSheet`
 * (which show the list is displaying) — and two copies of this rule would
 * eventually disagree about how a running show is described.
 */
export function eventDetailLine(event: Event): string {
  const day = eventDayPosition(event.startDate, event.endDate);
  return [
    event.city,
    day?.isCurrent
      ? `Day ${day.dayNumber} of ${day.totalDays}`
      : formatShortDateRange(event.startDate, event.endDate),
  ]
    .filter(Boolean)
    .join(' · ');
}
