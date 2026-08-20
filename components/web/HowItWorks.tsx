import type { ReactNode } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';

import { Typography } from '../ui/Typography';

function Arrow() {
  return (
    <View className="hidden lg:flex self-center w-[34px] h-[34px] rounded-full bg-gold items-center justify-center">
      <Typography className="text-navy text-base font-bold">→</Typography>
    </View>
  );
}

function StepCard({
  highlighted,
  mock,
  step,
  title,
  description,
}: {
  highlighted?: boolean;
  mock: ReactNode;
  step: string;
  title: string;
  description: string;
}) {
  return (
    <View
      className={`flex-1 rounded-lg bg-white overflow-hidden ${
        highlighted
          ? 'border border-gold shadow-[0_18px_40px_rgba(244,176,0,0.18)]'
          : 'border border-hairline hover:shadow-[0_20px_40px_rgba(11,19,43,0.12)]'
      }`}
    >
      <View className="h-[184px] bg-navy items-center justify-center p-5">{mock}</View>
      <View className="px-7 pt-[26px] pb-[30px]">
        <Typography className={`text-[13px] font-bold tracking-[0.16em] ${highlighted ? 'text-gold' : 'text-slate'}`}>
          {step}
        </Typography>
        <Typography variant="heading-lg" className="text-navy mt-[10px]">
          {title}
        </Typography>
        <Typography className="text-base text-slate mt-[10px] leading-[1.7]">{description}</Typography>
      </View>
    </View>
  );
}

function CaptureMock() {
  return (
    <View className="w-[196px] rounded-md bg-white p-4" style={{ transform: [{ rotate: '-4deg' }] }}>
      <View className="w-8 h-8 rounded-lg bg-gold" />
      <View className="h-[7px] w-[78%] rounded bg-hairline mt-[14px]" />
      <View className="h-[6px] w-[54%] rounded bg-surface mt-[7px]" />
      <View className="h-[6px] w-[64%] rounded bg-surface mt-[6px]" />
      <Typography className="text-[9.5px] font-bold tracking-[0.14em] text-blue mt-[14px]">
        SCANNING
      </Typography>
    </View>
  );
}

function EnrichMock() {
  const rows: [string, string][] = [
    ['PHONE', '+91 98204 41720'],
    ['EMAIL', 'rajesh@northline.co.in'],
    ['COMPANY', 'Northline Engineering'],
  ];
  return (
    <View className="w-[222px] rounded-md bg-white px-4 py-[14px]">
      {rows.map(([label, value]) => (
        <View key={label} className="flex-row items-center justify-between border-b border-surface py-[6px]">
          <Typography className="text-[10.5px] font-semibold tracking-[0.08em] text-label">{label}</Typography>
          <Typography className="text-[11.5px] text-navy">{value}</Typography>
        </View>
      ))}
      <View className="flex-row items-center justify-between mt-3">
        <Typography className="text-[10.5px] font-semibold tracking-[0.08em] text-label">SCORE</Typography>
        <View className="bg-gold rounded-[7px] px-[9px] py-[3px]">
          <Typography className="text-[12.5px] font-bold text-navy">82</Typography>
        </View>
      </View>
    </View>
  );
}

function ConvertMock() {
  return (
    <View className="w-[214px] gap-[9px]">
      <View className="self-end max-w-[172px] bg-gold rounded-tl-xl rounded-tr-xl rounded-bl-xl rounded-br-[4px] px-[13px] py-[10px]">
        <Typography className="text-[12px] font-semibold text-navy">
          Great meeting you at IMTEX. Brochure attached.
        </Typography>
      </View>
      <Typography className="self-end text-[9.5px] font-bold tracking-[0.12em] text-white/[0.60]">
        DELIVERED · LINK OPENED
      </Typography>
      <View className="self-start max-w-[152px] bg-white rounded-tl-xl rounded-tr-xl rounded-br-xl rounded-bl-[4px] px-[13px] py-[10px]">
        <Typography className="text-[12px] text-navy">Please share the quote</Typography>
      </View>
    </View>
  );
}

interface Props {
  onLayout?: (e: LayoutChangeEvent) => void;
}

export function HowItWorks({ onLayout }: Props) {
  return (
    <View onLayout={onLayout} className="bg-section border-t border-b border-hairline px-8 py-[104px]">
      <View className="max-w-[1200px] w-full mx-auto">
        <Typography variant="caption" className="text-gold">
          One simple workflow
        </Typography>
        <Typography variant="display-lg" className="text-navy mt-4">
          Three steps. About thirty seconds.
        </Typography>

        <View className="flex-col lg:flex-row gap-4 items-stretch mt-[52px]">
          <StepCard mock={<CaptureMock />} step="STEP 1" title="Capture" description="Scan a card, type a walk-in, or just talk. No signal needed." />
          <Arrow />
          <StepCard
            highlighted
            mock={<EnrichMock />}
            step="STEP 2"
            title="Enrich"
            description="Yieldd fixes the scan, checks the details, summarises the company and scores the lead."
          />
          <Arrow />
          <StepCard mock={<ConvertMock />} step="STEP 3" title="Convert" description="Brochure goes out on its own. Your reply lands the same day, tracked." />
        </View>
      </View>
    </View>
  );
}
