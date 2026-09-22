import { Text, View } from 'react-native';

import { AutoGrid } from './primitives/AutoGrid';
import { Mark } from './primitives/Mark';
import { ProgressBar } from './primitives/ProgressBar';
import { Section } from './primitives/Section';
import { SectionHeader } from './primitives/SectionHeader';
import { WebCard } from './primitives/WebCard';

/**
 * Why a stall leaks leads.
 *
 * The timeline card is the reference's "the damage is already done" device,
 * carrying this section's own argument rather than any new claim: cards pile
 * up during the show, someone types them in afterwards, and the first message
 * goes out days later. Deliberately no invented day counts or lead totals —
 * the copy below already says "days later", so the picture says the same.
 */

const STAGES = [
  {
    when: 'During the show',
    what: 'Cards pile into a pocket',
    tone: 'wait' as const,
  },
  {
    when: 'After the show',
    what: 'Someone starts typing them up',
    tone: 'wait' as const,
  },
  {
    when: 'Days later',
    what: 'The first message finally goes out',
    tone: 'late' as const,
  },
];

const POINTS = [
  {
    n: '01',
    text: 'A pocket full of cards and a notebook of scribbles. By the time anyone types them into a sheet, the context is gone.',
  },
  {
    n: '02',
    text: 'The first message goes out days later, when the buyer has already spoken to competitors who replied the same evening.',
  },
  {
    n: '03',
    text: "Stall, travel, printing, people. Nobody can say what the event produced, so next year's budget is a guess.",
  },
];

const BODY = '[font-family:Figtree,system-ui,sans-serif]';

function Timeline() {
  return (
    <WebCard pad="lg" lift={false} className="mt-10">
      <View className="flex-row items-center justify-between flex-wrap gap-2">
        <Text className={`${BODY} [font-weight:700] text-[15px] text-navy`}>
          One exhibition, start to finish
        </Text>
        <Text className={`${BODY} [font-weight:600] text-[13px] text-[#C2410C]`}>
          Your competitor replied the same evening
        </Text>
      </View>

      <AutoGrid min={210} gap={12} className="mt-[18px]">
        {STAGES.map((stage) => (
          <View
            key={stage.when}
            className={`h-full rounded-[14px] px-[16px] py-[14px] ${
              stage.tone === 'late' ? 'bg-[#EAF2FF]' : 'bg-[#FFF8F1]'
            }`}
          >
            <Text
              className={`${BODY} [font-weight:700] text-[11px] tracking-[0.1em] uppercase ${
                stage.tone === 'late' ? 'text-blue' : 'text-[#A05B06]'
              }`}
            >
              {stage.when}
            </Text>
            <Text className={`${BODY} text-[14px] leading-[1.5] text-navy mt-[6px]`}>
              {stage.what}
            </Text>
          </View>
        ))}
      </AutoGrid>

      {/* The bar is mostly "still waiting". The hard stop is the moment the
          first reply goes out, which is the whole point of the section. */}
      <ProgressBar
        value={0.72}
        height={10}
        color="#E8A33D"
        trackColor="#1D3F8A"
        className="mt-[20px]"
      />
      <View className="flex-row items-center justify-between mt-[10px]">
        <Text className={`${BODY} text-[12px] text-slate`}>Stall opens</Text>
        <Text className={`${BODY} text-[12px] text-slate`}>Show closes</Text>
        <Text className={`${BODY} [font-weight:600] text-[12px] text-blue`}>First reply</Text>
      </View>
    </WebCard>
  );
}

export function ProblemSection() {
  return (
    <Section tone="white" pad="lg">
      <SectionHeader
        tone="onLight"
        eyebrow="After the handshake"
        title={
          <>
            A stall costs lakhs. The leads <Mark>leak out for free</Mark>.
          </>
        }
      />

      <Timeline />

      <AutoGrid min={300} gap={16} className="mt-4">
        {POINTS.map((point) => (
          <WebCard key={point.n} pad="md" className="h-full">
            <View className="flex-row gap-[14px]">
              {/* Equal width and height so the badge is a square with soft
                  corners, not a stadium. */}
              <View className="w-[30px] h-[30px] rounded-[9px] bg-[#EAF2FF] items-center justify-center">
                <Text className={`${BODY} [font-weight:800] text-[12px] leading-none text-blue`}>
                  {point.n}
                </Text>
              </View>
              <Text className={`${BODY} flex-1 text-[15px] leading-[1.65] text-slate`}>
                {point.text}
              </Text>
            </View>
          </WebCard>
        ))}
      </AutoGrid>
    </Section>
  );
}
