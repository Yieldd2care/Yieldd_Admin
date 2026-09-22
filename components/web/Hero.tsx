import { Image, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { router } from 'expo-router';
import { MotiView } from 'moti';

import { ConcentricRings } from './primitives/ConcentricRings';
import { CTAButton } from './primitives/CTAButton';
import { Display } from './primitives/Display';
import { Eyebrow } from './primitives/Eyebrow';
import { GrainOverlay } from './primitives/GrainOverlay';

/**
 * The hero: a navy gradient panel with a rounded bottom, centred copy, and a
 * product mock that hangs off the bottom edge onto the light section below.
 *
 * The overhang is built by INSETTING the navy panel, not by giving the mock a
 * negative margin. Two reasons:
 *
 *   - The panel needs `overflow-hidden` so its 44px bottom radius actually
 *     clips the gradient, the rings and the grain. Anything inside it is
 *     clipped too, so a mock with `-mb-80` in there would simply be cut off.
 *   - A negative margin would also put the mock underneath the next section,
 *     since later siblings paint on top. Fixing that needs a z-index, which
 *     then fights whatever overlap the next section wants.
 *
 * So the section itself is light, the navy panel is an absolutely-positioned
 * layer that stops short of the bottom, and the mock simply sits in normal
 * flow crossing that edge. No clipping, no stacking, no negative margins.
 */

/** Distance the mock hangs past the navy panel. */
const PANEL_INSET = 120;
const CONTENT_PAD = 40;

function PulseDot() {
  return (
    <MotiView
      className="w-[9px] h-[9px] rounded-full bg-gold"
      from={{ scale: 1, opacity: 1 }}
      animate={{ scale: 1.35, opacity: 0.55 }}
      transition={{ type: 'timing', duration: 1200, loop: true, repeatReverse: true }}
    />
  );
}

const TRUST = [
  'Works offline on the stall floor',
  'iOS, Android and web',
  'Export to Excel any time',
];

function Tick() {
  return (
    <View className="w-[15px] h-[15px] rounded-full bg-success/[0.18] items-center justify-center">
      <View className="w-[5px] h-[5px] rounded-full bg-success" />
    </View>
  );
}

/* -------------------------------------------------------------------------
 * The product shot.
 *
 * A real screenshot of the Yieldd web dashboard, not a drawn approximation.
 * An earlier version of this file rebuilt a fake dashboard out of Views — it
 * looked plausible and showed nothing the product actually does.
 *
 * The asset is CROPPED AT BUILD TIME, not at render: the top 70% of the
 * 3024x2400 source, scaled to 2000x1111 (968KB -> 190KB, still 2x for the
 * ~1000px it displays at). Cropping here rather than in the layout is what
 * keeps this component trivial — the frame and the image share one aspect
 * ratio, so nothing has to overflow and nothing has to be clipped.
 *
 * Trying it the other way round is a trap worth recording. react-native-web's
 * Image renders <div><img></div> and moves an `aspectRatio` style onto that
 * wrapper div, not onto the <img>. So a frame with one aspect and an image
 * with another does not clip the way it reads: resizeMode="cover" resolves
 * against the wrapper's box and crops the SIDES instead, which quietly cut
 * the sidebar and the search field off this screenshot.
 * ---------------------------------------------------------------------- */

const DASHBOARD = require('../../assets/product/dashboard-home.jpg');
const DASHBOARD_ASPECT = 2000 / 1111;

function ProductShot() {
  return (
    <View className="rounded-t-[16px] overflow-hidden bg-white shadow-[0_-18px_50px_rgba(4,12,30,0.24),0_40px_90px_rgba(4,12,30,0.32)]">
      {/* Browser chrome, so the screenshot reads as a product in a window
          rather than a picture dropped onto the page. */}
      <View className="flex-row items-center gap-[7px] px-4 py-[11px] border-b border-hairline bg-white">
        <View className="w-[9px] h-[9px] rounded-full bg-hairline" />
        <View className="w-[9px] h-[9px] rounded-full bg-hairline" />
        <View className="w-[9px] h-[9px] rounded-full bg-hairline" />
        <Text className="[font-family:Figtree,system-ui,sans-serif] text-[11.5px] text-label ml-[10px]">
          app.yieldd.co
        </Text>
      </View>

      {/* The wrapper owns the aspect ratio; the image fills it absolutely.
          Putting `aspectRatio` on the Image itself does not work here:
          react-native-web resolves a require()d asset's intrinsic size and
          writes it out as an explicit `height`, which beats the aspect-ratio
          it sets alongside. The element then stays 1111px tall instead of
          555px, and resizeMode crops to compensate.

          Absolute positioning alone is not enough either - the intrinsic
          width/height still beat `inset: 0`. The explicit 100%/100% is what
          finally overrides them, so the image is exactly the wrapper's box
          and resizeMode has nothing left to crop. */}
      <View className="w-full overflow-hidden" style={{ aspectRatio: DASHBOARD_ASPECT }}>
        <Image
          source={DASHBOARD}
          style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
          resizeMode="cover"
          accessibilityLabel="The Yieldd dashboard showing leads captured, cost per lead and return on spend for a live event"
        />
      </View>
    </View>
  );
}

interface Props {
  onLayout?: (e: LayoutChangeEvent) => void;
  onNavigate: (key: string) => void;
}

export function Hero({ onLayout, onNavigate }: Props) {
  return (
    <View onLayout={onLayout} className="relative bg-section pt-[94px]">
      {/* The navy panel. Clipped and rounded, and stopping PANEL_INSET short of
          the section's bottom so the mock can cross the edge. */}
      <View
        pointerEvents="none"
        className="absolute top-0 left-0 right-0 rounded-b-[44px] overflow-hidden [background-image:linear-gradient(170deg,#0B132B_0%,#101C3E_54%,#0B132B_100%)]"
        style={{ bottom: PANEL_INSET }}
      >
        <ConcentricRings sizes={[1100, 820, 560]} originY={0.04} />
        {/* A soft top glow. Written as a real radial-gradient rather than with
            RadialGlow, whose stacked flat circles show their edges at this
            size — a limitation already noted in components/dash/hero.tsx. */}
        <View className="absolute inset-0 [background-image:radial-gradient(62%_46%_at_50%_4%,rgba(255,255,255,0.12),transparent_70%)]" />
        <GrainOverlay opacity={0.26} />
      </View>

      <View
        className="px-5 md:px-8 pt-[52px] md:pt-[68px]"
        style={{ paddingBottom: CONTENT_PAD }}
      >
        <View className="max-w-[1080px] w-full mx-auto items-center">
          <Eyebrow tone="onDark" align="center" icon={<PulseDot />}>
            Lead management, without the wait
          </Eyebrow>

          {/* Exactly two lines. Each sentence is its own block, so the
              structure never depends on where the text happens to wrap.

              [display:block] also fixes the gradient: react-native-web leaves
              a nested Text inline, and a clipped gradient on a wrapping inline
              box runs its ramp once per line fragment — which made the second
              line of the white sentence render grey. One block per line means
              one ramp per line. */}
          <Display step="hero" className="text-center mt-[22px] max-w-[1060px]">
            <Text className="text-gradient [display:block] [background-image:linear-gradient(180deg,#FFFFFF_10%,rgba(255,255,255,0.82)_100%)]">
              You spent ₹12 lakh on that stall.
            </Text>
            <Text className="text-gradient [display:block] [background-image:linear-gradient(180deg,#FFC53D_8%,#F4B000_100%)]">
              Can you say what came back?
            </Text>
          </Display>

          <Text className="[font-family:Figtree,system-ui,sans-serif] text-[17px] leading-[1.6] text-white/[0.74] text-center mt-[20px] max-w-[660px]">
            Your team meets hundreds of people at an exhibition. Most of those cards never become
            conversations. Yieldd captures every lead in seconds, cleans it up automatically, and
            sends the first follow-up before anyone leaves the stall.
          </Text>

          <View className="flex-row flex-wrap items-center justify-center gap-[12px] mt-[28px]">
            <CTAButton
              label="Start capturing leads free"
              onPress={() => router.push('/(auth)')}
            />
            {/* Was a no-op in the previous hero; now it goes somewhere. */}
            <CTAButton
              label="See how it works"
              variant="outline"
              spin={false}
              onPress={() => onNavigate('how')}
            />
          </View>

          <View className="flex-row flex-wrap items-center justify-center gap-x-[22px] gap-y-[10px] mt-[24px]">
            {TRUST.map((item) => (
              <View key={item} className="flex-row items-center gap-[8px]">
                <Tick />
                <Text className="[font-family:Figtree,system-ui,sans-serif] text-[13.5px] text-white/[0.76]">
                  {item}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View className="max-w-[1000px] w-full mx-auto mt-[48px] md:mt-[56px]">
          <ProductShot />
        </View>
      </View>
    </View>
  );
}
