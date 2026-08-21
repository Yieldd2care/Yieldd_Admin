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
  bottomAnchor,
  mock,
  step,
  title,
  description,
}: {
  highlighted?: boolean;
  bottomAnchor?: boolean;
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
      <View className={`h-[184px] bg-navy items-center p-5 ${bottomAnchor ? 'justify-end' : 'justify-center'}`}>
        {mock}
      </View>
      <View className="px-7 pt-[26px] pb-[30px]">
        <Typography
          className={`font-bold tracking-[0.16em] ${highlighted ? 'text-gold' : 'text-slate'}`}
          style={{ fontSize: 13 }}
        >
          {step}
        </Typography>
        <Typography variant="heading-lg" className="text-navy mt-[10px]">
          {title}
        </Typography>
        <Typography className="text-slate mt-[10px]" style={{ fontSize: 16, lineHeight: 27 }}>
          {description}
        </Typography>
      </View>
    </View>
  );
}

function CaptureMock() {
  return (
    <View className="w-[196px] rounded-md bg-white p-4" style={{ transform: [{ rotate: '-7deg' }] }}>
      <View className="w-8 h-8 rounded-[9px] bg-gold" />
      <View className="h-[6px] w-[76%] rounded bg-[#C7CEDA] mt-[14px]" />
      <View className="h-[5px] w-[52%] rounded bg-[#C7CEDA] mt-[7px]" />
      <Typography className="font-bold tracking-[0.14em] text-blue mt-[14px]" style={{ fontSize: 9.5 }}>
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
    <View className="w-[200px] rounded-md bg-white px-3 py-[10px] shadow-[0_10px_24px_rgba(11,19,43,0.16)]">
      {rows.map(([label, value]) => (
        <View key={label} className="flex-row items-center justify-between border-b border-surface py-[7px]">
          <Typography className="font-semibold tracking-[0.06em] text-label" style={{ fontSize: 8.5 }}>
            {label}
          </Typography>
          <Typography className="font-medium text-navy ml-2" style={{ fontSize: 9.5 }} numberOfLines={1}>
            {value}
          </Typography>
        </View>
      ))}
      <View className="flex-row items-center justify-between mt-[7px]">
        <Typography className="font-semibold tracking-[0.06em] text-label" style={{ fontSize: 8.5 }}>
          SCORE
        </Typography>
        <View className="bg-gold rounded-[6px] px-[7px] py-[2px]">
          <Typography className="font-bold text-navy" style={{ fontSize: 10 }}>
            82
          </Typography>
        </View>
      </View>
    </View>
  );
}

function ConvertMock() {
  return (
    <View className="w-[190px] gap-[8px]">
      <View className="self-end max-w-[148px] bg-gold rounded-tl-xl rounded-tr-xl rounded-bl-xl rounded-br-[4px] px-[12px] py-[9px]">
        <Typography className="font-bold text-navy" style={{ fontSize: 12, lineHeight: 15.5 }}>
          Great meeting you at IMTEX. Brochure attached.
        </Typography>
      </View>
      <Typography
        className="self-end font-bold tracking-[0.08em] text-white/[0.60]"
        style={{ fontSize: 8.5 }}
      >
        DELIVERED · LINK OPENED
      </Typography>
      <View className="self-start max-w-[128px] bg-white rounded-tl-xl rounded-tr-xl rounded-br-xl rounded-bl-[4px] px-[12px] py-[9px]">
        <Typography className="font-semibold text-navy" style={{ fontSize: 12, lineHeight: 15.5 }}>
          Please share the quote
        </Typography>
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
            bottomAnchor
            mock={<EnrichMock />}
            step="STEP 2"
            title="Enrich"
            description="Yieldd fixes the scan, checks the details, summarises the company and scores the lead."
          />
          <Arrow />
          <StepCard
            bottomAnchor
            mock={<ConvertMock />}
            step="STEP 3"
            title="Convert"
            description="Brochure goes out on its own. Your reply lands the same day, tracked."
          />
        </View>
      </View>
    </View>
  );
}
