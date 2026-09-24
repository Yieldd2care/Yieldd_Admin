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
 * An earlier version of this file rebuilt a fake dashboard out of Views - it
 * looked plausible and showed nothing the product actually does.
 *
 * The asset is rendered and cropped AT BUILD TIME from the HTML source in
 * design/dash-home-redesign, not trimmed at render: 1891x963, cut just above
 * the "Team today" row so the shot stays shallow and every card in it is
 * whole. Cropping the file rather than the layout is what keeps this
 * component simple - the frame and the image share one aspect ratio, so
 * nothing overflows and nothing is clipped.
 *
 * Doing it the other way round is a trap worth recording. react-native-web
 * renders Image as <div><img>, moves an `aspectRatio` style onto that wrapper,
 * and - for a require()d asset - also writes the intrinsic pixel size out as
 * an explicit width/height. That explicit height beats both the aspect ratio
 * and `inset: 0`, so the element keeps its natural height inside a shorter
 * frame and resizeMode="cover" crops the SIDES to compensate, quietly cutting
 * off the sidebar and the search field. Absolute positioning plus an explicit
 * 100%/100% is what finally overrides it.
 * ---------------------------------------------------------------------- */

const DASHBOARD = require('../../assets/product/dashboard-home.jpg');
const DASHBOARD_ASPECT = 1891 / 963;

function ProductShot() {
  return (
    /* A slight backward tilt. Written as a raw `transform` property rather
       than Tailwind's rotate-x/perspective utilities: those compile to
       --tw-* variables, and AGENTS.md records that a component gaining a
       variable-backed class trips react-native-css-interop. A plain CSS
       transform carries no variables. The origin is the top edge so the shot
       leans away from the reader rather than sinking into the page. */
    <View className="[transform:perspective(2200px)_rotateX(3deg)] [transform-origin:50%_0%]">
      {/* Bezel. A translucent outer shell with its own hairline, so the white
          screenshot has something to sit in instead of ending abruptly
          against the navy. */}
      <View className="rounded-[20px] bg-white/[0.07] border border-white/[0.16] p-[7px] shadow-[0_2px_6px_rgba(4,12,30,0.22),0_20px_44px_rgba(4,12,30,0.38),0_64px_120px_rgba(4,12,30,0.46)]">
        {/* The window itself. */}
        <View className="rounded-[14px] overflow-hidden bg-white">
          {/* A one-pixel highlight along the top edge. This is what sells the
              bevel - a lit edge reads as a raised surface where a flat border
              reads as a sticker. */}
          <View pointerEvents="none" className="absolute top-0 left-0 right-0 h-px bg-white/[0.55] z-10" />

          <View className="flex-row items-center gap-[7px] px-4 py-[11px] border-b border-hairline bg-white">
            <View className="w-[9px] h-[9px] rounded-full bg-hairline" />
            <View className="w-[9px] h-[9px] rounded-full bg-hairline" />
            <View className="w-[9px] h-[9px] rounded-full bg-hairline" />
            <Text className="[font-family:Figtree,system-ui,sans-serif] text-[11.5px] text-label ml-[10px]">
              app.yieldd.co
            </Text>
          </View>

          {/* The wrapper owns the aspect ratio; the image fills it absolutely
              with explicit 100%/100%, which is what overrides the intrinsic
              size react-native-web writes onto a require()d asset. */}
          <View className="w-full overflow-hidden" style={{ aspectRatio: DASHBOARD_ASPECT }}>
            <Image
              source={DASHBOARD}
              style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
              resizeMode="cover"
              accessibilityLabel="The Yieldd dashboard showing leads captured, cost per lead and return on spend for a live event"
            />
          </View>
        </View>
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
