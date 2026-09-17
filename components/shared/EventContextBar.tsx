import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Typography } from '../ui/Typography';
import { AlertCircleIcon, ChevronDownIcon } from '../ui/icons';
import { useCurrentEvent } from '../../hooks/useEvents';
import { eventDayPosition } from '../../lib/dates';
import { EventPickerSheet } from './EventPickerSheet';

/**
 * Which event this lead is going into.
 *
 * MVP_PLAN calls getting this wrong "the single worst data error in the
 * product", and it is the quiet kind: nothing breaks, the lead saves, and the
 * mistake only surfaces weeks later when one show's ROI is built partly from
 * another show's leads. By then it cannot be untangled from memory.
 *
 * So this states the answer rather than assuming it, and is tappable — a rep who
 * sees the wrong name needs to fix it in one move, at the stall, not find the
 * Events tab.
 *
 * Tapping it opens a picker OVER the form. It used to push the Events tab,
 * which is a screen built for a different job: choosing a show there OPENS it,
 * so a rep halfway through typing a lead lost everything they had entered and
 * had to start the card again. Both screens that render this bar are capture
 * forms, so neither can afford to be navigated away from mid-entry.
 *
 * The confirm screen used to print "IMTEX 2026 · B-42" as literal text, which
 * named the wrong event for every customer of this product except one.
 */
export function EventContextBar({ className = '' }: { className?: string }) {
  const { event, isLoading } = useCurrentEvent();
  const [picking, setPicking] = useState(false);

  if (isLoading) return null;

  if (!event) {
    return (
      <>
        <Pressable
          onPress={() => setPicking(true)}
          className={`flex-row items-center gap-[10px] bg-gold/[0.10] border border-gold/[0.35] rounded-md px-[14px] py-3 ${className}`}
        >
          <AlertCircleIcon size={15} color="#8A6100" strokeWidth={2} />
          <Typography className="flex-1 text-[12.5px] font-bold text-navy">
            No event selected
          </Typography>
          <ChevronDownIcon size={15} color="#8A6100" />
        </Pressable>
        <EventPickerSheet visible={picking} onClose={() => setPicking(false)} currentEventId={undefined} />
      </>
    );
  }

  const day = eventDayPosition(event.startDate, event.endDate);
  const detail = [
    event.stallNumber ? `Stall ${event.stallNumber}` : event.city,
    day?.isCurrent ? `Day ${day.dayNumber} of ${day.totalDays}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <>
      <Pressable
        onPress={() => setPicking(true)}
        accessibilityRole="button"
        accessibilityLabel={`Saving to ${event.name}. Tap to change the event.`}
        className={`flex-row items-center gap-[10px] bg-navy/[0.04] border border-hairline rounded-md px-[14px] py-[10px] ${className}`}
      >
        <View className="w-[6px] h-[6px] rounded-full bg-success" />
        <View className="flex-1 min-w-0">
          <Typography className="text-[12.5px] font-bold text-navy" numberOfLines={1}>
            {event.name}
          </Typography>
          {detail ? (
            <Typography className="text-[11px] text-slate mt-[1px]" numberOfLines={1}>
              {detail}
            </Typography>
          ) : null}
        </View>
        {/* A chevron that points DOWN, not right. Right means "this opens
            another screen", which is exactly the promise this bar stopped
            making when the picker moved into a sheet. */}
        <Typography className="text-[11px] font-bold text-blue">Change</Typography>
        <ChevronDownIcon size={14} color="#5A6B87" />
      </Pressable>
      <EventPickerSheet visible={picking} onClose={() => setPicking(false)} currentEventId={event?.id} />
    </>
  );
}
