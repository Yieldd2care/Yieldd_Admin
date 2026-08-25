import { useState } from 'react';
import { Pressable, TextInput as RNTextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { ChevronLeftIcon, EditIcon } from '../../../components/ui/icons';

type Temp = 'Hot' | 'Warm' | 'Cold';
const DATES = ['Tomorrow', 'In 3 days', 'Next week', 'Custom'] as const;

export default function EveningReviewScreen() {
  const [remaining, setRemaining] = useState(9);
  const [note, setNote] = useState('Looking to replace their current supplier by Q2 — wants a site visit before deciding.');
  const [temp, setTemp] = useState<Temp>('Hot');
  const [date, setDate] = useState<(typeof DATES)[number]>('Tomorrow');

  const next = () => {
    if (remaining <= 1) {
      router.back();
      return;
    }
    setRemaining((r) => r - 1);
    setNote('');
    setTemp('Hot');
    setDate('Tomorrow');
  };

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between px-5 pt-[18px] pb-4">
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => router.back()} className="w-[34px] h-[34px] rounded-md bg-surface items-center justify-center">
            <ChevronLeftIcon />
          </Pressable>
          <Typography className="text-[19px] font-bold text-navy">Evening review</Typography>
        </View>
        <Pressable onPress={() => router.back()}>
          <Typography className="text-[13px] font-bold text-slate">Exit</Typography>
        </Pressable>
      </View>

      <View className="flex-row items-center gap-[14px] bg-white border-b border-hairline px-5 pt-[14px] pb-[18px]">
        <Stat num="23" label="captured today" />
        <View className="w-px h-8 bg-hairline" />
        <Stat num="14" label="need a note" gold />
        <View className="w-px h-8 bg-hairline" />
        <Stat num={`${remaining} of 14`} label="remaining" />
      </View>

      <View className="flex-1 px-5 pt-[22px]">
        <View className="flex-1 bg-white border border-hairline rounded-[18px] p-5">
          <View className="flex-row items-center gap-3">
            <View className="w-11 h-11 rounded-xl bg-gold items-center justify-center">
              <Typography className="text-[16px] font-extrabold text-navy">S</Typography>
            </View>
            <View className="flex-row items-center gap-[6px]">
              <Typography className="text-[16px] font-bold text-navy">Sneha Kulkarni</Typography>
              <EditIcon size={12} color="#5A6B87" />
            </View>
          </View>
          <Typography className="text-[11.5px] text-slate mt-[2px] ml-[56px]">Plant Manager &middot; Vertex Industries</Typography>

          <Typography className="text-[12px] font-bold tracking-[0.04em] text-slate mt-5 mb-2" style={{ textTransform: 'uppercase' }}>
            What did you talk about?
          </Typography>
          <RNTextInput
            value={note}
            onChangeText={setNote}
            multiline
            placeholder="Add a note&#8230;"
            placeholderTextColor="#97A3B8"
            className="border border-hairline rounded-md p-[14px] text-[13.5px] text-navy bg-section"
            style={{ minHeight: 76, textAlignVertical: 'top' }}
          />

          <Typography className="text-[12px] font-bold tracking-[0.04em] text-slate mt-5 mb-2" style={{ textTransform: 'uppercase' }}>
            Mark as
          </Typography>
          <View className="flex-row gap-2">
            {(['Hot', 'Warm', 'Cold'] as Temp[]).map((t) => (
              <Pressable
                key={t}
                onPress={() => setTemp(t)}
                className={`flex-1 h-11 rounded-md items-center justify-center border ${temp === t ? 'bg-gold border-gold' : 'border-hairline'}`}
              >
                <Typography className={`text-[13px] font-bold ${temp === t ? 'text-navy' : 'text-slate'}`}>{t}</Typography>
              </Pressable>
            ))}
          </View>

          <Typography className="text-[12px] font-bold tracking-[0.04em] text-slate mt-5 mb-2" style={{ textTransform: 'uppercase' }}>
            Follow up
          </Typography>
          <View className="flex-row flex-wrap gap-2">
            {DATES.map((d) => (
              <Pressable
                key={d}
                onPress={() => setDate(d)}
                className={`rounded-full px-[14px] py-[9px] ${date === d ? 'bg-navy' : 'bg-surface'}`}
              >
                <Typography className={`text-[12.5px] font-semibold ${date === d ? 'text-white' : 'text-navy'}`}>{d}</Typography>
              </Pressable>
            ))}
          </View>

          <View className="flex-row gap-[10px] mt-auto pt-[18px]">
            <Pressable onPress={next} className="flex-1 h-[50px] rounded-md bg-white border border-hairline items-center justify-center">
              <Typography className="text-[14px] font-bold text-navy">Skip</Typography>
            </Pressable>
            <Pressable onPress={next} className="flex-[2] h-[50px] rounded-md bg-gold items-center justify-center shadow-[0_8px_20px_rgba(244,176,0,0.28)]">
              <Typography className="text-[14.5px] font-bold text-navy">Next lead</Typography>
            </Pressable>
          </View>
        </View>
      </View>
      <View className="h-6" />
    </SafeAreaView>
  );
}

function Stat({ num, label, gold }: { num: string; label: string; gold?: boolean }) {
  return (
    <View className="flex-1">
      <Typography className={`text-[22px] font-extrabold tracking-[-0.01em] ${gold ? 'text-gold' : 'text-navy'}`}>{num}</Typography>
      <Typography className="text-[11.5px] text-slate mt-[1px]">{label}</Typography>
    </View>
  );
}
