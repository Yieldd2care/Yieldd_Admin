import { View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { router } from 'expo-router';
import { MotiView } from 'moti';

import { Typography } from '../ui/Typography';
import { Button } from '../ui/Button';
import { RadialGlow } from '../ui/RadialGlow';

const TAGS = ['WORKS OFFLINE', 'IOS · ANDROID · WEB', 'EXCEL EXPORT'];

function PulseDot() {
  return (
    <MotiView
      className="w-2 h-2 rounded-full bg-gold"
      from={{ scale: 1, opacity: 1 }}
      animate={{ scale: 1.3, opacity: 0.6 }}
      transition={{ type: 'timing', duration: 1200, loop: true, repeatReverse: true }}
    />
  );
}

function HeroArt() {
  return (
    <View className="h-[460px] items-center justify-center hidden lg:flex">
      <View style={{ position: 'relative', width: 300 }}>
        <MotiView
          className="rounded-full border border-gold/[0.10]"
          style={{ position: 'absolute', width: 420, height: 420, left: 150 - 210, top: 162 - 210 }}
          from={{ rotate: '0deg' }}
          animate={{ rotate: '360deg' }}
          transition={{ type: 'timing', duration: 70000, loop: true, easing: (t) => t }}
        />
        <MotiView
          className="rounded-full border border-white/[0.06]"
          style={{ position: 'absolute', width: 330, height: 330, left: 150 - 165, top: 162 - 165 }}
          from={{ rotate: '0deg' }}
          animate={{ rotate: '-360deg' }}
          transition={{ type: 'timing', duration: 90000, loop: true, easing: (t) => t }}
        />
        <RadialGlow color="#1D3F8A" size={230} style={{ left: 150 - 115, top: 162 - 115 }} />

        <MotiView
          className="border border-hairline rounded-lg bg-white p-3 shadow-[0_20px_44px_rgba(0,0,0,0.55)]"
          style={{ position: 'absolute', zIndex: 1, left: -65, top: 137, width: 108 }}
          from={{ translateY: 0, rotate: '-7deg' }}
          animate={{ translateY: 9, rotate: '-7deg' }}
          transition={{ type: 'timing', duration: 2100, loop: true, repeatReverse: true }}
        >
          <View className="w-6 h-6 rounded-[7px] bg-gold" />
          <View className="h-[6px] w-[76%] rounded bg-[#C7CEDA] mt-[10px]" />
          <View className="h-[5px] w-[52%] rounded bg-[#C7CEDA] mt-[6px]" />
          <Typography className="text-[9px] font-bold tracking-[0.12em] text-blue mt-[10px]">
            SCANNING
          </Typography>
        </MotiView>

        <MotiView
          className="w-[300px] rounded-lg bg-navy-elevated border border-white/[0.32] p-[22px] shadow-[0_26px_60px_rgba(0,0,0,0.5)]"
          style={{ position: 'relative', zIndex: 10 }}
          from={{ translateY: 0 }}
          animate={{ translateY: -10 }}
          transition={{ type: 'timing', duration: 2500, loop: true, repeatReverse: true }}
        >
          <View className="flex-row items-center justify-between">
            <Typography className="text-[11px] font-semibold tracking-[0.1em] text-white/[0.70]">
              IMTEX 2026 · B-42
            </Typography>
            <Typography className="text-[11px] font-bold tracking-[0.1em] text-gold">DAY 2</Typography>
          </View>
          <View className="flex-row gap-[10px] mt-4">
            <View className="flex-1 border border-white/[0.14] rounded-md bg-white/[0.04] px-[14px] py-3">
              <Typography className="text-[26px] font-extrabold text-white leading-none">248</Typography>
              <Typography className="text-[11.5px] text-white/[0.62] mt-[5px]">Leads captured</Typography>
            </View>
            <View className="flex-1 border border-gold/[0.35] rounded-md bg-gold/[0.10] px-[14px] py-3">
              <Typography className="text-[26px] font-extrabold text-gold leading-none">61</Typography>
              <Typography className="text-[11.5px] text-white/[0.62] mt-[5px]">Marked hot</Typography>
            </View>
          </View>
          <View className="mt-4 border-t border-white/[0.12] pt-[14px] gap-3">
            <View className="flex-row items-center gap-[10px]">
              <View className="w-[34px] h-[34px] rounded-[9px] bg-gold" />
              <View className="flex-1">
                <Typography className="text-[13.5px] font-semibold text-white">Rajesh Menon</Typography>
                <Typography className="text-[11.5px] text-white/[0.58]">Purchase Head · Northline</Typography>
              </View>
              <Typography className="text-[12px] font-bold text-gold">82</Typography>
            </View>
            <View className="flex-row items-center gap-[10px]">
              <View className="w-[34px] h-[34px] rounded-[9px] bg-white/[0.07] border border-white/[0.14]" />
              <View className="flex-1">
                <Typography className="text-[13.5px] font-semibold text-white">Sneha Kulkarni</Typography>
                <Typography className="text-[11.5px] text-white/[0.58]">Plant Manager · Vertex</Typography>
              </View>
              <Typography className="text-[12px] font-bold text-white/[0.60]">64</Typography>
            </View>
          </View>
        </MotiView>

        <MotiView
          className="border border-white/[0.32] rounded-lg bg-navy-elevated px-[18px] py-[14px] shadow-[0_18px_40px_rgba(0,0,0,0.45)]"
          style={{ position: 'absolute', zIndex: 3, left: 210, top: 322, width: 168 }}
          from={{ translateY: 0 }}
          animate={{ translateY: -10 }}
          transition={{ type: 'timing', duration: 2300, loop: true, repeatReverse: true }}
        >
          <Typography className="text-[9.5px] font-bold tracking-[0.1em] text-white/[0.70]" numberOfLines={1}>
            FIRST FOLLOW-UP
          </Typography>
          <Typography className="text-[26px] font-extrabold text-white mt-[6px] leading-none">
            4 min
          </Typography>
          <Typography className="text-[11.5px] text-gold">brochure delivered</Typography>
        </MotiView>

        <View
          className="rounded-lg bg-gold shadow-[0_10px_26px_rgba(244,176,0,0.34)]"
          style={{ position: 'absolute', zIndex: 9, left: -37, top: 413, width: 36, height: 36 }}
        />
      </View>
    </View>
  );
}

interface Props {
  onLayout?: (e: LayoutChangeEvent) => void;
}

export function Hero({ onLayout }: Props) {
  const { width } = useWindowDimensions();
  const isWide = width > 1080;

  return (
    <View onLayout={onLayout} className="relative bg-navy overflow-hidden px-8 pt-24 pb-32">
      <RadialGlow color="#1D3F8A" size={520} className="right-0 top-0" />
      <View className="max-w-[1200px] w-full mx-auto flex-col lg:flex-row gap-14 items-center">
        <View className="flex-1 w-full">
          <View className="flex-row items-center gap-[11px]">
            <PulseDot />
            <Typography variant="caption" className="text-gold">
              Lead management, without the wait
            </Typography>
          </View>
          <Typography variant="display-xl" className="text-white mt-[22px] max-w-2xl">
            You spent ₹12 lakh on that stall. <Typography variant="display-xl" className="text-gold">Can you say what came back?</Typography>
          </Typography>
          <Typography variant="body-lg" className="text-white/[0.76] mt-[26px] max-w-[520px]">
            Your team meets hundreds of people at an exhibition. Most of those cards never become
            conversations. Yieldd captures every lead in seconds, cleans it up automatically, and
            sends the first follow-up before anyone leaves the stall.
          </Typography>
          <View className="flex-row flex-wrap items-center gap-[14px] mt-9">
            <Button label="Start capturing leads free" onPress={() => router.push('/(auth)')} />
            <Button label="See how it works" variant="secondary" onPress={() => {}} />
          </View>
          <View className="flex-row flex-wrap gap-[20px] mt-[28px]">
            {TAGS.map((tag) => (
              <Typography key={tag} className="text-[10.5px] font-semibold tracking-[0.1em] text-white/[0.70]">
                {tag}
              </Typography>
            ))}
          </View>
        </View>
        {isWide ? (
          <View className="flex-1 w-full">
            <HeroArt />
          </View>
        ) : null}
      </View>
    </View>
  );
}
