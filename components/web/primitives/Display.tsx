import { Text, type TextProps } from 'react-native';

/**
 * The website's heading scale.
 *
 * Renders a bare react-native <Text>, NOT components/ui/Typography. Typography
 * defaults to `variant = 'body-md'`, so it always emits `text-[14.5px]` — put a
 * clamp() size next to that and you have two font-size rules of equal
 * specificity on one element, with document order picking the winner. The same
 * trap is why Hero.tsx has to repeat `variant="display-xl"` on its nested span.
 *
 * Family and weight are set together as arbitrary properties on purpose. The
 * Inter faces in tailwind.config.js live under the `fontFamily` key, so
 * `font-bold` there sets font-FAMILY; combining it with `font-urbanist` would
 * be the same two-rules-one-property fight.
 *
 * Sizes are the reference's, verbatim. Urbanist carries the two largest steps;
 * everything below is Figtree, which is how the reference splits them too.
 */

export type DisplayStep = 'hero' | 'h1' | 'h2' | 'h3';

const URBANIST = '[font-family:Urbanist,Figtree,system-ui,sans-serif]';
const FIGTREE = '[font-family:Figtree,system-ui,sans-serif]';

const STEPS: Record<DisplayStep, string> = {
  // The hero headline. Each sentence is given [display:block] at the call
  // site so the structure is exactly two lines, not whatever the wrap
  // produces. Sized so the longer sentence fits one line down to ~500px wide;
  // below that a 33-character line cannot fit at a readable size and wraps.
  hero: `${URBANIST} [font-weight:700] text-[clamp(26px,4.2vw,58px)] leading-[1.06] tracking-[-0.03em]`,
  // The closing CTA headline, which sits on a gradient panel.
  h1: `${URBANIST} [font-weight:700] text-[clamp(32px,4.2vw,54px)] leading-[1.06] tracking-[-0.045em] [text-wrap:balance]`,
  // Every section heading. The loose 1.26 leading is deliberate: <Mark> pads an
  // inline span, and padding on an inline element does not grow the line box,
  // so a tighter heading lets the highlight overlap the line above it.
  h2: `${FIGTREE} [font-weight:700] text-[clamp(28px,3.6vw,46px)] leading-[1.26] tracking-[-0.04em] [text-wrap:balance]`,
  // Card titles.
  h3: `${FIGTREE} [font-weight:700] text-[21px] leading-[1.3] tracking-[-0.025em]`,
};

interface Props extends TextProps {
  step?: DisplayStep;
  className?: string;
}

export function Display({ step = 'h2', className = '', ...rest }: Props) {
  return <Text className={`${STEPS[step]} ${className}`} {...rest} />;
}
