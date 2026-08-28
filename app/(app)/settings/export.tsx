import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { ScreenHeader } from '../../../components/app/ScreenHeader';
import { CalendarIcon, ChevronRightIcon } from '../../../components/ui/icons';
import { EVENTS, STATUS_CLASSES, STATUS_LABEL, STATUS_TEXT, type EventStatus } from '../../../data/events';

export default function SettingsExportScreen() {
  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
      <ScreenHeader title="Export leads" />

      <ScrollView contentContainerClassName="px-5 pt-5 pb-8" showsVerticalScrollIndicator={false}>
        <Typography className="text-[13px] leading-[1.55] text-slate mb-5">
          Pick an exhibition to export its leads as an Excel file.
        </Typography>

        {(['live', 'closed'] as EventStatus[]).map((group) => {
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
                  onPress={() => router.push({ pathname: '/(app)/events/[id]/export', params: { id: event.id } })}
                  className="flex-row items-center gap-[14px] bg-white border border-hairline rounded-2xl p-4 mb-3"
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
                  <ChevronRightIcon size={16} color="#97A3B8" strokeWidth={2} />
                </Pressable>
              ))}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
