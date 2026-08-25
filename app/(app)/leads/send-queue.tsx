import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { WhatsAppIcon } from '../../../components/ui/icons';

const TOTAL = 8;

export default function SendQueueScreen() {
  const [sent, setSent] = useState(3);
  const remaining = TOTAL - sent;
  const progress = (sent / TOTAL) * 100;

  const advance = () => {
    if (sent >= TOTAL - 1) {
      router.back();
      return;
    }
    setSent((s) => s + 1);
  };

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between px-5 pt-[18px] pb-4">
        <Typography className="text-[19px] font-bold text-navy">Sending follow-ups</Typography>
        <Pressable onPress={() => router.back()}>
          <Typography className="text-[13px] font-bold text-slate">Cancel</Typography>
        </Pressable>
      </View>

      <View className="px-5">
        <View className="flex-row items-center justify-between mb-2">
          <Typography className="text-[12px] font-bold text-slate">{sent} of {TOTAL} sent</Typography>
          <Typography className="text-[12px] font-bold text-slate">{remaining} remaining</Typography>
        </View>
        <View className="h-[6px] rounded-full bg-surface overflow-hidden">
          <View className="h-full bg-gold rounded-full" style={{ width: `${progress}%` }} />
        </View>
      </View>

      <View className="flex-1 items-center justify-center px-8">
        <Typography className="text-[10px] font-bold tracking-[0.12em] text-slate" style={{ textTransform: 'uppercase' }}>
          Up next
        </Typography>
        <View className="w-full bg-white border border-hairline rounded-[20px] p-7 mt-4">
          <View className="w-16 h-16 rounded-[18px] bg-gold items-center justify-center self-center">
            <Typography className="text-[24px] font-extrabold text-navy">A</Typography>
          </View>
          <Typography className="text-[17px] font-bold text-navy text-center mt-4">Amit Shah</Typography>
          <Typography className="text-[12.5px] text-slate text-center mt-[2px]">Prime Fabtech</Typography>

          <View className="bg-section rounded-[10px] px-[14px] py-3 mt-[18px]">
            <Typography className="text-[12.5px] text-navy" style={{ lineHeight: 19 }}>
              Hi Amit, great meeting you at IMTEX 2026. Sharing our brochure &mdash; let us know if you&apos;d like a quote.
            </Typography>
          </View>

          <View className="flex-row gap-[10px] mt-6">
            <Pressable onPress={advance} className="flex-1 h-[50px] rounded-md bg-white border border-hairline items-center justify-center">
              <Typography className="text-[14px] font-bold text-navy">Skip</Typography>
            </Pressable>
            <Pressable
              onPress={advance}
              className="flex-[2] h-[50px] rounded-md bg-gold items-center justify-center flex-row gap-[7px] shadow-[0_8px_20px_rgba(244,176,0,0.28)]"
            >
              <WhatsAppIcon size={14} color="#25D366" />
              <Typography className="text-[14.5px] font-bold text-navy">Open in WhatsApp</Typography>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
