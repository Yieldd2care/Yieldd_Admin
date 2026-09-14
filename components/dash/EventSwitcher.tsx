import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Typography } from '../ui/Typography';
import { Icon, ICON } from './controls';
import { useCurrentEvent, useEvents } from '../../hooks/useEvents';
import { useCurrentEventStore } from '../../stores/useCurrentEventStore';
import type { EventStatus } from '../../types/event';

/**
 * Which show the dashboard is reporting on.
 *
 * This lives in the title bar, not in the body. Every number on Home and
 * every row on Leads is scoped by it, and a scope control sitting among the
 * panels reads as one more filter you may or may not have applied — which is
 * exactly the wrong thing to be unsure about when the figure you are looking
 * at is cost per lead.
 */

const DOT: Record<EventStatus, string> = {
  live: '#4ED17F',
  upcoming: '#1D3F8A',
  closed: '#8A98B0',
};

/** `18–21 Feb` — the span, without the year unless it straddles one. */
function span(startDate: string, endDate: string): string {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const month = (d: Date) => d.toLocaleDateString('en-IN', { month: 'short' });
  if (startDate === endDate) return `${start.getDate()} ${month(start)}`;
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.getDate()}–${end.getDate()} ${month(end)}`;
  }
  return `${start.getDate()} ${month(start)} – ${end.getDate()} ${month(end)}`;
}

export function EventSwitcher() {
  const router = useRouter();
  const { data: events } = useEvents();
  const { event } = useCurrentEvent();
  const selectEvent = useCurrentEventStore((s) => s.selectEvent);
  // Local, not in the store — `useCurrentEventStore` is persisted, and a menu
  // that was open when the tab closed should not be open on the next visit.
  const [open, setOpen] = useState(false);

  if (!event) return null;

  const list = events ?? [];

  return (
    <View style={{ zIndex: open ? 60 : 1 }}>
      <Pressable
        onPress={() => setOpen(!open)}
        className={`flex-row items-center gap-[9px] rounded-md border px-[13px] py-[8px] ${
          open ? 'bg-section border-navy' : 'bg-white border-hairline'
        }`}
      >
        <View className="w-[7px] h-[7px] rounded-full" style={{ backgroundColor: DOT[event.status] }} />
        <View>
          <Typography
            className="text-[9.5px] font-bold tracking-[0.08em] text-label"
            style={{ textTransform: 'uppercase' }}
          >
            Event
          </Typography>
          <Typography className="text-[13px] font-bold text-navy" numberOfLines={1}>
            {event.name}
          </Typography>
        </View>
        <Icon d={ICON.chevronDown} size={13} color="#8A98B0" />
      </Pressable>

      {open ? (
        <>
          <Pressable
            onPress={() => setOpen(false)}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 } as never}
          />
          <View
            className="absolute bg-white border border-hairline rounded-md py-[6px] shadow-[0_18px_44px_rgba(11,19,43,0.18)]"
            style={{ top: 46, right: 0, width: 280 }}
          >
            {list.map((e) => (
              <Pressable
                key={e.id}
                onPress={() => {
                  selectEvent(e.id);
                  setOpen(false);
                }}
                className="flex-row items-center gap-[10px] px-[13px] py-[9px]"
              >
                <View className="w-[7px] h-[7px] rounded-full shrink-0" style={{ backgroundColor: DOT[e.status] }} />
                <View className="flex-1 min-w-0">
                  <Typography
                    className={`text-[12.5px] ${e.id === event.id ? 'font-bold text-navy' : 'font-medium text-ink-muted'}`}
                    numberOfLines={1}
                  >
                    {e.name}
                  </Typography>
                  <Typography className="text-[11px] text-label" numberOfLines={1}>
                    {span(e.startDate, e.endDate)}
                    {e.city ? ` · ${e.city}` : ''}
                  </Typography>
                </View>
                {e.id === event.id ? <Icon d={ICON.check} size={13} color="#1D3F8A" width={2.4} /> : null}
              </Pressable>
            ))}

            <View className="border-t border-hairline mt-[6px] pt-[6px]">
              <Pressable
                onPress={() => {
                  setOpen(false);
                  router.push('/(dash)/events');
                }}
                className="px-[13px] py-[8px]"
              >
                <Typography className="text-[12.5px] font-semibold text-blue">All events</Typography>
              </Pressable>
            </View>
          </View>
        </>
      ) : null}
    </View>
  );
}
