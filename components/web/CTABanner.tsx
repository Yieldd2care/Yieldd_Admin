import { Text, View } from 'react-native';
import { router } from 'expo-router';

import { ConcentricRings } from './primitives/ConcentricRings';
import { CTAButton } from './primitives/CTAButton';
import { Display } from './primitives/Display';
import { DotGrid } from './primitives/DotGrid';
import { GrainOverlay } from './primitives/GrainOverlay';

/**
 * The closing panel.
 *
 * A rounded gradient panel rather than a full-bleed navy band, so the page
 * ends on an object rather than just running out. Rings, dot lattice and grain
 * sit inside its own clipped layer.
 *
 * The four glass pills restate claims the page has already made — nothing new
 * is asserted here.
 *
 * The old second button ("Book a demo") was a no-op: it had an empty onPress
 * and went nowhere. A button that does nothing is worse than no button, so it
 * is gone and the panel carries a single call to action.
 */

const PILLS = [
  { label: 'Capture', value: 'About 30 seconds' },
  { label: 'Follow-up', value: 'Before they leave' },
  { label: 'Signal', value: 'Works offline' },
  { label: 'Export', value: 'Excel any time' },
];

const BODY = '[font-family:Figtree,system-ui,sans-serif]';

export function CTABanner() {
  return (
    <View className="bg-section px-5 md:px-8 py-[72px] md:py-[88px]">
      <View className="max-w-[1200px] w-full mx-auto">
        <View className="relative rounded-[28px] overflow-hidden px-6 md:px-8 py-[64px] md:py-[76px] items-center [background-image:linear-gradient(165deg,#0B132B_0%,#101C3E_58%,#0B132B_100%)] shadow-[0_30px_70px_rgba(4,12,30,0.32)]">
          <ConcentricRings sizes={[1240, 940, 640]} originY={0.3} />
          <DotGrid opacity={0.12} />
          <View className="absolute inset-0 [background-image:radial-gradient(60%_50%_at_50%_0%,rgba(255,255,255,0.13),transparent_70%)]" />
          <GrainOverlay opacity={0.22} />

          <View className="max-w-[760px] w-full items-center">
            {/* The reference's two-tone close: a small light line above a
                full-size one. */}
            <Display step="h1" className="text-center">
              <Text className="[display:block] [font-size:0.72em] text-white/[0.68]">Cards in.</Text>
              <Text className="[display:block] text-white">Deals out.</Text>
            </Display>

            <Text
              className={`${BODY} text-[16.5px] leading-[1.6] text-white/[0.74] text-center mt-[18px] max-w-[540px]`}
            >
              Set up your next event today. Bring the cards home as a working pipeline instead of a
              rubber band.
            </Text>

            <View className="flex-row flex-wrap justify-center gap-[10px] mt-[26px] max-w-[560px]">
              {PILLS.map((pill) => (
                <View
                  key={pill.label}
                  className="flex-row items-center gap-[9px] rounded-full bg-white/[0.10] border border-white/[0.20] px-[15px] py-[9px]"
                >
                  <View className="w-[6px] h-[6px] rounded-full bg-gold" />
                  <Text className={`${BODY} text-[12.5px] text-white/[0.66]`}>{pill.label}</Text>
                  <Text className={`${BODY} [font-weight:700] text-[12.5px] text-white`}>
                    {pill.value}
                  </Text>
                </View>
              ))}
            </View>

            <CTAButton
              label="Create your account"
              onPress={() => router.push('/(auth)')}
              align="center"
              className="mt-[30px]"
            />

            <Text className={`${BODY} text-[13px] text-white/[0.52] mt-[14px] text-center`}>
              Free to start. No card needed.
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
