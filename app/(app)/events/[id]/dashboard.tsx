import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';

import { Typography } from '../../../../components/ui/Typography';
import { Toggle } from '../../../../components/ui/Toggle';
import { ScreenHeader } from '../../../../components/app/ScreenHeader';
import { RefreshIcon } from '../../../../components/ui/icons';

const HOURLY = [12, 28, 45, 62, 80, 100, 74, 58, 30];
const REPS = [
  { rank: '1', initial: 'R', name: 'Rajesh Menon', count: 142 },
  { rank: '2', initial: 'S', name: 'Sneha Kulkarni', count: 118 },
  { rank: '3', initial: 'A', name: 'Amit Shah', count: 96 },
  { rank: '4', initial: 'K', name: 'Kavita Rao', count: 57 },
];

export default function EventDashboardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [leaderboardVisible, setLeaderboardVisible] = useState(true);

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
      <ScreenHeader
        title="IMTEX 2026"
        right={
          <Pressable className="w-[34px] h-[34px] rounded-md bg-surface items-center justify-center">
            <RefreshIcon />
          </Pressable>
        }
      />

      <ScrollView contentContainerClassName="px-5 pt-[18px] pb-8" showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center gap-[6px] mb-[14px]">
          <View className="w-[6px] h-[6px] rounded-full bg-success" />
          <Typography className="text-[11.5px] font-bold text-slate">As of last sync &middot; 6 min ago</Typography>
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1 rounded-2xl p-4" style={{ backgroundColor: '#101C3E' }}>
            <Typography className="text-[26px] font-extrabold text-white tracking-[-0.01em]">47</Typography>
            <Typography className="text-[11.5px] text-white/[0.55] mt-[3px]">Leads today</Typography>
          </View>
          <View className="flex-1 bg-white border border-hairline rounded-2xl p-4">
            <Typography className="text-[26px] font-extrabold text-navy tracking-[-0.01em]">413</Typography>
            <Typography className="text-[11.5px] text-slate mt-[3px]">Cumulative</Typography>
          </View>
        </View>

        <Typography className="text-[10px] font-bold tracking-[0.12em] text-slate mt-[22px] mb-3" style={{ textTransform: 'uppercase' }}>
          Capture rate by hour
        </Typography>
        <View className="bg-white border border-hairline rounded-2xl p-4">
          <View className="flex-row items-end gap-[6px]" style={{ height: 70 }}>
            {HOURLY.map((pct, i) => (
              <View
                key={i}
                className={`flex-1 rounded-t-[4px] ${pct === 100 ? 'bg-gold' : 'bg-surface'}`}
                style={{ height: `${pct}%` }}
              />
            ))}
          </View>
          <View className="flex-row justify-between mt-2">
            {['9am', '11am', '1pm', '3pm', '5pm'].map((l) => (
              <Typography key={l} className="text-[9.5px] font-semibold text-slate">{l}</Typography>
            ))}
          </View>
        </View>

        <View className="flex-row items-center justify-between mt-[22px] mb-3">
          <Typography className="text-[10px] font-bold tracking-[0.12em] text-slate" style={{ textTransform: 'uppercase' }}>
            Rep-wise leaderboard
          </Typography>
          <View className="flex-row items-center gap-2">
            <Typography className="text-[11px] font-bold text-slate">Visible to reps</Typography>
            <Toggle value={leaderboardVisible} onValueChange={setLeaderboardVisible} />
          </View>
        </View>
        <View className="bg-white border border-hairline rounded-2xl px-4">
          {REPS.map((rep, i) => (
            <View key={rep.rank} className={`flex-row items-center gap-3 py-3 ${i < REPS.length - 1 ? 'border-b border-section' : ''}`}>
              <Typography className={`w-[18px] text-[12.5px] font-extrabold ${i === 0 ? 'text-gold' : 'text-slate'}`}>{rep.rank}</Typography>
              <View className="w-8 h-8 rounded-[9px] bg-surface items-center justify-center">
                <Typography className="text-[12.5px] font-extrabold text-navy">{rep.initial}</Typography>
              </View>
              <Typography className="text-[13px] font-semibold text-navy flex-1">{rep.name}</Typography>
              <Typography className="text-[13px] font-bold text-navy">{rep.count}</Typography>
            </View>
          ))}
        </View>

        <Pressable
          onPress={() => router.push({ pathname: '/(app)/events/[id]/roi', params: { id: id ?? 'imtex-2026' } })}
          className="h-[52px] rounded-md bg-navy items-center justify-center mt-6"
        >
          <Typography className="text-[14.5px] font-bold text-white">View ROI dashboard</Typography>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
