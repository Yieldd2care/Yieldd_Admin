export type EventStatus = 'live' | 'upcoming' | 'closed';

export type Event = {
  id: string;
  name: string;
  sub: string;
  status: EventStatus;
  leads?: number;
  dayLabel?: string;
};

export const EVENTS: Event[] = [
  { id: 'imtex-2026', name: 'IMTEX 2026', sub: 'Bengaluru · 18–22 Feb', status: 'live', leads: 413, dayLabel: 'Live · Day 3' },
  { id: 'plastindia-2026', name: 'Plastindia 2026', sub: 'Ahmedabad · 4–9 Apr', status: 'upcoming' },
  { id: 'auto-expo-2025', name: 'Auto Expo 2025', sub: 'New Delhi · 12–16 Nov', status: 'closed', leads: 286 },
];

export const STATUS_LABEL: Record<EventStatus, string> = { live: 'Live', upcoming: 'Upcoming', closed: 'Closed' };

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
