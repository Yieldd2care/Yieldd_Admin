import { Pressable, View } from 'react-native';
import { router } from 'expo-router';

import { Typography } from '../ui/Typography';
import { AlertCircleIcon, ChevronRightIcon } from '../ui/icons';
import { useCurrentEvent } from '../../hooks/useEvents';
import { eventDayPosition } from '../../lib/dates';

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
 * The confirm screen used to print "IMTEX 2026 · B-42" as literal text, which
 * named the wrong event for every customer of this product except one.
 */
export function EventContextBar({ className = '' }: { className?: string }) {
  const { event, isLoading } = useCurrentEvent();

  if (isLoading) return null;

  if (!event) {
    return (
      <Pressable
        onPress={() => router.push('/(app)/(tabs)/events')}
        className={`flex-row items-center gap-[10px] bg-gold/[0.10] border border-gold/[0.35] rounded-md px-[14px] py-3 ${className}`}
      >
        <AlertCircleIcon size={15} color="#8A6100" strokeWidth={2} />
        <Typography className="flex-1 text-[12.5px] font-bold text-navy">No event selected</Typography>
        <ChevronRightIcon size={15} color="#8A6100" />
      </Pressable>
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
    <Pressable
      onPress={() => router.push('/(app)/(tabs)/events')}
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
      <Typography className="text-[11px] font-bold text-blue">Change</Typography>
      <ChevronRightIcon size={14} color="#5A6B87" />
    </Pressable>
  );
}
