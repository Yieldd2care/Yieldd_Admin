import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { RadialGlow } from '../../../components/ui/RadialGlow';
import { CheckIcon } from '../../../components/ui/icons';

const UNLOCKS = ['Unlimited leads unlocked', 'Follow-up pipeline unlocked', 'ROI dashboard unlocked'];

export default function PaymentSuccessScreen() {
  return (
    <SafeAreaView className="flex-1 bg-navy" edges={['top', 'bottom']}>
      <RadialGlow color="#F4B000" size={480} style={{ top: -200, left: '50%', marginLeft: -240, opacity: 0.6 }} />

      <View className="flex-1 items-center justify-center px-9">
        <View className="w-[84px] h-[84px] rounded-full bg-gold items-center justify-center shadow-[0_16px_36px_rgba(244,176,0,0.38)]">
          <CheckIcon size={34} color="#0B132B" strokeWidth={2.5} />
        </View>
        <Typography className="text-[27px] font-extrabold text-white text-center mt-[26px]">You&apos;re on Pro</Typography>
        <Typography className="text-[14px] text-white/[0.60] font-medium mt-2">&#8377;10,000 charged &middot; IMTEX 2026</Typography>

        <View className="w-full bg-white/[0.06] border border-white/[0.10] rounded-2xl px-5 py-[18px] mt-[30px] gap-3">
          {UNLOCKS.map((u) => (
            <View key={u} className="flex-row items-center gap-[10px]">
              <CheckIcon size={16} color="#F4B000" strokeWidth={2.25} />
              <Typography className="text-[13.5px] font-semibold text-white">{u}</Typography>
            </View>
          ))}
        </View>

        <Typography className="text-[12px] text-white/[0.45] text-center mt-[22px]" style={{ lineHeight: 18 }}>
          Receipt and GST invoice sent to your email &mdash; also in{' '}
          <Typography className="text-[12px] font-bold text-gold" onPress={() => router.replace('/(app)/(tabs)/profile')}>
            Settings &rsaquo; Billing
          </Typography>
          .
        </Typography>
      </View>

      <View className="px-8 pb-11">
        <Pressable
          onPress={() => router.replace('/(app)/(tabs)')}
          className="h-14 rounded-full bg-gold items-center justify-center shadow-[0_12px_28px_rgba(244,176,0,0.36)]"
        >
          <Typography className="text-[16px] font-bold text-navy">Back to scanning</Typography>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
