import { Alert, Pressable, View } from 'react-native';
import { router } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { SheetShell } from '../../../components/app/SheetShell';
import { CheckIcon, WhatsAppIcon } from '../../../components/ui/icons';

const FEATURES = ['Unlimited leads, every event', 'Follow-up pipeline & reminders', 'Live ROI dashboard'];

export default function UpgradeSheetModal() {
  return (
    <SheetShell>
      <View className="flex-row items-center gap-2">
        <View className="w-4 h-4 rounded-full bg-success items-center justify-center">
          <CheckIcon size={9} color="#fff" strokeWidth={3.5} />
        </View>
        <Typography className="text-[12px] font-bold text-[#2E9C61]">Lead 101 saved</Typography>
      </View>

      <Typography className="text-[21px] font-extrabold text-navy tracking-[-0.01em] mt-3" style={{ lineHeight: 27 }}>
        You&apos;ve outgrown the free plan
      </Typography>
      <Typography className="text-[13.5px] text-slate mt-2" style={{ lineHeight: 20 }}>
        100 leads was generous for one show. Pro removes the cap, unlocks follow-ups, and shows you the ROI number your MD actually wants.
      </Typography>

      <View className="gap-[11px] mt-5">
        {FEATURES.map((f) => (
          <View key={f} className="flex-row items-center gap-[10px]">
            <CheckIcon size={17} color="#F4B000" strokeWidth={2.25} />
            <Typography className="text-[13.5px] font-semibold text-navy">{f}</Typography>
          </View>
        ))}
      </View>

      <View className="flex-row items-center justify-between bg-section rounded-2xl px-[18px] py-4 mt-5">
        <View>
          <Typography className="text-[22px] font-extrabold text-navy tracking-[-0.01em]">&#8377;10,000</Typography>
          <Typography className="text-[12.5px] text-slate font-semibold">per event</Typography>
        </View>
        <Typography className="text-[11.5px] text-slate text-right" style={{ maxWidth: 150, lineHeight: 16 }}>
          Less than half a day of stall staffing
        </Typography>
      </View>

      <View className="gap-[10px] mt-[22px]">
        <Pressable
          onPress={() => router.replace('/(app)/payment/success')}
          className="h-[54px] rounded-md bg-gold items-center justify-center shadow-[0_10px_24px_rgba(244,176,0,0.30)]"
        >
          <Typography className="text-[15px] font-bold text-navy">Pay with UPI</Typography>
        </Pressable>
        <Pressable
          onPress={() => Alert.alert('Talk to sales', "Messaging sales isn't wired up yet.")}
          className="h-[52px] rounded-md bg-white border border-hairline items-center justify-center flex-row gap-2"
        >
          <WhatsAppIcon size={16} color="#25D366" />
          <Typography className="text-[14px] font-bold text-navy">Talk to sales</Typography>
        </Pressable>
      </View>
      <Pressable onPress={() => router.back()} className="items-center mt-[14px]">
        <Typography className="text-[13px] font-bold text-slate">Keep scanning on Free</Typography>
      </Pressable>
    </SheetShell>
  );
}
