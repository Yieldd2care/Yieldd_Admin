import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { ScreenHeader } from '../../../components/app/ScreenHeader';
import { PlayIcon, RewindIcon, TrashIcon } from '../../../components/ui/icons';

const WAVE = [18, 30, 22, 44, 26, 56, 34, 20, 40, 28, 50, 24, 32, 46, 20, 38, 54, 26, 30, 42, 18, 36, 48, 22, 28, 34, 20, 26];

export default function VoiceNoteScreen() {
  const [recorded, setRecorded] = useState(true);

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
      <ScreenHeader title="Voice note" />

      <View className="flex-1 items-center justify-center px-8 gap-[34px]">
        <View className="items-center">
          <Typography className="text-[44px] font-extrabold text-navy tracking-[-0.01em]" style={{ fontVariant: ['tabular-nums'] }}>
            00:14
          </Typography>
          <Typography className="text-[12px] font-bold tracking-[0.10em] text-slate -mt-[6px]" style={{ textTransform: 'uppercase' }}>
            {recorded ? 'Recorded' : 'Recording'}
          </Typography>
        </View>

        <View className="flex-row items-center gap-1 h-14">
          {WAVE.map((h, i) => (
            <View key={i} className={`w-1 rounded-[3px] ${h > 26 ? 'bg-gold' : 'bg-hairline'}`} style={{ height: h }} />
          ))}
        </View>

        <View className="relative w-[100px] h-[100px] items-center justify-center">
          <View className="absolute inset-0 rounded-full border-2 border-gold/[0.25]" />
          <Pressable
            onPress={() => setRecorded((r) => !r)}
            className="w-[76px] h-[76px] rounded-full bg-gold items-center justify-center shadow-[0_14px_30px_rgba(244,176,0,0.38)]"
          >
            {recorded ? <PlayIcon size={22} color="#0B132B" /> : <View className="w-6 h-6 rounded-md bg-navy" />}
          </Pressable>
        </View>

        <View className="flex-row items-center gap-7">
          <Pressable
            onPress={() => Alert.alert('Rewind', "Seeking playback isn't wired up yet.")}
            className="w-[46px] h-[46px] rounded-full bg-white border border-hairline items-center justify-center"
          >
            <RewindIcon />
          </Pressable>
          <Pressable
            onPress={() => router.back()}
            className="w-[46px] h-[46px] rounded-full bg-white border border-hairline items-center justify-center"
          >
            <TrashIcon />
          </Pressable>
        </View>
      </View>

      <View className="bg-white border-t border-hairline px-5 pt-[14px] pb-6">
        <Pressable onPress={() => router.back()} className="h-[54px] rounded-md bg-gold items-center justify-center shadow-[0_10px_24px_rgba(244,176,0,0.30)]">
          <Typography className="text-[16px] font-bold text-navy">Attach to lead</Typography>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
