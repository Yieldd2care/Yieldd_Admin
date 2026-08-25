import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../../../../components/ui/Typography';
import { Button } from '../../../../components/ui/Button';
import { NavyGlowBackdrop } from '../../../../components/app/NavyGlowBackdrop';
import { CheckIcon, WifiIcon } from '../../../../components/ui/icons';

const SUMMARY = [
  { label: 'EVENT', value: 'IMTEX 2026 · Bengaluru' },
  { label: 'DATES', value: '18–22 Feb 2026' },
  { label: 'TEAM', value: '3 reps invited' },
  { label: 'EVENT COST', value: '₹8,40,000' },
];

export default function EventSetupCompleteScreen() {
  return (
    <SafeAreaView className="flex-1 bg-navy" edges={['top', 'bottom']}>
      <NavyGlowBackdrop />
      <ScrollView contentContainerClassName="items-center px-8 pt-[76px]" showsVerticalScrollIndicator={false}>
        <View className="w-[76px] h-[76px] rounded-full bg-gold items-center justify-center">
          <CheckIcon />
        </View>
        <Typography className="mt-6 text-[25px] font-extrabold tracking-[-0.01em] text-white text-center leading-[1.28]">
          You&apos;re set up for{'\n'}IMTEX 2026
        </Typography>
        <Typography className="mt-[10px] text-[14px] text-white/[0.62] text-center leading-[1.5] max-w-[270px]">
          Your team can start scanning the moment they sign in &mdash; nothing here needs a network.
        </Typography>

        <View className="w-full bg-white/[0.05] border border-white/[0.12] rounded-lg mt-8 overflow-hidden">
          {SUMMARY.map((row, i) => (
            <View
              key={row.label}
              className={`flex-row items-center justify-between px-[18px] py-[14px] ${
                i < SUMMARY.length - 1 ? 'border-b border-white/[0.08]' : ''
              }`}
            >
              <Typography className="text-[12.5px] text-white/[0.55]">{row.label}</Typography>
              <Typography className="text-[13.5px] font-bold text-white">{row.value}</Typography>
            </View>
          ))}
        </View>

        <View className="flex-row items-center gap-2 mt-5">
          <WifiIcon size={14} color="#F4B000" />
          <Typography className="text-[12.5px] font-semibold text-gold">Works fully offline from here on</Typography>
        </View>
      </ScrollView>

      <View className="items-center gap-[14px] px-8 pb-8 pt-4">
        <Button label="Go to home" shape="pill" onPress={() => router.replace('/(app)')} className="w-full" />
        <Pressable onPress={() => router.push('/(app)/events/new/invite')}>
          <Typography className="text-[13px] font-semibold text-white/[0.75]">Invite more reps</Typography>
        </Pressable>
        <Pressable onPress={() => router.push('/(app)/events/new')}>
          <Typography className="text-[13px] font-semibold text-white/[0.75]">Edit event details</Typography>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
