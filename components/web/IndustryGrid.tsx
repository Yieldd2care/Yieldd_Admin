import { Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { AutoGrid } from './primitives/AutoGrid';
import { ConcentricRings } from './primitives/ConcentricRings';
import { Display } from './primitives/Display';
import { DotGrid } from './primitives/DotGrid';
import { Eyebrow } from './primitives/Eyebrow';
import { GrainOverlay } from './primitives/GrainOverlay';

/**
 * Who this is for.
 *
 * The one dark panel between the hero and the closing CTA — the reference puts
 * a radial navy panel at roughly this point in the page, and the rhythm needs
 * something to break up a long light stretch.
 *
 * The reference arranges its tiles radially around a centred text block: two
 * left, two right, copy in the middle. That works for its four one-line role
 * labels and not for these, which each carry a sentence and a list of
 * industries. So the panel is the reference's; the tiles inside it stay a
 * four-up grid, and no copy is lost to fit a shape.
 */

const ICON_PROPS = {
  width: 28,
  height: 28,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: '#F4B000',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const INDUSTRIES = [
  {
    title: 'Industrial',
    description:
      'Long buying cycles where the quote follows a technical conversation at the stall.',
    tags: 'Manufacturing · Machinery & engineering · Building materials',
    icon: (
      <Svg {...ICON_PROPS}>
        <Path d="M2 20h20V9l-6 4V9l-6 4V4H2v16z" />
        <Line x1="6" y1="20" x2="6" y2="16" />
        <Line x1="11" y1="20" x2="11" y2="16" />
        <Line x1="16" y1="20" x2="16" y2="16" />
      </Svg>
    ),
  },
  {
    title: 'Process & life sciences',
    description: 'Regulated buyers who need the right document sent the same day.',
    tags: 'Pharma & healthcare · Chemicals · Food & ingredients',
    icon: (
      <Svg {...ICON_PROPS}>
        <Path d="M9 3h6M10 3v6L4.5 18a2 2 0 0 0 1.7 3h11.6a2 2 0 0 0 1.7-3L14 9V3" />
        <Line x1="7" y1="14" x2="17" y2="14" />
      </Svg>
    ),
  },
  {
    title: 'Trade & distribution',
    description: 'High visitor volume where speed at the booth decides who replies first.',
    tags: 'Textiles & apparel · Logistics · Real estate',
    icon: (
      <Svg {...ICON_PROPS}>
        <Path d="M2 7h11v9H2z" />
        <Path d="M13 11h4l4 3v2h-8z" />
        <Circle cx="6" cy="18" r="2" />
        <Circle cx="17" cy="18" r="2" />
      </Svg>
    ),
  },
  {
    title: 'Services & tech',
    description: 'Consultative sales that live on follow-up quality, not badge counts.',
    tags: 'IT & electronics · Financial services · Education',
    icon: (
      <Svg {...ICON_PROPS}>
        <Rect x="2" y="4" width="20" height="13" rx="2" />
        <Line x1="8" y1="21" x2="16" y2="21" />
        <Line x1="12" y1="17" x2="12" y2="21" />
      </Svg>
    ),
  },
];

const BODY = '[font-family:Figtree,system-ui,sans-serif]';

interface Props {
  onLayout?: (e: LayoutChangeEvent) => void;
}

export function IndustryGrid({ onLayout }: Props) {
  return (
    <View onLayout={onLayout} className="bg-white px-5 md:px-8 py-[56px] md:py-[72px]">
      <View className="max-w-[1280px] w-full mx-auto">
        <View className="relative rounded-[32px] overflow-hidden px-6 md:px-10 py-[56px] md:py-[68px] [background-image:linear-gradient(170deg,#101C3E_0%,#0B132B_60%,#0B132B_100%)] shadow-[0_30px_70px_rgba(4,12,30,0.28)]">
          <ConcentricRings sizes={[1240, 940, 640]} originY={0.5} />
          <DotGrid opacity={0.1} />
          <View className="absolute inset-0 [background-image:radial-gradient(70%_50%_at_50%_-4%,rgba(255,255,255,0.13),transparent_70%)]" />
          <GrainOverlay opacity={0.2} />

          <View className="items-center">
            <Eyebrow tone="onDark" align="center">
              Where business happens
            </Eyebrow>
            <Display step="h2" className="text-white text-center mt-[18px] max-w-[760px]">
              Built for any team that sells face to face.
            </Display>
            <Text
              className={`${BODY} text-[16.5px] leading-[1.6] text-white/[0.68] text-center mt-[14px] max-w-[580px]`}
            >
              Your lists, your fields, your templates. Set them once for the company, then adjust
              per event.
            </Text>
          </View>

          <AutoGrid min={244} gap={16} className="mt-11">
            {INDUSTRIES.map((industry) => (
              <View
                key={industry.title}
                className="h-full rounded-[18px] bg-white/[0.06] border border-white/[0.14] p-[20px]"
              >
                {/* Equal width and height keeps this a rounded square rather
                    than a stadium. */}
                <View className="w-[52px] h-[52px] rounded-[15px] bg-white/[0.08] border border-white/[0.12] items-center justify-center">
                  {industry.icon}
                </View>

                <Text
                  className={`${BODY} [font-weight:700] text-[16px] leading-[1.35] text-white mt-[16px]`}
                >
                  {industry.title}
                </Text>
                <Text
                  className={`${BODY} text-[14px] leading-[1.6] text-white/[0.66] mt-[8px]`}
                >
                  {industry.description}
                </Text>

                <View className="mt-auto pt-[16px]">
                  <View className="h-px bg-white/[0.12]" />
                  {/* A floor of two lines, so the rule above sits at the same
                      height in every card. One of these tag lists wraps to one
                      line and the rest to two, and mt-auto hugs the text — so
                      without this the hairlines step up and down across the
                      row. min-height, not height: a third line still fits. */}
                  <Text
                    className={`${BODY} [font-weight:600] text-[12.5px] leading-[1.6] text-white/[0.52] mt-[12px] min-h-[2.6em]`}
                  >
                    {industry.tags}
                  </Text>
                </View>
              </View>
            ))}
          </AutoGrid>
        </View>
      </View>
    </View>
  );
}
