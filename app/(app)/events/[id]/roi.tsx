import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { Typography } from '../../../../components/ui/Typography';
import { ScreenHeader } from '../../../../components/app/ScreenHeader';
import { FileIcon, ShareIcon } from '../../../../components/ui/icons';

const PIPELINE = [
  { name: 'New', pct: 100, value: '190', color: '#8A98B0' },
  { name: 'Contacted', pct: 68, value: '129', color: '#1D3F8A' },
  { name: 'Qualified', pct: 34, value: '64', color: '#F4B000' },
  { name: 'Won', pct: 6, value: '12', color: '#4ED17F' },
  { name: 'Lost', pct: 9, value: '18', color: '#C23B3B' },
];

export default function ROIDashboardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
      <ScreenHeader title="ROI dashboard" />

      <ScrollView contentContainerClassName="px-5 pt-[18px] pb-6" showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Typography className="text-[13.5px] font-bold text-navy">IMTEX 2026 &middot; B-42</Typography>
            <Typography className="text-[11.5px] text-slate mt-[1px]">Day 3 of 4 &middot; Bengaluru</Typography>
          </View>
        </View>

        <View className="rounded-[20px] p-6 relative overflow-hidden" style={{ backgroundColor: '#0B132B' }}>
          <Typography className="text-[10px] font-bold tracking-[0.12em] text-white/[0.60]" style={{ textTransform: 'uppercase' }}>
            Return on investment
          </Typography>
          <View className="flex-row items-end gap-2 mt-[10px]">
            <Typography className="text-[52px] font-extrabold text-white tracking-[-0.02em]" style={{ lineHeight: 47 }}>
              142
            </Typography>
            <Typography className="text-[22px] font-extrabold text-gold pb-[6px]">%</Typography>
          </View>
          <Typography className="text-[12.5px] text-white/[0.55] mt-2">
            &#8377;6,84,000 pipeline value against &#8377;2,82,500 spent
          </Typography>
          <View className="h-px bg-white/[0.12] my-[18px]" />
          <View className="flex-row items-center justify-between">
            <Typography className="text-[12px] text-white/[0.55]">Cost per lead</Typography>
            <Typography className="text-[15px] font-bold text-white">&#8377;684</Typography>
          </View>
        </View>

        <View className="flex-row gap-3 mt-4">
          <View className="flex-1 bg-white border border-hairline rounded-2xl p-[14px]">
            <Typography className="text-[22px] font-extrabold text-navy tracking-[-0.01em]">413</Typography>
            <Typography className="text-[11.5px] text-slate mt-[3px]">Total leads</Typography>
          </View>
          <View className="flex-1 bg-white border border-hairline rounded-2xl p-[14px]">
            <Typography className="text-[22px] font-extrabold text-navy tracking-[-0.01em]">12</Typography>
            <Typography className="text-[11.5px] text-slate mt-[3px]">Deals won</Typography>
          </View>
        </View>

        <View className="flex-row items-center justify-between bg-white border border-hairline rounded-md px-4 py-[14px] mt-3">
          <Typography className="text-[12.5px] text-slate">Event cost</Typography>
          <View className="flex-row items-center gap-2">
            <Typography className="text-[15px] font-bold text-navy">&#8377;2,82,500</Typography>
            <Typography className="text-[12px] font-bold text-gold">Edit</Typography>
          </View>
        </View>

        <Typography className="text-[10px] font-bold tracking-[0.12em] text-slate mt-[22px] mb-3" style={{ textTransform: 'uppercase' }}>
          Pipeline by status
        </Typography>
        <View className="bg-white border border-hairline rounded-2xl p-4">
          {PIPELINE.map((p) => (
            <View key={p.name} className="flex-row items-center gap-[10px] mb-3">
              <View className="w-[9px] h-[9px] rounded-full" style={{ backgroundColor: p.color }} />
              <Typography className="w-[76px] text-[12px] font-semibold text-navy">{p.name}</Typography>
              <View className="flex-1 h-2 rounded-full bg-surface overflow-hidden">
                <View className="h-full rounded-full" style={{ width: `${p.pct}%`, backgroundColor: p.color }} />
              </View>
              <Typography className="w-[44px] text-right text-[12px] font-bold text-navy">{p.value}</Typography>
            </View>
          ))}
        </View>
      </ScrollView>

      <View className="bg-white border-t border-hairline flex-row gap-[10px] px-5 pt-[14px] pb-6">
        <Pressable className="flex-1 h-[52px] rounded-md bg-gold items-center justify-center flex-row gap-2 shadow-[0_10px_24px_rgba(244,176,0,0.28)]">
          <ShareIcon size={15} color="#0B132B" />
          <Typography className="text-[14.5px] font-bold text-navy">Share as image</Typography>
        </Pressable>
        <Pressable
          onPress={() => router.push({ pathname: '/(app)/events/[id]/export', params: { id: id ?? 'imtex-2026' } })}
          className="w-[52px] h-[52px] rounded-md bg-white border border-hairline items-center justify-center"
        >
          <FileIcon />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
