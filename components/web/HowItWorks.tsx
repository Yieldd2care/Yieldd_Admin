import { Image, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

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
 * Each tile shows a photograph of the step actually happening - scanning a
 * card on a stand, the enriched lead on a laptop, the handshake that follows.
 * They replace three mini-UIs drawn out of Views, which looked plausible and
 * showed nothing real.
 *
 * The source files are 1456x1080 PNGs of 1.6-2MB each. They ship as 900px
 * JPEGs, 250KB for all three rather than 5.3MB, which is still 2x for the
 * ~370px they are displayed at.
 *
 * The wrapper owns the aspect ratio and the image absolutely fills it with an
 * explicit 100%/100%. react-native-web writes a require()d asset's intrinsic
 * pixel size onto the element as a hard width/height, and that beats both
 * `aspectRatio` and `inset: 0` - the same trap the hero screenshot hit.
 */

const STEP_IMAGES = {
  capture: require('../../assets/product/step-capture.jpg'),
  enrich: require('../../assets/product/step-enrich.jpg'),
  convert: require('../../assets/product/step-convert.jpg'),
} as const;

const STEP_ASPECT = 900 / 668;

const BODY = '[font-family:Figtree,system-ui,sans-serif]';

interface StepProps {
  step: string;
  title: string;
  description: string;
  image: keyof typeof STEP_IMAGES;
  alt: string;
}

function Step({ step, title, description, image, alt }: StepProps) {
  return (
    <View className="h-full rounded-[22px] p-[18px] pb-[24px] border border-white/[0.10] [background-image:linear-gradient(180deg,#101C3E_0%,#0B132B_100%)] shadow-[0_18px_44px_rgba(4,12,30,0.30)]">
      <View
        className="rounded-[14px] overflow-hidden bg-navy shadow-[0_14px_30px_rgba(4,12,30,0.34)]"
        style={{ aspectRatio: STEP_ASPECT }}
      >
        <Image
          source={STEP_IMAGES[image]}
          style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
          resizeMode="cover"
          accessibilityLabel={alt}
        />
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
          image="capture"
          alt="A business card being scanned with the Yieldd app on a phone, at an exhibition stand"
        />
        <Step
          step="Step 2"
          title="Enrich"
          description="Yieldd fixes the scan, checks the details, summarises the company and scores the lead."
          image="enrich"
          alt="The enriched lead open on a laptop, showing the company summary and a lead score"
        />
        <Step
          step="Step 3"
          title="Convert"
          description="Brochure goes out on its own. Your reply lands the same day, tracked."
          image="convert"
          alt="A handshake over a signed client onboarding checklist"
        />
      </AutoGrid>
    </Section>
  );
}
