import { type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { Display } from './Display';
import { Eyebrow } from './Eyebrow';

/**
 * Eyebrow + heading + lead paragraph — the block that opens eight sections.
 *
 * `title` is a ReactNode, not a string, so a <Mark> highlight can be passed
 * straight in as part of the heading's text tree:
 *
 *   <SectionHeader title={<>Three steps. About <Mark>thirty seconds</Mark>.</>} />
 */

interface Props {
  tone: 'onLight' | 'onDark';
  eyebrow?: string;
  title: ReactNode;
  lede?: string;
  align?: 'left' | 'center';
  className?: string;
}

export function SectionHeader({
  tone,
  eyebrow,
  title,
  lede,
  align = 'left',
  className = '',
}: Props) {
  const centered = align === 'center';

  return (
    <View className={`${centered ? 'items-center' : 'items-start'} ${className}`}>
      {eyebrow ? <Eyebrow tone={tone}>{eyebrow}</Eyebrow> : null}

      <Display
        step="h2"
        className={`${tone === 'onDark' ? 'text-white' : 'text-navy'} ${
          eyebrow ? 'mt-[18px]' : ''
        } ${centered ? 'text-center' : ''} max-w-[780px]`}
      >
        {title}
      </Display>

      {lede ? (
        <Text
          className={`[font-family:Figtree,system-ui,sans-serif] text-[17px] leading-[1.6] mt-[14px] max-w-[620px] ${
            tone === 'onDark' ? 'text-white/[0.72]' : 'text-slate'
          } ${centered ? 'text-center' : ''}`}
        >
          {lede}
        </Text>
      ) : null}
    </View>
  );
}
