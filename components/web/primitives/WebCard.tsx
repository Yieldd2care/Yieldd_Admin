import { type ReactNode } from 'react';
import { View } from 'react-native';

/**
 * The reference's workhorse card: 22px radius, soft double shadow, and an
 * optional hover lift.
 *
 * Every shadow is an arbitrary value on purpose. NativeWind's web preset
 * replaces Tailwind's `theme.boxShadow` with React-Native-ish values, so a
 * stock `shadow-lg` here would not be Tailwind's `shadow-lg` at all.
 *
 * The lift classes are always present, never applied conditionally — hover
 * variants and shadows are both on AGENTS.md's list of things that must exist
 * from the first render.
 */

type Tone = 'light' | 'dark' | 'glass';

const TONES: Record<Tone, string> = {
  light: 'bg-white border border-hairline shadow-[0_10px_26px_rgba(11,19,43,0.07),0_1px_2px_rgba(11,19,43,0.06)]',
  dark: 'bg-navy-elevated border border-white/[0.14] shadow-[0_26px_60px_rgba(0,0,0,0.5)]',
  glass: 'bg-white/[0.08] border border-white/[0.18] shadow-[0_18px_40px_rgba(0,0,0,0.28)]',
};

const LIFT =
  'transition-all duration-300 hover:-translate-y-[6px] hover:shadow-[0_2px_4px_rgba(11,19,43,0.06),0_12px_20px_rgba(11,19,43,0.10),0_30px_60px_rgba(11,19,43,0.16)]';

const PADS = {
  sm: 'p-[18px]',
  md: 'p-[26px]',
  lg: 'p-[32px]',
} as const;

interface Props {
  tone?: Tone;
  pad?: keyof typeof PADS;
  lift?: boolean;
  className?: string;
  children: ReactNode;
}

export function WebCard({
  tone = 'light',
  pad = 'md',
  lift = true,
  className = '',
  children,
}: Props) {
  return (
    <View
      className={`rounded-[22px] ${PADS[pad]} ${TONES[tone]} ${lift ? LIFT : ''} ${className}`}
    >
      {children}
    </View>
  );
}
