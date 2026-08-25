import { Alert, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { BellIcon, ClockIcon, UsersIcon, WifiIcon } from '../../../components/ui/icons';
import { useSessionStore } from '../../../stores/useSessionStore';

function stubComingSoon(what: string) {
  Alert.alert('Coming soon', `${what} isn't designed yet.`);
}

export default function HomeScreen() {
  const user = useSessionStore((s) => s.user);
  const initial = user?.name?.trim()?.[0]?.toUpperCase() ?? 'Y';

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top']}>
      <View className="flex-row items-center justify-between px-5 pt-5">
        <View className="w-[34px] h-[34px] rounded-md bg-gold items-center justify-center">
          <Typography className="text-[13.5px] font-extrabold text-navy">{initial}</Typography>
        </View>
        <Pressable
          onPress={() => stubComingSoon('Notifications')}
          className="w-[34px] h-[34px] rounded-md bg-white border border-hairline items-center justify-center"
        >
          <BellIcon />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center gap-3 bg-navy-elevated rounded-lg mx-5 mt-5 px-4 py-[14px]">
          <View className="w-[34px] h-[34px] rounded-full bg-success/[0.16] items-center justify-center">
            <WifiIcon />
          </View>
          <View className="flex-1">
            <Typography className="text-[13.5px] font-bold text-white">Works fully offline</Typography>
            <Typography className="text-[11.5px] text-white/[0.55] mt-[2px]">
              Nothing here needs signal &mdash; syncs when you&apos;re back
            </Typography>
          </View>
        </View>

        <Pressable onPress={() => stubComingSoon('Switching events')} className="items-center pt-10 px-8">
          <Typography variant="caption" className="text-slate">
            IMTEX 2026 &middot; B-42
          </Typography>
          <Typography className="mt-[10px] text-[44px] leading-none font-extrabold tracking-[-0.02em] text-navy">
            18
          </Typography>
          <Typography className="mt-1 text-[14.5px] text-slate">leads captured today</Typography>
        </Pressable>

        <View className="flex-row gap-3 px-5 pt-8">
          <Pressable
            onPress={() => router.push('/(app)/(tabs)/leads')}
            className="flex-1 bg-white border border-hairline rounded-lg p-4 gap-[10px]"
          >
            <View className="w-9 h-9 rounded-md bg-surface items-center justify-center">
              <UsersIcon />
            </View>
            <View>
              <Typography className="text-[20px] font-extrabold tracking-[-0.01em] text-navy">64</Typography>
              <Typography className="text-[12.5px] text-slate mt-[2px]">Leads this event</Typography>
            </View>
          </Pressable>
          <Pressable
            onPress={() => router.push('/(app)/follow-ups')}
            className="flex-1 bg-white border border-hairline rounded-lg p-4 gap-[10px]"
          >
            <View className="w-9 h-9 rounded-md bg-surface items-center justify-center">
              <ClockIcon />
            </View>
            <View>
              <Typography className="text-[20px] font-extrabold tracking-[-0.01em] text-navy">7</Typography>
              <Typography className="text-[12.5px] text-slate mt-[2px]">Follow-ups due</Typography>
            </View>
          </Pressable>
        </View>

        <View className="h-[100px]" />
      </ScrollView>
    </SafeAreaView>
  );
}
