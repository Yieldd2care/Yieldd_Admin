import { Image, Pressable, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';

import { Typography } from '../ui/Typography';
import { RadialGlow } from '../ui/RadialGlow';

const FEATURES = [
  'Card scan, manual entry and voice notes',
  'Works fully offline, syncs on its own',
  'Automatic follow-up on WhatsApp and email',
  'Excel export and per-event reporting',
];

export function AuthLeftPanel() {
  const { width } = useWindowDimensions();
  const isWide = width >= 1024;

  return (
    <View className="hidden lg:flex relative bg-navy overflow-hidden px-8 py-10 lg:px-14 lg:py-11 lg:flex-1 lg:justify-between gap-10 lg:gap-0">
      <RadialGlow color="#1D3F8A" size={620} className="-right-32 -bottom-40" />

      <Pressable onPress={() => router.push('/(web)')}>
        <Image
          source={require('../../assets/brand/yieldd-lockup-transparent.png')}
          style={isWide ? { width: 208, height: 128 } : { width: 160, height: 96 }}
          resizeMode="contain"
        />
      </Pressable>

      <View className="max-w-[440px] gap-5">
        <View className="flex-row items-center gap-[11px]">
          <View className="w-2 h-2 rounded-full bg-gold" />
          <Typography variant="caption" className="text-gold">
            Free to start
          </Typography>
        </View>
        <Typography variant="display-lg" className="text-white">
          Your next event starts here.
        </Typography>
        <Typography variant="body-lg" className="text-white/[0.76]">
          Create the event, invite your team, start scanning. Everything captured at the booth
          lands in one place, cleaned and ready to follow up.
        </Typography>
        <View className="gap-[14px] mt-2">
          {FEATURES.map((f) => (
            <View key={f} className="flex-row items-center gap-3">
              <View className="w-[6px] h-[6px] rounded-full bg-gold" />
              <Typography className="text-[15.5px] text-white/[0.88] flex-shrink">{f}</Typography>
            </View>
          ))}
        </View>
      </View>

      <Typography className="text-[11.5px] font-semibold tracking-[0.14em] text-white/[0.45]">
        A PRODUCT BY GROWTH SAGA · CARE@YIELDD.CO
      </Typography>
    </View>
  );
}
