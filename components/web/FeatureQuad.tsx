import type { ReactNode } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';

import { Typography } from '../ui/Typography';

function CaptureIcon() {
  return (
    <View className="relative w-[132px] h-[88px] rounded-[9px] bg-white border border-hairline shadow-[0_10px_24px_rgba(11,19,43,0.10)]" style={{ transform: [{ rotate: '-5deg' }] }}>
      <View className="absolute left-3 top-3 w-6 h-6 rounded-[6px] bg-gold" />
      <View className="absolute left-3 top-[46px] w-[82px] h-[6px] rounded bg-hairline" />
      <View className="absolute left-3 top-[60px] w-14 h-[5px] rounded bg-surface" />
    </View>
  );
}

function CleanDataIcon() {
  return (
    <View className="flex-row items-center gap-[14px]">
      <View className="gap-[7px]">
        {[52, 64, 44].map((w, i) => (
          <View key={i} className="flex-row items-center gap-[7px]">
            <View className="rounded bg-hairline h-[6px]" style={{ width: w }} />
            <View className="w-[7px] h-[7px] rounded-full bg-success" />
          </View>
        ))}
      </View>
      <View className="w-[22px] h-px bg-hairline" />
      <View className="w-14 h-14 rounded-[14px] bg-navy items-center justify-center">
        <Typography className="text-[19px] font-extrabold text-gold leading-none">82</Typography>
        <Typography className="text-[8px] font-bold tracking-[0.12em] text-white/[0.60] mt-[3px]">
          SCORE
        </Typography>
      </View>
    </View>
  );
}

function FollowUpIcon() {
  return (
    <View className="w-full max-w-[158px] gap-2">
      <View className="self-end max-w-[132px] bg-gold rounded-tl-[11px] rounded-tr-[11px] rounded-bl-[11px] rounded-br-[3px] px-[11px] py-[9px]">
        <Typography className="text-[11px] font-semibold text-navy leading-[1.4]">
          Brochure attached.
        </Typography>
      </View>
      <View className="self-end flex-row items-center gap-[6px]">
        <View className="w-[6px] h-[6px] rounded-full bg-success" />
        <Typography className="text-[9px] font-bold tracking-[0.1em] text-label">OPENED</Typography>
      </View>
      <View className="self-start border border-hairline rounded-[10px] bg-white px-[10px] py-2 flex-row items-center gap-2 shadow-[0_6px_16px_rgba(11,19,43,0.06)]">
        <View className="w-5 h-5 rounded-[5px] bg-gold/[0.16] border border-gold/[0.40]" />
        <Typography className="text-[10.5px] text-ink-muted">brochure.pdf</Typography>
      </View>
    </View>
  );
}

function ActivityIcon() {
  const heights = [44, 66, 88, 58, 100];
  return (
    <View className="w-full max-w-[150px] flex-row items-end justify-between gap-2 h-24">
      {heights.map((h, i) => (
        <View
          key={i}
          className={`flex-1 rounded-t-[3px] ${i === 2 ? 'bg-gold' : i === 4 ? 'bg-navy' : 'bg-hairline'}`}
          style={{ height: `${h}%` }}
        />
      ))}
    </View>
  );
}

const FEATURES: { n: string; icon: ReactNode; title: string; description: string }[] = [
  {
    n: '01',
    icon: <CaptureIcon />,
    title: 'Capture without friction',
    description: 'Card scan, manual entry or a voice remark. Works with no signal and syncs on its own.',
  },
  {
    n: '02',
    icon: <CleanDataIcon />,
    title: 'Clean data, automatically',
    description: 'Scans corrected, numbers checked, company summarised, duplicates caught, lead scored.',
  },
  {
    n: '03',
    icon: <FollowUpIcon />,
    title: 'Follow up the same day',
    description: 'Templates and your file library on WhatsApp and email, with the brochure sent automatically.',
  },
  {
    n: '04',
    icon: <ActivityIcon />,
    title: 'See who did what, when',
    description: 'Assignment, first-touch time, permissions and Excel export in one dashboard.',
  },
];

interface Props {
  onLayout?: (e: LayoutChangeEvent) => void;
}

export function FeatureQuad({ onLayout }: Props) {
  return (
    <View onLayout={onLayout} className="bg-white px-8 py-[104px]">
      <View className="max-w-[1200px] w-full mx-auto">
        <Typography variant="caption" className="text-gold">
          What you get
        </Typography>
        <Typography variant="display-lg" className="text-navy mt-4">
          Everything the booth needs.
        </Typography>
        <Typography className="text-[16.5px] text-slate mt-[14px] max-w-[520px] leading-[1.65]">
          Mobile for the booth, web for the office. One login, same data.
        </Typography>

        <View className="flex-col md:flex-row mt-14">
          {FEATURES.map((f, i) => (
            <View
              key={f.n}
              className={`flex-1 gap-5 px-0 md:px-[30px] py-6 md:py-0 ${
                i > 0 ? 'md:border-l border-hairline border-t md:border-t-0' : ''
              }`}
            >
              <View className="h-[150px] items-center justify-center">{f.icon}</View>
              <View className="flex-row items-baseline gap-[11px] pt-1 border-t border-hairline">
                <Typography className="text-[17px] font-extrabold tracking-[0.04em] text-gold w-[26px] pt-4">
                  {f.n}
                </Typography>
                <Typography variant="heading-md" className="flex-1 text-navy pt-4">
                  {f.title}
                </Typography>
              </View>
              <Typography className="text-[15.5px] text-slate leading-[1.65]">{f.description}</Typography>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
