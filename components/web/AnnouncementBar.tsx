import { Pressable, Text, View } from 'react-native';

import { FOCUS } from './primitives/focus';

/**
 * The strip across the very top of the page.
 *
 * Sits ABOVE the floating header and outside the scroller, so it holds its
 * place rather than sliding away on the first scroll. The reference lets its
 * own bar scroll off, but its header is a sticky element in normal flow;
 * ours is absolutely positioned so the hero can tuck under it, and a bar that
 * scrolled away would leave the header hanging in the gap it vacated.
 *
 * Darker than the hero on purpose. At the same navy it would read as part of
 * the gradient rather than as a separate band.
 *
 * Three parts, as the reference has them: a muted setup line, the claim in
 * bold, and a link out. On a phone they wrap into a centred stack instead of
 * being truncated.
 */

const BODY = '[font-family:Figtree,system-ui,sans-serif]';

interface Props {
  onNavigate: (key: string) => void;
}

export function AnnouncementBar({ onNavigate }: Props) {
  return (
    <View className="w-full bg-[#060B1A] px-5 py-[10px]">
      <View className="flex-row flex-wrap items-center justify-center gap-x-[10px] gap-y-[2px]">
        {/* The setup line is the first thing to go on a phone. With it, the
            bar wraps to three lines and eats the top of the screen; without
            it the claim and the link fit in two. */}
        <Text
          className={`${BODY} hidden md:flex text-[13px] leading-[1.5] text-white/[0.55] text-center`}
        >
          No more rubber bands and spreadsheets.
        </Text>
        <Text
          className={`${BODY} [font-weight:700] text-[13px] leading-[1.5] text-white text-center`}
        >
          Every lead followed up before you leave the stall.
        </Text>
        <Pressable
          onPress={() => onNavigate('how')}
          className={`rounded-[4px] ${FOCUS}`}
          accessibilityRole="link"
        >
          <Text className={`${BODY} [font-weight:700] text-[13px] leading-[1.5] text-gold`}>
            See how →
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
