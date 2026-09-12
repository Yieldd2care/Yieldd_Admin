import { View } from 'react-native';

import { Typography } from '../ui/Typography';
import { LockIcon } from '../ui/icons';

/**
 * The lock chip that marks a paid feature in a list.
 *
 * Greyed, not hidden — the agreed product rule. A rep who cannot see that
 * follow-ups exist cannot want them, and the row going missing on Free reads
 * as the app having lost a feature rather than as something to buy.
 *
 * It is a `View`, not a `Pressable`. The row it sits in is already pressable
 * and already opens the explanation, so making the chip its own target would
 * put a dead zone in the middle of a live row on the taps that miss it.
 */
export function ProBadge({ label = 'Pro' }: { label?: string }) {
  return (
    <View className="flex-row items-center gap-[5px] bg-surface rounded-full pl-[7px] pr-[9px] py-[3px]">
      <LockIcon size={11} color="#97A3B8" strokeWidth={2.4} />
      <Typography className="text-[10.5px] font-extrabold text-slate" style={{ letterSpacing: 0.3 }}>
        {label}
      </Typography>
    </View>
  );
}

/**
 * The same mark for a tile rather than a row — a small lock in the corner of
 * the icon square, where a badge would not fit.
 *
 * Positioned absolutely, so the caller wraps it and the tile keeps its size.
 * The ring is the tile's own background colour, which is what separates the
 * lock from the icon underneath it without drawing a second border.
 */
export function ProTileLock({ ringColor = '#FFFFFF' }: { ringColor?: string }) {
  return (
    <View
      className="absolute -top-[3px] -right-[3px] w-[17px] h-[17px] rounded-full items-center justify-center"
      style={{ backgroundColor: ringColor }}
    >
      <View className="w-[15px] h-[15px] rounded-full bg-slate/[0.16] items-center justify-center">
        <LockIcon size={9} color="#5A6B85" strokeWidth={2.6} />
      </View>
    </View>
  );
}
