import { Text, type TextProps } from 'react-native';

/**
 * The emphasised phrase inside a heading.
 *
 * Gold type on the section's own background — NOT a marker-pen highlight. It
 * started as the reference's highlighted span, a pale block behind the words,
 * and that block read as cheap next to everything else on the page: a flat
 * yellow rectangle with no relationship to the cards or the type around it.
 * Colour alone carries the emphasis and lets the headline stay one clean line
 * of type.
 *
 * Still renders bare <Text> rather than Typography, for the same reason
 * Display does: Typography defaults to `variant = 'body-md'`, so it would
 * inject 14.5px into the middle of a 46px heading.
 *
 * It must be a direct child of the heading's <Text> tree, never wrapped in a
 * <View>: react-native-web renders a nested <Text> as an inline <span>, which
 * is what keeps the phrase in the line flow. A <View> there becomes a block
 * <div> and breaks the line.
 */

const TONES = {
  /** Gold, for a heading on a light section. The default. */
  gold: 'text-gold',
  /** For the rare heading that wants the accent in navy instead. */
  navy: 'text-navy',
  /** On a navy surface gold still reads, so this is the same colour. */
  onNavy: 'text-gold',
} as const;

interface Props extends TextProps {
  tone?: keyof typeof TONES;
  /**
   * Keep the phrase on one line. On by default — these are deliberate
   * phrases, and the headings are sized so they fit.
   */
  nowrap?: boolean;
  className?: string;
}

export function Mark({ tone = 'gold', nowrap = true, className = '', ...rest }: Props) {
  return (
    <Text
      className={`${TONES[tone]} ${nowrap ? 'whitespace-nowrap' : ''} ${className}`}
      {...rest}
    />
  );
}
