import { useEffect, useState } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Line } from 'react-native-svg';

import { Typography } from '../ui/Typography';

const FAQS = [
  {
    q: 'Does it work without network?',
    a: "Yes. Scanning, voice notes, and manual entry all work with no signal. Everything syncs when you're back online. You never wait for it.",
  },
  {
    q: "What happens to my leads if I don't upgrade?",
    a: "Nothing. We never delete your data. You keep capturing and you keep what you've captured — export and voice notes are the parts that need Pro.",
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

function FAQItem({
  q,
  a,
  isOpen,
  onToggle,
}: {
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

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progress.value * 45}deg` }],
    backgroundColor: isOpen ? '#F4B000' : '#EEF1F7',
  }));

  return (
    <View className="border border-hairline hover:border-gold/[0.50] rounded-lg bg-white shadow-[0_2px_6px_rgba(11,19,43,0.05)] overflow-hidden transition-all duration-200">
      <Pressable
        onPress={onToggle}
        className="w-full flex-row items-center justify-between gap-6 px-[26px] py-5"
      >
        <Typography className="flex-1 text-xl font-bold tracking-tight text-navy">{q}</Typography>
        <Animated.View style={iconStyle} className="w-8 h-8 rounded-full items-center justify-center">
          <Svg width={16} height={16} viewBox="0 0 24 24">
            <Line x1="12" y1="5" x2="12" y2="19" stroke={isOpen ? '#0B132B' : '#5A6B87'} strokeWidth={2.6} strokeLinecap="round" />
            <Line x1="5" y1="12" x2="19" y2="12" stroke={isOpen ? '#0B132B' : '#5A6B87'} strokeWidth={2.6} strokeLinecap="round" />
          </Svg>
        </Animated.View>
      </Pressable>
      <Animated.View style={[{ overflow: 'hidden' }, panelStyle]}>
        <View
          className="absolute w-full px-[26px] pb-[22px]"
          onLayout={(e: LayoutChangeEvent) => setContentHeight(e.nativeEvent.layout.height)}
        >
          <Typography className="text-[16.5px] text-slate leading-[1.7] max-w-[760px]">{a}</Typography>
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
    <View onLayout={onLayout} className="bg-section border-t border-hairline px-8 py-24">
      <View className="max-w-[1200px] w-full mx-auto">
        <Typography variant="display-lg" className="text-navy">
          Frequently asked questions
        </Typography>
        <View className="gap-3 mt-10">
          {FAQS.map((item, i) => (
            <FAQItem
              key={item.q}
              q={item.q}
              a={item.a}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex((prev) => (prev === i ? -1 : i))}
            />
          ))}
        </View>
      </View>
    </View>
  );
}
