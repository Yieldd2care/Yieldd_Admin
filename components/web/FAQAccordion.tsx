import { useEffect, useState } from 'react';
import { Pressable, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Line } from 'react-native-svg';

import { FOCUS } from './primitives/focus';
import { Mark } from './primitives/Mark';
import { Reveal } from './primitives/Reveal';
import { Section } from './primitives/Section';
import { SectionHeader } from './primitives/SectionHeader';

/**
 * The questions, one open at a time.
 *
 * Numbered badges and a circular toggle, on an 880px column — the reference's
 * FAQ shape.
 *
 * One real bug fixed on the way. The toggle's
 * `className="w-8 h-8 rounded-full ..."` used to sit on an Animated.View,
 * where it was silently dropped: Reanimated's Animated.View is not registered
 * in lib/nativewind-interop, and it ships pre-compiled jsx calls the babel
 * transform never rewrites, so the classes never reached the DOM. The circle
 * only looked round because the SVG inside it happened to be small. The
 * Animated.View now carries the rotation and nothing else; a plain child View
 * carries the shape.
 *
 * The background swaps between two flat colours by className, which is safe —
 * AGENTS.md's rule is about variable-backed families (shadow, transform, ring,
 * gradient), and a plain `bg-*` carries no variables.
 */

const FAQS = [
  {
    q: 'Does it work without network?',
    a: "Yes. Scanning, voice notes, and manual entry all work with no signal. Everything syncs when you're back online. You never wait for it.",
  },
  {
    q: "What happens to my leads if I don't upgrade?",
    a: "Nothing. We never delete your data. You keep capturing and you keep what you've captured. Export and voice notes are the parts that need Pro.",
  },
  {
    q: 'Can I add more than 5 users?',
    a: 'Yes, ₹6,000/year each.',
  },
  {
    q: 'We only do two shows a year.',
    a: "Message us. We'll work something out.",
  },
];

const BODY = '[font-family:Figtree,system-ui,sans-serif]';

function FAQItem({
  n,
  q,
  a,
  isOpen,
  onToggle,
}: {
  n: string;
  q: string;
  a: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const [contentHeight, setContentHeight] = useState(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(isOpen ? 1 : 0, { duration: 280 });
  }, [isOpen, progress]);

  const panelStyle = useAnimatedStyle(() => ({
    height: progress.value * contentHeight,
    opacity: progress.value,
  }));

  // Rotation only. Anything that needs a class goes on the child View.
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progress.value * 45}deg` }],
  }));

  return (
    <View className="rounded-[18px] border border-hairline bg-white overflow-hidden shadow-[0_2px_6px_rgba(11,19,43,0.05)]">
      <Pressable
        onPress={onToggle}
        className={`w-full flex-row items-center gap-[14px] px-[20px] py-[18px] ${FOCUS}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
      >
        <View className="w-[30px] h-[30px] rounded-[9px] bg-[#EAF2FF] items-center justify-center">
          <Text className={`${BODY} [font-weight:800] text-[12px] leading-none text-blue`}>
            {n}
          </Text>
        </View>

        <Text className={`${BODY} flex-1 [font-weight:700] text-[17px] leading-[1.4] text-navy`}>
          {q}
        </Text>

        <Animated.View style={iconStyle}>
          <View
            className={`w-[28px] h-[28px] rounded-full items-center justify-center ${
              isOpen ? 'bg-gold' : 'bg-surface'
            }`}
          >
            <Svg width={15} height={15} viewBox="0 0 24 24">
              <Line
                x1="12"
                y1="5"
                x2="12"
                y2="19"
                stroke={isOpen ? '#0B132B' : '#5A6B87'}
                strokeWidth={2.6}
                strokeLinecap="round"
              />
              <Line
                x1="5"
                y1="12"
                x2="19"
                y2="12"
                stroke={isOpen ? '#0B132B' : '#5A6B87'}
                strokeWidth={2.6}
                strokeLinecap="round"
              />
            </Svg>
          </View>
        </Animated.View>
      </Pressable>

      <Animated.View style={[{ overflow: 'hidden' }, panelStyle]}>
        <View
          className="absolute w-full border-t border-hairline bg-[#F9FBFF] px-[20px] pt-[16px] pb-[18px] pl-[64px]"
          onLayout={(e: LayoutChangeEvent) => setContentHeight(e.nativeEvent.layout.height)}
        >
          <Text className={`${BODY} text-[15.5px] leading-[1.7] text-slate max-w-[700px]`}>{a}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

interface Props {
  onLayout?: (e: LayoutChangeEvent) => void;
}

export function FAQAccordion({ onLayout }: Props) {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <Section tone="section" pad="lg" onLayout={onLayout} max="max-w-[880px]">
      <Reveal>
      <SectionHeader
        tone="onLight"
        eyebrow="Questions"
        title={
          <>
            What teams <Mark>ask us first.</Mark>
          </>
        }
        align="center"
      />
      </Reveal>

      <View className="gap-3 mt-10">
        {FAQS.map((item, i) => (
          <FAQItem
            key={item.q}
            n={String(i + 1).padStart(2, '0')}
            q={item.q}
            a={item.a}
            isOpen={openIndex === i}
            onToggle={() => setOpenIndex((prev) => (prev === i ? -1 : i))}
          />
        ))}
      </View>
    </Section>
  );
}
