import { View } from 'react-native';

import { Typography } from '../ui/Typography';
import { Icon, ICON, Menu, MenuItem } from './controls';
import { useEventSelection } from '../../hooks/useEvents';
import type { Event } from '../../types/event';

/**
 * Which shows the dashboard is reporting on. The only event control there is.
 *
 * Home and Leads used to carry two between them — this one, and an
 * `EventSwitcher` in the title bar — and a reader had no way to tell which of
 * the two a given number obeyed. Worse, on Leads the switcher was decoration:
 * changing it altered nothing on screen, because nothing there read it. One
 * control now, and both screens scope themselves by it.
 *
 * The label never reads as a bare count. "All events" or the show's own name,
 * never "1 selected", because the one thing a reader must never have to wonder
 * about is how much of the year the number in front of them covers.
 */

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

function labelFor(events: Event[], selectedIds: string[], isAll: boolean): string {
  if (events.length === 0) return 'No events';
  if (isAll) return events.length === 1 ? 'This event' : 'All events';
  // A single show is named; anything else is the count, which only occurs
  // transiently now that picking is one-at-a-time.
  const picked = events.filter((e) => selectedIds.includes(e.id));
  return picked.length === 1 ? picked[0].name : `${picked.length} of ${events.length} events`;
}

/**
 * Pick one show, or all of them.
 *
 * This was a set of tick boxes, and the tick boxes were the problem. Clicking
 * an event while everything was selected REMOVED it — so choosing "Gujarat
 * Industrial Expo" showed every lead except Gujarat's, which is the opposite of
 * what the click looks like it will do. Nobody reads that as multi-select; they
 * read it as broken.
 *
 * So clicking an event now means that event and nothing else, and "All events"
 * means all of them. Arbitrary subsets are gone deliberately: they were never
 * asked for, and the totals above the picker are no harder to read for it.
 */
export function EventMultiPicker() {
  const { events, selectedIds, isAll, setSelection } = useEventSelection();

  if (events.length === 0) return null;

  return (
    <Menu
      label={labelFor(events, selectedIds, isAll)}
      icon={ICON.calendar}
      width={290}
      align="right"
    >
      {(close) => (
        <>
          <MenuItem
            label={events.length === 1 ? 'This event' : 'All events'}
            active={isAll}
            onPress={() => {
              // null, not the full id list: the store reads null as "everything",
              // so a later event added to the organisation is included without
              // anyone re-picking.
              setSelection(null);
              close();
            }}
          />

          <View className="border-t border-hairline my-[6px]" />

          {events.map((e) => (
            <MenuItem
              key={e.id}
              label={e.name}
              hint={span(e.startDate, e.endDate)}
              active={!isAll && selectedIds.length === 1 && selectedIds[0] === e.id}
              onPress={() => {
                setSelection([e.id]);
                close();
              }}
            />
          ))}
        </>
      )}
    </Menu>
  );
}

/**
 * The one-line statement of what the figures beside it cover.
 *
 * Kept next to the picker rather than inside it: a dropdown says what you are
 * about to change, and this says what you are currently reading.
 */
export function SelectionSummary() {
  const { events, selectedIds, isAll } = useEventSelection();

  if (events.length === 0) return null;

  const names = events.filter((e) => selectedIds.includes(e.id)).map((e) => e.name);
  const text = isAll
    ? `Every event · ${events.length}`
    : names.length <= 2
      ? names.join(' and ')
      : `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`;

  return (
    <View className="flex-row items-center gap-[6px]">
      <Icon d={ICON.filter} size={12} color="#8A98B0" />
      <Typography className="text-[12px] text-slate font-medium" numberOfLines={1}>
        {text}
      </Typography>
    </View>
  );
}
