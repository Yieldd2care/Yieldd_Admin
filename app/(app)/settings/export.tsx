import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { ScreenHeader } from '../../../components/app/ScreenHeader';
import { CalendarIcon, ChevronRightIcon } from '../../../components/ui/icons';
import { STATUS_CLASSES, STATUS_LABEL, STATUS_TEXT, type EventStatus } from '../../../data/events';
import { useEvents } from '../../../hooks/useEvents';

export default function SettingsExportScreen() {
  const { data: events, isLoading } = useEvents();

  /**
   * An event is exportable when it has leads. Nothing else.
   *
   * This used to filter on `status !== 'upcoming'`, with a comment claiming
   * there was nothing to export yet. That was an assumption about the calendar,
   * not a fact about the data: `status` is derived from the dates, so a show
   * starting in two days reads as `upcoming` while already holding leads
   * captured at a pre-registration, a soft opening, or by a rep testing. Those
   * leads existed and could not be exported.
   *
   * `fetchEvents` counts them in the same query (`leads(count)`, defaulting to
   * 0), so this costs nothing extra and is the honest signal.
   */
  const exportable = events?.filter((e) => (e.leads ?? 0) > 0) ?? [];

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
      <ScreenHeader title="Export leads" />

      <ScrollView contentContainerClassName="px-5 pt-5 pb-8" showsVerticalScrollIndicator={false}>
        <Typography className="text-[13px] leading-[1.55] text-slate mb-5">
          Pick an exhibition to export its leads as an Excel file.
        </Typography>

        {/* `upcoming` belongs here now — without its own group an event with
            leads would pass the filter above and then have nowhere to render.
            Same order the Events tab uses, so the two screens read alike. */}
        {(['live', 'upcoming', 'closed'] as EventStatus[]).map((group) => {
          const items = exportable.filter((e) => e.status === group);
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

        {!isLoading && !exportable.length ? (
          <Typography className="text-[13.5px] text-slate text-center mt-10 leading-[1.5]">
            Nothing to export yet &mdash; an event appears here as soon as it has its first lead.
          </Typography>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
