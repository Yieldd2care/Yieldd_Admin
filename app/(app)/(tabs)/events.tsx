import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { Button } from '../../../components/ui/Button';
import { CalendarIcon, PlusIcon } from '../../../components/ui/icons';
import { STATUS_CLASSES, STATUS_LABEL, STATUS_TEXT, type EventStatus } from '../../../data/events';
import { useEvents } from '../../../hooks/useEvents';
import { useSessionStore } from '../../../stores/useSessionStore';

const GROUPS: EventStatus[] = ['live', 'upcoming', 'closed'];

export default function EventListScreen() {
  const isAdmin = useSessionStore((s) => s.user?.role === 'admin');
  const { data: events, isLoading, isRefetching, error, refetch } = useEvents();

  const isEmpty = !isLoading && !error && !events?.length;

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top']}>
      <View className="flex-row items-center justify-between px-5 pt-[18px] pb-2 bg-white">
        <Typography className="text-[26px] font-extrabold text-navy tracking-[-0.01em]">Events</Typography>
        {/* Only an admin can create one — `events_admin_insert` refuses a rep,
            and an affordance that always fails is worse than no affordance. */}
        {isAdmin ? (
          <Pressable
            onPress={() => router.push('/(app)/events/new')}
            className="w-9 h-9 rounded-full bg-gold items-center justify-center shadow-[0_8px_18px_rgba(244,176,0,0.32)]"
          >
            <PlusIcon color="#0B132B" />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        contentContainerClassName="px-5 pt-4 pb-8 flex-grow"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {isLoading ? (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator color="#F4B000" />
          </View>
        ) : null}

        {error ? (
          <View className="items-center justify-center py-16 px-6">
            <Typography className="text-[15px] font-bold text-navy text-center">
              Couldn&rsquo;t load your events
            </Typography>
            <Typography className="text-[13px] text-slate text-center mt-2 leading-[1.5]">
              You may be offline. Pull down to try again.
            </Typography>
          </View>
        ) : null}

        {isEmpty ? (
          <View className="flex-1 items-center justify-center px-6 py-16">
            <View className="w-[62px] h-[62px] rounded-full bg-surface items-center justify-center">
              <CalendarIcon size={26} color="#0B132B" strokeWidth={1.6} />
            </View>
            <Typography className="text-[17px] font-extrabold text-navy text-center mt-4">
              No events yet
            </Typography>
            <Typography className="text-[13.5px] text-slate text-center mt-2 leading-[1.5] max-w-[280px]">
              {isAdmin
                ? 'Set up your first show and your team can start scanning the moment they sign in.'
                : 'You will see an event here once an admin adds you to one.'}
            </Typography>
            {isAdmin ? (
              <Button
                label="Create your first event"
                onPress={() => router.push('/(app)/events/new')}
                className="mt-6"
              />
            ) : null}
          </View>
        ) : null}

        {GROUPS.map((group) => {
          const items = events?.filter((e) => e.status === group) ?? [];
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
