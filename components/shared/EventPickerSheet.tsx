import { useMemo } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';

import { Typography } from '../ui/Typography';
import { CheckIcon, ChevronRightIcon } from '../ui/icons';
import { useEvents } from '../../hooks/useEvents';
import { useCurrentEventStore } from '../../stores/useCurrentEventStore';
import { eventDetailLine } from '../../lib/eventDisplay';
import type { Event } from '../../types/event';

/**
 * Which show this lead belongs to, chosen without leaving the form.
 *
 * `EventContextBar` used to push the Events TAB, which is a different job: that
 * screen is for opening an event, so picking one there navigated into it and
 * abandoned a half-typed lead. Everything already entered was gone, and the rep
 * had to start the card again. Changing the event is a one-field edit, so it
 * belongs in a sheet over the form, exactly like `PhoneChoiceSheet`.
 *
 * ⚠️ Deliberately NOT SheetShell — that is for `(modals)` ROUTES and its
 * backdrop calls `router.back()`, which from inside the capture form would pop
 * the form itself rather than close the sheet.
 *
 * Live and upcoming only. A closed show is not somewhere a lead can be captured
 * into any more, and listing every past event would bury the two or three that
 * matter. The one exception is below.
 */

interface Props {
  visible: boolean;
  onClose: () => void;
  /**
   * The event the bar is CURRENTLY showing, passed in rather than re-derived.
   *
   * `useCurrentEvent` falls back through live → soonest upcoming → newest of
   * all, and that last step can land on a closed show when every event has
   * finished. Working the tick out again here would have to repeat all three
   * steps to agree with the bar, and a copy of that rule would eventually drift
   * from it — the sheet would open with nothing ticked, or with a row the bar
   * is not naming.
   */
  currentEventId: string | undefined;
}

/** Live first, then the soonest upcoming — the order a rep expects to read. */
function orderForPicking(events: Event[], keepId: string | undefined): Event[] {
  const live = events.filter((e) => e.status === 'live');
  // fetchEvents sorts newest first, so the soonest upcoming one is last.
  const upcoming = [...events].reverse().filter((e) => e.status === 'upcoming');

  const picked = [...live, ...upcoming];

  // A closed event that is the CURRENT selection still gets a row. Without it
  // the sheet would silently disagree with the bar that opened it — the bar
  // naming a show that is nowhere in the list reads as a bug, and there would
  // be no way to see what you are switching away from.
  if (keepId && !picked.some((e) => e.id === keepId)) {
    const kept = events.find((e) => e.id === keepId);
    if (kept) picked.unshift(kept);
  }

  return picked;
}

export function EventPickerSheet({ visible, onClose, currentEventId }: Props) {
  const { data } = useEvents();
  const selectEvent = useCurrentEventStore((s) => s.selectEvent);

  const events = useMemo(
    () => orderForPicking(data ?? [], currentEventId),
    [data, currentEventId]
  );

  const choose = (id: string) => {
    selectEvent(id);
    onClose();
  };

  return (
    // `onRequestClose` is what makes the Android hardware back button close the
    // sheet rather than do nothing.
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-navy/[0.55]">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="bg-white rounded-t-[22px] px-6 pt-[10px] pb-8" style={{ maxHeight: '80%' }}>
          <View className="w-9 h-1 rounded-full bg-hairline self-center mb-[18px]" />

          <Typography className="text-[16px] font-bold text-navy">Which event?</Typography>
          <Typography className="text-[12.5px] text-slate mt-[3px] mb-4">
            This lead is saved against the show you pick here.
          </Typography>

          {events.length === 0 ? (
            <>
              <Typography className="text-[13px] text-slate leading-[1.5] mb-4">
                Nothing is running or coming up. Create an event first, then the lead has somewhere
                to go.
              </Typography>
              <Pressable
                onPress={() => {
                  onClose();
                  // `reset` clears any month/year filter left on that tab. It
                  // stays mounted, so without this a rep who has no event to
                  // capture into could land on a list narrowed to some month
                  // and conclude the events are gone.
                  router.push({ pathname: '/(app)/(tabs)/events', params: { reset: '1' } });
                }}
                className="bg-gold rounded-md px-4 py-3 items-center"
              >
                <Typography className="text-[13.5px] font-bold text-navy">Go to Events</Typography>
              </Pressable>
            </>
          ) : (
            // A vertical ScrollView. Never a horizontal one with a className on
            // it — that paints no glyphs with this project's NativeWind setup.
            <ScrollView
              bounces={false}
              showsVerticalScrollIndicator={false}
              contentContainerClassName="pb-1"
            >
              {events.map((event) => {
                const isSelected = event.id === currentEventId;
                return (
                  <Pressable
                    key={event.id}
                    onPress={() => choose(event.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`Save this lead to ${event.name}`}
                    // Only plain background and border classes vary. A
                    // className that gains its first shadow, ring or transform
                    // after the first render is what makes NativeWind throw the
                    // bogus navigation error described in AGENTS.md.
                    className={`flex-row items-center gap-3 border rounded-md px-4 py-3 mb-[10px] ${
                      isSelected ? 'border-gold bg-gold/[0.08]' : 'border-hairline bg-white'
                    }`}
                  >
                    <View
                      className={`w-[6px] h-[6px] rounded-full ${
                        event.status === 'live' ? 'bg-success' : 'bg-slate/[0.45]'
                      }`}
                    />
                    <View className="flex-1 min-w-0">
                      <Typography className="text-[14px] font-bold text-navy" numberOfLines={1}>
                        {event.name}
                      </Typography>
                      <Typography className="text-[11.5px] text-slate mt-[2px]" numberOfLines={1}>
                        {eventDetailLine(event)}
                      </Typography>
                    </View>
                    {event.status === 'live' ? (
                      <View className="bg-success/[0.12] rounded-full px-[9px] py-[3px]">
                        <Typography className="text-[10.5px] font-bold text-success">Live</Typography>
                      </View>
                    ) : null}
                    {isSelected ? <CheckIcon size={15} color="#8A6100" strokeWidth={3} /> : null}
                  </Pressable>
                );
              })}

              <Pressable
                onPress={() => {
                  onClose();
                  // Says "all", so it has to mean all — `reset` clears the
                  // month/year filter the Events tab may still be holding.
                  router.push({ pathname: '/(app)/(tabs)/events', params: { reset: '1' } });
                }}
                className="flex-row items-center justify-center gap-1 py-3"
              >
                <Typography className="text-[12.5px] font-semibold text-blue">
                  See all events
                </Typography>
                <ChevronRightIcon size={13} color="#1D3F8A" />
              </Pressable>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
