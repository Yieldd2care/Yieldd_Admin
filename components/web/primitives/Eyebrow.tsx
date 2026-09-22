import { type ReactNode } from 'react';
import { Text, View } from 'react-native';

/**
 * The small label that opens almost every section.
 *
 * `tone` is required rather than defaulted because getting it wrong is a real
 * defect, not a preference: gold text (#F4B000) on white measures about 1.8:1,
 * which fails WCAG AA badly and reads washed out. So on light surfaces the
 * label is navy and the gold survives as the accent chip beside it — the same
 * shape the reference uses, where the chip carries the colour and the text
 * stays dark. On navy, gold text is high-contrast and stays.
 */

interface Props {
  tone: 'onLight' | 'onDark';
  children: ReactNode;
  /** Replaces the default gold chip — e.g. a pulsing dot in the hero. */
  icon?: ReactNode;
  /** Draw the rounded pill container. Off gives a bare uppercase caption. */
  pill?: boolean;
  /**
   * How the pill sits in its parent. Explicit rather than left to a className
   * override: `self-start` and `self-center` are the same specificity, so
   * which one won would come down to their order in the stylesheet.
   */
  align?: 'start' | 'center';
  className?: string;
}

const PILL = {
  onLight: 'bg-white border border-hairline shadow-[0_2px_8px_rgba(11,19,43,0.06)]',
  onDark: 'bg-white/[0.13] border border-white/[0.20]',
} as const;

const LABEL = {
  onLight: 'text-navy',
  onDark: 'text-white',
} as const;

const BARE = {
  onLight: 'text-navy',
  onDark: 'text-gold',
} as const;

export function Eyebrow({ tone, children, icon, pill = true, align = 'start', className = '' }: Props) {
  if (!pill) {
    return (
      <View className={`flex-row items-center gap-[9px] ${align === 'center' ? 'self-center' : 'self-start'} ${className}`}>
        {icon ?? <View className="w-[7px] h-[7px] rounded-full bg-gold" />}
        <Text
          className={`[font-family:Figtree,system-ui,sans-serif] [font-weight:700] text-[11px] tracking-[0.14em] uppercase ${BARE[tone]}`}
        >
          {children}
        </Text>
      </View>
    );
  }

  return (
    <View
      className={`flex-row items-center gap-[9px] ${align === 'center' ? 'self-center' : 'self-start'} rounded-full pl-[7px] pr-[15px] py-[7px] ${PILL[tone]} ${className}`}
    >
      {/* Explicit equal width and height: in React Native a large borderRadius
          on a non-square View gives a stadium, not a circle or a squircle. */}
      {icon ?? <View className="w-[17px] h-[17px] rounded-[5px] bg-gold" />}
      <Text
        className={`[font-family:Figtree,system-ui,sans-serif] [font-weight:700] text-[13px] tracking-[0.01em] ${LABEL[tone]}`}
      >
        {children}
      </Text>
    </View>
  );
}
