import { View } from 'react-native';

import { Typography } from '../ui/Typography';
import { Icon, ICON, Menu, MenuToggle } from './controls';
import { useEventSelection } from '../../hooks/useEvents';
import type { Event } from '../../types/event';

/**
 * Which shows the across-events figures cover.
 *
 * There are now two event controls on Home, and that is deliberate rather than
 * an oversight. `EventSwitcher` sits in the title bar and answers "which show am
 * I working in" — it scopes the panels below it, which is why its own header
 * argues a scope control belongs in the title bar rather than among the panels.
 * That argument holds for a control governing the whole page. It does not hold
 * here: this one governs exactly one section, sits inside that section's
 * heading, and the section states its own scope in words next to it.
 *
 * Merging the two was the alternative. It would have meant the Leads screen
 * inheriting a multi-event scope and needing a mixed-event list designed for it,
 * which is a different piece of work — and it would have made picking a show to
 * work in silently change what the yearly totals covered.
 *
 * The label never reads as a bare count. "4 of 6 events" or "All events", never
 * "4 selected", because the one thing a reader must never have to wonder about
 * is how much of the year the number in front of them covers.
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
  return `${selectedIds.length} of ${events.length} events`;
}

export function EventMultiPicker() {
  const { events, selectedIds, isAll, setSelection } = useEventSelection();

  if (events.length === 0) return null;

  const toggle = (id: string) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
    // Unticking the last one means "all" rather than "nothing". Totals over no
    // events are not zero, and a section scoped to nothing has nothing to say —
    // the label flips to "All events" in the same breath, so what happened is
    // visible rather than silent. The store normalises [] to null either way.
    setSelection(next.length === 0 ? null : next);
  };

  return (
    <Menu
      label={labelFor(events, selectedIds, isAll)}
      icon={ICON.calendar}
      width={290}
      align="left"
    >
      {() => (
        <>
          <MenuToggle
            label={events.length === 1 ? 'This event' : 'All events'}
            on={isAll}
            // Already showing everything: re-ticking it would be a no-op, and
            // unticking it has no defined meaning. Leave it alone.
            onPress={() => {
              if (!isAll) setSelection(null);
            }}
          />

          <View className="border-t border-hairline my-[6px]" />

          {events.map((e) => (
            <MenuToggle
              key={e.id}
              label={`${e.name} · ${span(e.startDate, e.endDate)}`}
              on={selectedIds.includes(e.id)}
              onPress={() => toggle(e.id)}
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
