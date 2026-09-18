import { Pressable, View } from 'react-native';

import { Typography } from '../ui/Typography';
import { CalendarIcon } from '../ui/icons';
import { STATUS_CLASSES, STATUS_LABEL, STATUS_TEXT, type EventStatus } from '../../data/events';
import type { Event } from '../../types/event';

/**
 * One event in a list, and the grouped list itself.
 *
 * Shared by the events tab and the Reports picker, which show the same events
 * and differ only in where a tap goes — the tab to the event's dashboard, the
 * picker to its ROI report. Grouping and card live together here so that
 * "the same list" cannot quietly become two lists.
 *
 * ⚠️ No `className` prop on either export, deliberately. Every class list is a
 * complete literal in this file, so no call site can hand a second instance a
 * different variable-backed family — the NativeWind trap in AGENTS.md.
 */

const GROUPS: EventStatus[] = ['live', 'upcoming', 'closed'];

export function EventListCard({
  event,
  pendingCount,
  onPress,
}: {
  event: Event;
  pendingCount: number;
  /** Required, so this is a Pressable on its FIRST render and never becomes one. */
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      // The shadow is present in BOTH branches and only its alpha changes. An
      // event reconciles upcoming → live after mount (hooks/useEvents.ts), so
      // this exact card really does change branch mid-life, and a class list
      // that gained its first shadow there would throw the bogus "Couldn't
      // find a navigation context" red screen. See AGENTS.md.
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
        {pendingCount ? (
          <Typography className="text-[11px] font-semibold text-slate">
            +{pendingCount} syncing
          </Typography>
        ) : null}
      </View>
    </Pressable>
  );
}

/**
 * The events that are showing, under Live / Upcoming / Closed headings.
 *
 * Takes the already-filtered list — deciding what is visible is the screen's
 * job, and the empty states depend on knowing the difference between "no
 * events" and "none in this month".
 */
export function EventGroupedList({
  events,
  pendingByEvent,
  onPressEvent,
}: {
  events: Event[];
  pendingByEvent: Record<string, number>;
  onPressEvent: (event: Event) => void;
}) {
  return (
    <>
      {GROUPS.map((group) => {
        const items = events.filter((e) => e.status === group);
        if (!items.length) return null;
        return (
          <View key={group}>
            <Typography className="text-[10.5px] font-bold tracking-[0.12em] text-slate mb-[10px]" style={{ textTransform: 'uppercase' }}>
              {STATUS_LABEL[group]}
            </Typography>
            {items.map((event) => (
              <EventListCard
                key={event.id}
                event={event}
                pendingCount={pendingByEvent[event.id] ?? 0}
                onPress={() => onPressEvent(event)}
              />
            ))}
          </View>
        );
      })}
    </>
  );
}
