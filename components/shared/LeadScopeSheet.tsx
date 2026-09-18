import { Modal, Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';

import { Typography } from '../ui/Typography';
import { CheckIcon } from '../ui/icons';
import { useLeadScope } from '../../hooks/useEvents';
import { eventDetailLine } from '../../lib/eventDisplay';

/**
 * Which show the leads list is SHOWING. Viewing only.
 *
 * ⚠️ Deliberately NOT `EventPickerSheet`, which sits beside this file, looks
 * almost identical and does a different job. That one writes
 * `useCurrentEventStore.selectEvent`, which decides where the NEXT captured
 * card is filed, and it lists live and upcoming shows only because a closed
 * show is not somewhere a lead can be captured into any more. Both are wrong
 * here: narrowing the list must change nothing about capture, and a CLOSED show
 * is the main reason anyone opens this — "who did I meet in March". The copy
 * below says so in as many words, and must never start claiming a lead is saved
 * anywhere.
 *
 * ⚠️ Deliberately NOT SheetShell — that is for `(modals)` ROUTES and its
 * backdrop calls `router.back()`, which from the leads tab would pop the tab.
 *
 * Every event the rep can see, closed ones included, in `fetchEvents` order
 * (start date, newest first). That puts the show they are at, and the ones just
 * finished, at the top, and last year's at the bottom — the order the question
 * is asked in. Nothing is re-sorted or filtered here.
 *
 * No per-event lead counts on the rows, deliberately: the store holds the rows
 * THIS DEVICE has synced, while `event.leads` is a server count over everyone's
 * leads. Two numbers that disagree on the same row is worse than no number.
 */
export function LeadScopeSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { events, scopedEvent, isAll, scopeToEvent } = useLeadScope();

  const choose = (id: string | null) => {
    scopeToEvent(id);
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

          <Typography className="text-[16px] font-bold text-navy">Show leads from</Typography>
          <Typography className="text-[12.5px] text-slate mt-[3px] mb-4">
            Changes what this list shows. New cards still save to the show you are working in.
          </Typography>

          {events.length === 0 ? (
            <>
              <Typography className="text-[13px] text-slate leading-[1.5] mb-4">
                No events yet. Leads appear here once there is a show to capture them at.
              </Typography>
              <Pressable
                onPress={() => {
                  onClose();
                  // `reset` clears any month/year filter left on that tab, which
                  // stays mounted — otherwise a rep could land on a list
                  // narrowed to some month and conclude the events are gone.
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
            <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerClassName="pb-1">
              <Pressable
                onPress={() => choose(null)}
                accessibilityRole="button"
                accessibilityState={{ selected: isAll }}
                accessibilityLabel="Show leads from all events"
                // Only plain background and border classes vary. A className
                // that gains its first shadow, ring or transform after the first
                // render is what makes NativeWind throw the bogus navigation
                // error described in AGENTS.md.
                className={`flex-row items-center gap-3 border rounded-md px-4 py-3 mb-[10px] ${
                  isAll ? 'border-gold bg-gold/[0.08]' : 'border-hairline bg-white'
                }`}
              >
                <View className="w-[6px] h-[6px] rounded-full bg-slate/[0.45]" />
                <View className="flex-1 min-w-0">
                  <Typography className="text-[14px] font-bold text-navy" numberOfLines={1}>
                    All events
                  </Typography>
                  <Typography className="text-[11.5px] text-slate mt-[2px]" numberOfLines={1}>
                    Everything you have captured
                  </Typography>
                </View>
                {isAll ? <CheckIcon size={15} color="#8A6100" strokeWidth={3} /> : null}
              </Pressable>

              <View className="h-px bg-hairline mb-[10px]" />

              {events.map((event) => {
                const isSelected = event.id === scopedEvent?.id;
                return (
                  <Pressable
                    key={event.id}
                    onPress={() => choose(event.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`Show leads from ${event.name} only`}
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
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
