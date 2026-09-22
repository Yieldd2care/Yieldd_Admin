import type { ReactNode } from 'react';
import { Text, View, type LayoutChangeEvent } from 'react-native';

import { AutoGrid } from './primitives/AutoGrid';
import { Display } from './primitives/Display';
import { Mark } from './primitives/Mark';
import { Reveal } from './primitives/Reveal';
import { Section } from './primitives/Section';
import { SectionHeader } from './primitives/SectionHeader';

/**
 * Capture, enrich, convert.
 *
 * Each step is a navy gradient tile with a floating white card of product UI
 * on top — the reference's arrangement. The gold arrows between the steps are
 * gone; the reference has none, and they were doing no work that the numbered
 * pills do not.
 *
 * The old StepCard also carried `shadow-[...]` on its highlighted branch and
 * `hover:shadow-[...]` on the other, which is exactly the shape AGENTS.md
 * warns about: a component that gains its first shadow class mid-life makes
 * react-native-css-interop try to upgrade it and throws a bogus "Couldn't find
 * a navigation context" red screen. There is no conditional branch here now —
 * every tile is styled identically.
 *
 * The mocks used to sit on navy, so they were white cards. They sit inside a
 * white card now, so their own surfaces became `section` and the bubbles
 * gained hairlines — otherwise they would be white on white.
 */

const BODY = '[font-family:Figtree,system-ui,sans-serif]';

function CaptureMock() {
  return (
    <View className="w-full max-w-[200px] rounded-[10px] bg-section border border-hairline p-[14px]">
      <View className="w-8 h-8 rounded-[9px] bg-gold" />
      <View className="h-[6px] w-[76%] rounded-full bg-[#C7CEDA] mt-[14px]" />
      <View className="h-[5px] w-[52%] rounded-full bg-[#C7CEDA] mt-[7px]" />
      <Text className={`${BODY} [font-weight:700] tracking-[0.14em] text-[9.5px] text-blue mt-[14px]`}>
        SCANNING
      </Text>
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
    <View className="w-full max-w-[212px] rounded-[10px] bg-section border border-hairline px-[12px] py-[10px]">
      {rows.map(([label, value]) => (
        <View
          key={label}
          className="flex-row items-center justify-between border-b border-hairline py-[7px]"
        >
          <Text className={`${BODY} [font-weight:600] tracking-[0.06em] text-[8.5px] text-slate`}>
            {label}
          </Text>
          <Text
            className={`${BODY} [font-weight:500] text-[9.5px] text-navy ml-2`}
            numberOfLines={1}
          >
            {value}
          </Text>
        </View>
      ))}
      <View className="flex-row items-center justify-between mt-[8px]">
        <Text className={`${BODY} [font-weight:600] tracking-[0.06em] text-[8.5px] text-slate`}>
          SCORE
        </Text>
        <View className="bg-gold rounded-[6px] px-[7px] py-[2px]">
          <Text className={`${BODY} [font-weight:700] text-[10px] text-navy`}>82</Text>
        </View>
      </View>
    </View>
  );
}

function ConvertMock() {
  return (
    <View className="w-full max-w-[200px] gap-[8px]">
      <View className="self-end max-w-[160px] bg-gold rounded-tl-xl rounded-tr-xl rounded-bl-xl rounded-br-[4px] px-[12px] py-[9px]">
        <Text className={`${BODY} [font-weight:700] text-[12px] leading-[15.5px] text-navy`}>
          Great meeting you at IMTEX. Brochure attached.
        </Text>
      </View>
      <Text
        className={`${BODY} self-end [font-weight:700] tracking-[0.08em] text-[8.5px] text-label`}
      >
        DELIVERED · LINK OPENED
      </Text>
      <View className="self-start max-w-[136px] bg-section border border-hairline rounded-tl-xl rounded-tr-xl rounded-br-xl rounded-bl-[4px] px-[12px] py-[9px]">
        <Text className={`${BODY} [font-weight:600] text-[12px] leading-[15.5px] text-navy`}>
          Please share the quote
        </Text>
      </View>
    </View>
  );
}

interface StepProps {
  step: string;
  title: string;
  description: string;
  mock: ReactNode;
}

function Step({ step, title, description, mock }: StepProps) {
  return (
    <View className="h-full rounded-[22px] p-[18px] pb-[24px] border border-white/[0.10] [background-image:linear-gradient(180deg,#101C3E_0%,#0B132B_100%)] shadow-[0_18px_44px_rgba(4,12,30,0.30)]">
      <View className="rounded-[14px] bg-white p-[16px] min-h-[178px] items-center justify-center shadow-[0_14px_30px_rgba(4,12,30,0.34)]">
        {mock}
      </View>

      <View className="self-start rounded-full bg-white/[0.12] border border-white/[0.18] px-[11px] py-[5px] mt-[20px]">
        <Text
          className={`${BODY} [font-weight:700] text-[10.5px] tracking-[0.12em] uppercase text-white/[0.78]`}
        >
          {step}
        </Text>
      </View>

      <Display step="h3" className="text-white mt-[12px]">
        {title}
      </Display>
      <Text className={`${BODY} text-[14.5px] leading-[1.6] text-white/[0.68] mt-[8px]`}>
        {description}
      </Text>
    </View>
  );
}

interface Props {
  onLayout?: (e: LayoutChangeEvent) => void;
}

export function HowItWorks({ onLayout }: Props) {
  return (
    <Section tone="section" pad="lg" onLayout={onLayout}>
      <Reveal>
      <SectionHeader
        tone="onLight"
        eyebrow="One simple workflow"
        title={
          <>
            Three steps. <Mark>About thirty seconds.</Mark>
          </>
        }
        align="center"
      />
      </Reveal>

      <AutoGrid min={260} gap={18} reveal className="mt-11">
        <Step
          step="Step 1"
          title="Capture"
          description="Scan a card, type a walk-in, or just talk. No signal needed."
          mock={<CaptureMock />}
        />
        <Step
          step="Step 2"
          title="Enrich"
          description="Yieldd fixes the scan, checks the details, summarises the company and scores the lead."
          mock={<EnrichMock />}
        />
        <Step
          step="Step 3"
          title="Convert"
          description="Brochure goes out on its own. Your reply lands the same day, tracked."
          mock={<ConvertMock />}
        />
      </AutoGrid>
    </Section>
  );
}
