import { Text, type TextProps } from 'react-native';

/**
 * A marker-pen highlight around a phrase inside a heading.
 *
 * Must be rendered as a direct child of a heading's <Text> tree, never wrapped
 * in a <View>: react-native-web renders a nested <Text> as an inline <span>
 * (Text/index.js — `hasTextAncestor ? 'span' : 'div'`), which is what lets the
 * background, padding and radius flow with the line. A <View> in there becomes
 * a block <div> and breaks the line entirely.
 *
 * Renders bare <Text> for the same reason Display does — Typography's default
 * variant would inject 14.5px into the middle of a 74px headline.
 *
 * Padding is in `em` so the highlight tracks the clamped heading size instead
 * of looking cramped at the top of the clamp range.
 *
 * `.marker-clone` (global.css) rounds every line fragment rather than only the
 * first and last, for the rare case a highlight is allowed to wrap.
 */

const TONES = {
  /** Gold wash behind navy text. The default, for light sections. */
  gold: 'bg-gold/[0.28] text-navy',
  /** Solid navy behind white text, for the strongest emphasis on light. */
  navy: 'bg-navy text-white',
  /** For headings that sit on navy — a translucent gold wash, gold text. */
  onNavy: 'bg-gold/[0.16] text-gold',
} as const;

interface Props extends TextProps {
  tone?: keyof typeof TONES;
  /** Keep the phrase on one line. On by default — the reference does the same. */
  nowrap?: boolean;
  className?: string;
}

export function Mark({ tone = 'gold', nowrap = true, className = '', ...rest }: Props) {
  return (
    <Text
      className={`${TONES[tone]} marker-clone rounded-[0.16em] px-[0.16em] py-[0.05em] ${
        nowrap ? 'whitespace-nowrap' : ''
      } ${className}`}
      {...rest}
    />
  );
}
