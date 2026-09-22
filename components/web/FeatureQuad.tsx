import type { ReactNode } from 'react';
import { Text, View, type LayoutChangeEvent } from 'react-native';

import { AutoGrid } from './primitives/AutoGrid';
import { Display } from './primitives/Display';
import { Donut } from './primitives/Donut';
import { Mark } from './primitives/Mark';
import { Reveal } from './primitives/Reveal';
import { Section } from './primitives/Section';
import { SectionHeader } from './primitives/SectionHeader';
import { StackedBar } from './primitives/StackedBar';
import { WebCard } from './primitives/WebCard';

/**
 * What the product does, as four cards.
 *
 * Each card ends in a small panel of product UI pushed to the bottom with
 * `mt-auto`, which is the reference's card anatomy: badge and label on top,
 * heading and copy in the middle, a picture of the thing itself at the
 * bottom. The panels line up across the row because AutoGrid stretches its
 * cells and WebCard fills them.
 *
 * The two data panels use the same splits the real dashboard shows — how
 * leads came in, and the pipeline by status — rather than invented numbers.
 */

const BODY = '[font-family:Figtree,system-ui,sans-serif]';

function CaptureIcon() {
  return (
    <View
      className="relative w-[132px] h-[88px] rounded-[9px] bg-white border border-hairline shadow-[0_10px_24px_rgba(11,19,43,0.10)]"
      style={{ transform: [{ rotate: '-5deg' }] }}
    >
      <View className="absolute left-3 top-3 w-6 h-6 rounded-[6px] bg-gold" />
      <View className="absolute left-3 top-[46px] w-[82px] h-[6px] rounded-full bg-hairline" />
      <View className="absolute left-3 top-[60px] w-14 h-[5px] rounded-full bg-surface" />
    </View>
  );
}

