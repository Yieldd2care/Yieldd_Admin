import { Children, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useReveal } from '../../../hooks/useReveal';

/**
 * Reveals its children as they scroll into view.
 *
 * Two rules are baked into the shape of this component:
 *
 * 1. The className goes on the OUTER plain View, never on the Animated.View.
 *    Reanimated's Animated.View is not registered in lib/nativewind-interop,
 *    and it ships pre-compiled jsx calls that the babel transform never
 *    rewrites — so a className handed to it is dropped silently, with no
 *    warning. The outer View is also what gives us a real DOM node to observe;
 *    an Animated.View ref is a wrapper instance.
 *
 * 2. Never wrap a whole <Section> in this. app/(web)/index.tsx measures
 *    section offsets with onLayout to build the nav's scroll targets, and a
 *    translated wrapper shifts the reported y — the nav would then scroll to
 *    the wrong place. Put this INSIDE a section, around its content.
 */

interface Props {
  delay?: number;
  once?: boolean;
  distance?: number;
  className?: string;
  children: ReactNode;
}

export function Reveal({ delay = 0, once = true, distance = 18, className = '', children }: Props) {
  const { hostRef, style } = useReveal({ delay, once, distance });

  return (
    <View ref={hostRef as never} className={className}>
      <Animated.View style={style}>{children}</Animated.View>
    </View>
  );
}

interface DeckProps {
  /** Milliseconds between each child's reveal. */
  step?: number;
  className?: string;
  children: ReactNode;
}

/**
 * Staggers the reveal of its children — the reference's `[data-deck] > *`.
 *
 * Note this reveals the children of THIS element, so it belongs directly
 * around a row of cards, not around a whole section.
 */
export function Deck({ step = 80, className = '', children }: DeckProps) {
  return (
    <View className={className}>
      {Children.map(children, (child, i) => (
        <Reveal delay={i * step}>{child}</Reveal>
      ))}
    </View>
  );
}
