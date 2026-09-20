import { View } from 'react-native';

import { Typography } from '../ui/Typography';
import { LockIcon } from '../ui/icons';

/**
 * How a paid feature is marked, everywhere in the app.
 *
 * **A Pro mark always carries the word.** A padlock on its own says "you cannot
 * do this" and leaves the rep to guess why — it reads as broken, or as needing a
 * permission, as easily as it reads as something to buy. The word is what turns
 * a refusal into an offer, so there is no lock-only variant here to reach for.
 *
 * Greyed, never hidden — the agreed product rule. A rep who cannot see that
 * follow-ups exist cannot want them, and the row going missing on Free reads as
 * the app having lost a feature rather than as something to pay for.
 */

/**
 * The chip that marks a paid control in a row or beside a button label.
 *
 * `tone` is the surface it sits on, not a preference: the default pill is light
 * grey on white, which disappears on the navy buttons. `dark` is the same chip
 * for those.
 *
 * It is a `View`, not a `Pressable`. The row it sits in is already pressable and
 * already opens the explanation, so making the chip its own target would put a
 * dead zone in the middle of a live row on the taps that miss it.
 */
export function ProBadge({
  label = 'Pro',
  tone = 'light',
}: {
  label?: string;
  tone?: 'light' | 'dark';
}) {
  const dark = tone === 'dark';
  return (
    <View
      className={`flex-row items-center gap-[5px] rounded-full pl-[7px] pr-[9px] py-[3px] ${
        dark ? 'bg-white/[0.16]' : 'bg-surface'
      }`}
    >
      <LockIcon size={11} color={dark ? '#FFFFFF' : '#97A3B8'} strokeWidth={2.4} />
      <Typography
        className={`text-[10.5px] font-extrabold ${dark ? 'text-white' : 'text-slate'}`}
        style={{ letterSpacing: 0.3 }}
      >
        {label}
      </Typography>
    </View>
  );
}

/**
 * The same mark for a tile rather than a row — the corner of an icon square.
 *
 * This was a bare lock in a 17px circle, on the grounds that a badge would not
 * fit. With the word required it has to, so the lock is dropped and the word
 * kept: at this size "PRO" is legible where a 9px padlock was only a smudge, and
 * it is the half that carries the meaning.
 *
 * Positioned absolutely, so the caller wraps it and the tile keeps its size. It
 * overhangs the icon square, which is fine — the square is 48px centred in an
 * 80px column, so there is room either side. The ring is the tile's own
 * background colour, which is what separates the pill from the icon underneath
 * without drawing a second border.
 */
export function ProTileBadge({ ringColor = '#FFFFFF' }: { ringColor?: string }) {
  return (
    <View
      className="absolute -top-[6px] -right-[9px] rounded-full p-[2px]"
      style={{ backgroundColor: ringColor }}
    >
      <View className="rounded-full bg-slate/[0.16] px-[5px] py-[1px]">
        <Typography
          className="text-[8.5px] font-extrabold text-navy"
          style={{ letterSpacing: 0.4 }}
        >
          PRO
        </Typography>
      </View>
    </View>
  );
}
