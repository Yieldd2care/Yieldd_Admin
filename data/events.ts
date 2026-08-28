/**
 * Presentation for event status.
 *
 * The mock `EVENTS` array that used to live here is gone — events come from the
 * database now (`hooks/useEvents.ts`). What is left is the styling, which is
 * genuinely UI and has no business in a query layer.
 */

export type { Event, EventStatus } from '../types/event';
import type { EventStatus } from '../types/event';

export const STATUS_LABEL: Record<EventStatus, string> = {
  live: 'Live',
  upcoming: 'Upcoming',
  closed: 'Closed',
};

export const STATUS_CLASSES: Record<EventStatus, string> = {
  live: 'bg-gold/[0.16]',
  upcoming: 'bg-blue/[0.10]',
  closed: 'bg-surface',
};

export const STATUS_TEXT: Record<EventStatus, string> = {
  live: 'text-[#8A6100]',
  upcoming: 'text-blue',
  closed: 'text-slate',
};
