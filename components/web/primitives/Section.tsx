import { type ReactNode } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';

/**
 * One band of the landing page: a full-bleed background with a capped,
 * centred content column. Replaces the `px-8 py-[104px]` +
 * `max-w-[1200px] w-full mx-auto` pair that every section file repeated.
 *
 * `onLayout` lands on the OUTER view deliberately. app/(web)/index.tsx reads
 * `e.nativeEvent.layout.y` off these to build the nav's scroll targets, so the
 * measured node has to be one that never moves — never a <Reveal>, which
 * translates its child and would send the nav to the wrong offset.
 */

type Tone = 'navy' | 'section' | 'white';
type Pad = 'sm' | 'md' | 'lg';

const TONES: Record<Tone, string> = {
  navy: 'bg-navy',
  section: 'bg-section',
  white: 'bg-white',
};

const PADS: Record<Pad, string> = {
  sm: 'py-14 md:py-[72px]',
  md: 'py-[72px] md:py-20',
  lg: 'py-[72px] md:py-[88px]',
};

interface Props {
  tone: Tone;
  pad?: Pad;
  onLayout?: (e: LayoutChangeEvent) => void;
  className?: string;
  innerClassName?: string;
  children: ReactNode;
}

export function Section({
  tone,
  pad = 'lg',
  onLayout,
  className = '',
  innerClassName = '',
  children,
}: Props) {
  return (
    <View
      onLayout={onLayout}
      className={`${TONES[tone]} ${PADS[pad]} px-5 md:px-8 ${className}`}
    >
      <View className={`max-w-[1200px] w-full mx-auto ${innerClassName}`}>{children}</View>
    </View>
  );
}
