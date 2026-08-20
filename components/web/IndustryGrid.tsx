import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { Typography } from '../ui/Typography';

const INDUSTRIES = [
  {
    title: 'Industrial',
    description: 'Long buying cycles where the quote follows a technical conversation at the stall.',
    tags: 'Manufacturing · Machinery & engineering · Building materials',
    icon: (
      <Svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="#F4B000" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
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
      <Svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="#F4B000" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
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
      <Svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="#F4B000" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
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
      <Svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="#F4B000" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <Rect x="2" y="4" width="20" height="13" rx="2" />
        <Line x1="8" y1="21" x2="16" y2="21" />
        <Line x1="12" y1="17" x2="12" y2="21" />
      </Svg>
    ),
  },
];

interface Props {
  onLayout?: (e: LayoutChangeEvent) => void;
}

export function IndustryGrid({ onLayout }: Props) {
  return (
    <View onLayout={onLayout} className="bg-section border-b border-hairline px-8 py-[88px]">
      <View className="max-w-[1200px] w-full mx-auto">
        <View className="pb-8 border-b border-hairline">
          <Typography variant="caption" className="text-gold">
            Where business happens
          </Typography>
          <Typography variant="display-md" className="text-navy mt-[14px] max-w-[820px]">
            Built for any team that sells face to face.
          </Typography>
          <Typography className="text-[16.5px] text-slate mt-[14px] max-w-[600px] leading-[1.65]">
            Your lists, your fields, your templates. Set them once for the company, then adjust
            per event.
          </Typography>
        </View>

        <View className="flex-col md:flex-row gap-8 mt-11">
          {INDUSTRIES.map((ind) => (
            <View key={ind.title} className="flex-1 gap-[14px]">
              <View className="w-[60px] h-[60px] rounded-[15px] bg-navy items-center justify-center">
                {ind.icon}
              </View>
              <Typography variant="heading-md" className="text-navy">
                {ind.title}
              </Typography>
              <Typography className="text-[15.5px] text-slate leading-[1.6] min-h-[75px]">
                {ind.description}
              </Typography>
              <Typography className="text-[13.5px] font-semibold text-slate leading-[1.6] pt-[14px] border-t border-hairline">
                {ind.tags}
              </Typography>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
