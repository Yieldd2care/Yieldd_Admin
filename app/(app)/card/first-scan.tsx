import { Alert, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { Button } from '../../../components/ui/Button';
import { NavyGlowBackdrop } from '../../../components/app/NavyGlowBackdrop';
import { CameraIcon } from '../../../components/ui/icons';

export default function FirstScanPromptScreen() {
  return (
    <SafeAreaView className="flex-1 bg-navy" edges={['top', 'bottom']}>
      <NavyGlowBackdrop />
      <View className="flex-1 items-center pt-[88px] px-8">
        <View className="w-[220px] h-[220px] rounded-full bg-white/[0.05] border border-white/[0.14] items-center justify-center">
          <View className="w-[130px] h-[82px] border-2 border-dashed border-gold rounded-[10px]" />
        </View>
        <Typography className="mt-8 text-[23px] font-extrabold tracking-[-0.01em] text-white text-center">
          Try it on a real card
        </Typography>
        <Typography className="mt-[10px] text-[14px] text-white/[0.62] text-center leading-[1.5] max-w-[270px]">
          Grab any business card from your wallet and see Yieldd turn it into a lead in seconds.
        </Typography>
      </View>

      <View className="items-center gap-[14px] px-8 pb-8">
        <Button
          label="Scan a card"
          shape="pill"
          icon={<CameraIcon size={18} />}
          onPress={() => Alert.alert('Coming soon', 'Camera capture is being designed next.')}
          className="w-full"
        />
        <Pressable onPress={() => router.replace('/(app)')}>
          <Typography className="text-[13px] font-semibold text-white/[0.75]">Skip to home</Typography>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
