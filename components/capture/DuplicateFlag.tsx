import { Pressable, View } from 'react-native';
import { router } from 'expo-router';

import { Typography } from '../ui/Typography';
import { AlertCircleIcon, ChevronRightIcon } from '../ui/icons';
import { formatRelative } from '../../lib/dates';
import type { DuplicateCheck } from '../../hooks/useDuplicateLead';

/**
 * "This person is already at this event."
 *
 * Renders nothing when there is no match, so both capture screens can drop it
 * in without a ternary. It owns the push into the detail sheet because the
 * target and the params are identical from either screen.
 *
 * It is a notice, never a gate: nothing here touches whether the lead can be
 * saved. Two reps legitimately meet the same person and have different
 * conversations, and MVP_PLAN is explicit that the scan is never blocked.
 */
export function DuplicateFlag({ match, isSelf }: DuplicateCheck) {
  if (!match) return null;

  const when = formatRelative(match.capturedAt);

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: '/(app)/(modals)/duplicate-detail',
          params: {
            // The lead id is deliberately NOT passed. The sheet is a read-only
            // peek at someone else's lead; without an id there is nothing for a
            // later "open it" button to be built on, which is how "nothing else
            // about that rep's leads is reachable from here" stays true by
            // construction rather than by remembering.
            capturedByName: match.capturedByName,
            capturedAt: match.capturedAt,
            note: match.note ?? '',
            voiceSummary: match.voiceSummary ?? '',
            isSelf: isSelf ? '1' : '0',
          },
        })
      }
      className="flex-row items-center gap-[10px] bg-[#FFF6E0] border border-gold/[0.35] rounded-md px-[14px] py-3 mb-[18px]"
    >
      <View className="w-[30px] h-[30px] rounded-full bg-gold items-center justify-center">
        <AlertCircleIcon size={16} color="#0B132B" strokeWidth={2.25} />
      </View>
      <View className="flex-1">
        <Typography className="text-[12.5px] font-bold text-navy">
          {isSelf ? 'You captured this earlier' : 'Possible duplicate'}
        </Typography>
        <Typography className="text-[11.5px] text-slate mt-[1px]">
          {isSelf ? `${when}, at this event` : `Captured by ${match.capturedByName} · ${when}`}
        </Typography>
      </View>
      <ChevronRightIcon color="#5A6B87" />
    </Pressable>
  );
}
