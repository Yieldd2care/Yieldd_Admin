import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { RadialGlow } from '../../../components/ui/RadialGlow';
import { CheckIcon } from '../../../components/ui/icons';

export default function SaveConfirmationScreen() {
  useEffect(() => {
    const t = setTimeout(() => {
      router.replace('/(app)/(tabs)');
    }, 2200);
    return () => clearTimeout(t);
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-navy" edges={['top', 'bottom']}>
      <RadialGlow color="#F4B000" size={480} style={{ top: -200, left: '50%', marginLeft: -240, opacity: 0.6 }} />

      <View className="flex-1 items-center justify-center px-9">
        <View className="w-[84px] h-[84px] rounded-full bg-gold items-center justify-center shadow-[0_16px_36px_rgba(244,176,0,0.38)]">
          <CheckIcon size={34} color="#0B132B" strokeWidth={2.5} />
        </View>
        <Typography className="text-[27px] font-extrabold text-white text-center mt-[26px]" style={{ lineHeight: 32 }}>
          Rajesh Menon saved
        </Typography>
        <Typography className="text-[14px] text-white/[0.60] font-medium mt-2">Enriched, tagged, and ready to follow up</Typography>

        <View className="flex-row items-center gap-4 bg-white/[0.06] border border-white/[0.10] rounded-2xl px-7 py-[18px] mt-[34px]">
          <Typography className="text-[30px] font-extrabold text-gold tracking-[-0.01em]">19</Typography>
          <Typography className="text-[12.5px] text-white/[0.65]" style={{ lineHeight: 17 }}>
            leads captured{'\n'}today at IMTEX 2026
          </Typography>
        </View>

        <Typography className="text-[12.5px] font-semibold text-white/[0.50] mt-10">Returning to scan&#8230;</Typography>
      </View>

      <Pressable onPress={() => router.replace('/(app)/(tabs)/leads')} className="items-center pb-11">
        <Typography className="text-[13.5px] font-bold text-gold">View lead</Typography>
      </Pressable>
    </SafeAreaView>
  );
}