function CleanDataPreview() {
  return (
    <View className="w-full">
      <View className="flex-row items-center justify-between">
        <Text className={`${BODY} [font-weight:600] text-[12px] text-navy`}>How they came in</Text>
        <Text className={`${BODY} text-[12px] text-label`}>1,284</Text>
      </View>
      <StackedBar
        className="mt-[10px]"
        segments={[
          { weight: 1042, color: '#0B132B' },
          { weight: 198, color: '#F4B000' },
          { weight: 44, color: '#8FB3F5' },
        ]}
      />
      <View className="flex-row flex-wrap gap-x-[14px] gap-y-[4px] mt-[10px]">
        {[
          { label: 'Scanned', value: '1,042', color: '#0B132B' },
          { label: 'Typed', value: '198', color: '#F4B000' },
          { label: 'Voice', value: '44', color: '#8FB3F5' },
        ].map((item) => (
          <View key={item.label} className="flex-row items-center gap-[6px]">
            <View
              className="w-[7px] h-[7px] rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <Text className={`${BODY} text-[11.5px] text-slate`}>
              {item.label} {item.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function FollowUpIcon() {
  return (
    <View className="w-full max-w-[168px] gap-2">
      <View className="self-end max-w-[140px] bg-gold rounded-tl-[11px] rounded-tr-[11px] rounded-bl-[11px] rounded-br-[3px] px-[11px] py-[9px]">
        <Text className={`${BODY} [font-weight:600] text-[11px] leading-[1.4] text-navy`}>
          Brochure attached.
        </Text>
      </View>
      <View className="self-end flex-row items-center gap-[6px]">
        <View className="w-[6px] h-[6px] rounded-full bg-success" />
        <Text className={`${BODY} [font-weight:700] tracking-[0.1em] text-[9px] text-slate`}>
          OPENED
        </Text>
      </View>
      <View className="self-start border border-hairline rounded-[10px] bg-white px-[10px] py-2 flex-row items-center gap-2">
        <View className="w-5 h-5 rounded-[5px] bg-gold/[0.16] border border-gold/[0.40]" />
        <Text className={`${BODY} text-[10.5px] text-ink-muted`}>brochure.pdf</Text>
      </View>
    </View>
  );
}

function PipelinePreview() {
  const legend = [
    { label: 'New', value: '402', color: '#B9C6DC' },
    { label: 'Contacted', value: '486', color: '#0B132B' },
    { label: 'Qualified', value: '268', color: '#F4B000' },
    { label: 'Won', value: '37', color: '#4ED17F' },
  ];
  return (
    <View className="w-full flex-row items-center gap-[16px]">
      <Donut value={0.62} size={74} stroke={11} label="1,284" />
      <View className="flex-1 gap-[5px]">
        {legend.map((item) => (
          <View key={item.label} className="flex-row items-center gap-[7px]">
            <View
              className="w-[7px] h-[7px] rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <Text className={`${BODY} flex-1 text-[11.5px] text-slate`}>{item.label}</Text>
            <Text className={`${BODY} [font-weight:600] text-[11.5px] text-navy`}>
              {item.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const FEATURES: {
  n: string;
  category: string;
  title: string;
  description: string;
  preview: ReactNode;
}[] = [
  {
    n: '1',
    category: 'Capture',
    title: 'Capture without friction',
    description:
      'Card scan, manual entry or a voice remark. Works with no signal and syncs on its own.',
    preview: <CaptureIcon />,
  },
  {
    n: '2',
    category: 'Data',
    title: 'Clean data, automatically',
    description:
      'Scans corrected, numbers checked, company summarised, duplicates caught, lead scored.',
    preview: <CleanDataPreview />,
  },
  {
    n: '3',
    category: 'Outreach',
    title: 'Follow up the same day',
    description:
      'Templates and your file library on WhatsApp and email, with the brochure sent automatically.',
    preview: <FollowUpIcon />,
  },
  {
    n: '4',
    category: 'Visibility',
    title: 'See who did what, when',
    description: 'Assignment, first-touch time, permissions and Excel export in one dashboard.',
    preview: <PipelinePreview />,
  },
];

interface Props {
  onLayout?: (e: LayoutChangeEvent) => void;
}

export function FeatureQuad({ onLayout }: Props) {
  return (
    <Section tone="white" pad="lg" onLayout={onLayout}>
      <Reveal>
      <SectionHeader
        tone="onLight"
        eyebrow="What you get"
        title={
          <>
            Everything <Mark>the booth needs</Mark>.
          </>
        }
        lede="Mobile for the booth, web for the office. One login, same data."
        align="center"
      />
      </Reveal>

      {/* Two-up, capped. Left to fit, a 1200px container takes three 300px
          tracks and the fourth card is orphaned on a row of its own. Four
          across would fit at ~288px each, but that is too narrow for the data
          panels — 2x2 gives each card room and keeps the row balanced. */}
      <AutoGrid min={300} max={2} gap={16} reveal className="mt-11">
        {FEATURES.map((feature) => (
          <WebCard key={feature.n} pad="md" className="h-full">
            <View className="flex-row items-center justify-between gap-3">
              <View className="rounded-full bg-[#EAF2FF] px-[12px] py-[6px]">
                <Text className={`${BODY} [font-weight:700] text-[11.5px] text-blue`}>
                  #{feature.n} · {feature.category}
                </Text>
              </View>
              <Text className={`${BODY} [font-weight:700] text-[11.5px] text-label`}>
                Sample data
              </Text>
            </View>

            <View className="mt-[14px]">
              <Display step="h3" className="text-navy">
                {feature.title}
              </Display>
              <Text className={`${BODY} text-[14px] leading-[1.6] text-slate mt-[8px]`}>
                {feature.description}
              </Text>
            </View>

            {/* mt-auto is what lines the preview panels up across the row. */}
            <View className="mt-auto pt-[18px]">
              <View className="rounded-[16px] bg-section border border-hairline p-[16px] min-h-[148px] items-center justify-center">
                {feature.preview}
              </View>
            </View>
          </WebCard>
        ))}
      </AutoGrid>
    </Section>
  );
}
