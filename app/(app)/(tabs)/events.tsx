import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { CalendarIcon, PlusIcon } from '../../../components/ui/icons';

type Status = 'live' | 'upcoming' | 'closed';

const EVENTS: { id: string; name: string; sub: string; status: Status; leads?: number; dayLabel?: string }[] = [
  { id: 'imtex-2026', name: 'IMTEX 2026', sub: 'Bengaluru · 18–22 Feb', status: 'live', leads: 413, dayLabel: 'Live · Day 3' },
  { id: 'plastindia-2026', name: 'Plastindia 2026', sub: 'Ahmedabad · 4–9 Apr', status: 'upcoming' },
  { id: 'auto-expo-2025', name: 'Auto Expo 2025', sub: 'New Delhi · 12–16 Nov', status: 'closed', leads: 286 },
];

const STATUS_LABEL: Record<Status, string> = { live: 'Live', upcoming: 'Upcoming', closed: 'Closed' };
const STATUS_CLASSES: Record<Status, string> = {
  live: 'bg-gold/[0.16]',
  upcoming: 'bg-blue/[0.10]',
  closed: 'bg-surface',
};
const STATUS_TEXT: Record<Status, string> = {
  live: 'text-[#8A6100]',
  upcoming: 'text-blue',
  closed: 'text-slate',
};

export default function EventListScreen() {
  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top']}>
      <View className="flex-row items-center justify-between px-5 pt-[18px] pb-2 bg-white">
        <Typography className="text-[26px] font-extrabold text-navy tracking-[-0.01em]">Events</Typography>
        <Pressable
          onPress={() => router.push('/(app)/events/new')}
          className="w-9 h-9 rounded-full bg-gold items-center justify-center shadow-[0_8px_18px_rgba(244,176,0,0.32)]"
        >
          <PlusIcon color="#0B132B" />
        </Pressable>
      </View>

      <ScrollView contentContainerClassName="px-5 pt-4 pb-8" showsVerticalScrollIndicator={false}>
        {(['live', 'upcoming', 'closed'] as Status[]).map((group) => {
          const items = EVENTS.filter((e) => e.status === group);
          if (!items.length) return null;
          return (
            <View key={group}>
              <Typography className="text-[10.5px] font-bold tracking-[0.12em] text-slate mb-[10px]" style={{ textTransform: 'uppercase' }}>
                {STATUS_LABEL[group]}
              </Typography>
              {items.map((event) => (
                <Pressable
                  key={event.id}
                  onPress={() => router.push({ pathname: '/(app)/events/[id]/dashboard', params: { id: event.id } })}
                  className={`flex-row items-center gap-[14px] bg-white border rounded-2xl p-4 mb-3 ${event.status === 'live' ? 'border-gold/[0.45] shadow-[0_10px_24px_rgba(244,176,0,0.10)]' : 'border-hairline'}`}
                >
                  <View className={`w-11 h-11 rounded-xl items-center justify-center ${event.status === 'live' ? 'bg-navy' : 'bg-surface'}`}>
                    <CalendarIcon color={event.status === 'live' ? '#F4B000' : '#0B132B'} strokeWidth={1.75} />
                  </View>
                  <View className="flex-1">
                    <Typography className="text-[14.5px] font-bold text-navy">{event.name}</Typography>
                    <Typography className="text-[12px] text-slate mt-[2px]">{event.sub}</Typography>
                  </View>
                  <View className="items-end gap-[6px]">
                    <View className={`rounded-full px-[9px] py-[4px] ${STATUS_CLASSES[event.status]}`}>
                      <Typography className={`text-[10px] font-bold ${STATUS_TEXT[event.status]}`} style={{ textTransform: 'uppercase' }}>
                        {event.dayLabel ?? STATUS_LABEL[event.status]}
                      </Typography>
                    </View>
                    {event.leads ? <Typography className="text-[12px] font-bold text-navy">{event.leads} leads</Typography> : null}
                  </View>
                </Pressable>
              ))}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
