import { View } from 'react-native';
import { router } from 'expo-router';

import { Typography } from '../ui/Typography';
import { Button } from '../ui/Button';
import { RadialGlow } from '../ui/RadialGlow';

export function CTABanner() {
  return (
    <View className="relative bg-navy overflow-hidden px-8 py-[104px] items-center">
      <RadialGlow color="#1D3F8A" size={500} className="self-center -top-10" />
      <View className="max-w-[760px] w-full items-center">
        <Typography variant="display-lg" className="text-white text-center">
          Cards in. <Typography variant="display-lg" className="text-gold">Deals out.</Typography>
        </Typography>
        <Typography variant="body-lg" className="text-white/[0.76] text-center mt-5 max-w-[520px]">
          Set up your next event today. Bring the cards home as a working pipeline instead of a
          rubber band.
        </Typography>
        <View className="flex-row flex-wrap justify-center gap-[14px] mt-[34px]">
          <Button label="Create your account" onPress={() => router.push('/(auth)')} />
          <Button label="Book a demo" variant="secondary" onPress={() => {}} />
        </View>
      </View>
    </View>
  );
}
