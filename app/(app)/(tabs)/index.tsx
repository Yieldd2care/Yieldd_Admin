import { Alert, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { LeadRow } from '../../../components/app/LeadRow';
import {
  BarChartIcon,
  BellIcon,
  ChevronRightIcon,
  ClockIcon,
  EditIcon,
  SearchIcon,
  TrendUpIcon,
  UsersIcon,
  WhatsAppIcon,
} from '../../../components/ui/icons';
import { useSessionStore } from '../../../stores/useSessionStore';
import { useLeadsStore } from '../../../stores/useLeadsStore';
import { useCurrentEventStore } from '../../../stores/useCurrentEventStore';
import { useCurrentEvent, useEvents } from '../../../hooks/useEvents';

function stubComingSoon(what: string) {
  Alert.alert('Coming soon', `${what} isn't designed yet.`);
}

function timeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const user = useSessionStore((s) => s.user);
  const initial = user?.name?.trim()?.[0]?.toUpperCase() ?? 'Y';
  const firstName = user?.name?.trim()?.split(' ')?.[0] ?? 'there';
  const allLeads = useLeadsStore((s) => s.leads);
  const syncedLeads = allLeads.filter((l) => l.syncStatus === 'synced');
  const draftCount = allLeads.filter((l) => l.syncStatus === 'draft').length;
  const RECENT_LEADS = syncedLeads.slice(0, 3);
  const NEEDS_NOTE_COUNT = syncedLeads.filter((l) => l.needsNote).length;
  const WHATSAPP_PENDING_COUNT = syncedLeads.filter((l) => l.status === 'New').length;

  const { data: events } = useEvents();
  const { event } = useCurrentEvent();

  // Counted from what is actually on the device, drafts included: a lead
  // captured offline still happened, and showing it only after it syncs makes
  // the number look like it went backwards.
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const noon = new Date();
  noon.setHours(12, 0, 0, 0);

  const forThisEvent = allLeads.filter((l) => !event || !l.eventId || l.eventId === event.id);
  const capturedToday = forThisEvent.filter(
    (l) => new Date(l.capturedAt).getTime() >= startOfDay.getTime()
  );
  const capturedSinceNoon = capturedToday.filter(
    (l) => new Date(l.capturedAt).getTime() >= noon.getTime()
  ).length;

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const followUpsDue = forThisEvent.filter(
    (l) => l.followUpDate && new Date(l.followUpDate).getTime() <= endOfToday.getTime()
  ).length;
  const selectEvent = useCurrentEventStore((s) => s.selectEvent);
  const isAdmin = user?.role === 'admin';

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top']}>
      <View className="flex-row items-center justify-between px-5 pt-3">
        <Pressable onPress={() => router.push('/(app)/(tabs)/qr')} className="flex-row items-center gap-[10px]">
          <View className="w-[34px] h-[34px] rounded-md bg-gold items-center justify-center">
            <Typography className="text-[13.5px] font-extrabold text-navy">{initial}</Typography>
          </View>
          <View>
            <Typography className="text-[12px] text-slate">{timeGreeting()}</Typography>
            <Typography className="text-[16px] font-extrabold text-navy">{firstName}</Typography>
          </View>
        </Pressable>
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => router.push('/(app)/leads/drafts')}
            className="w-[34px] h-[34px] rounded-md bg-white border border-hairline items-center justify-center relative"
          >
            <EditIcon size={16} color="#0B132B" strokeWidth={1.75} />
            {draftCount > 0 ? (
              <View className="absolute -top-[5px] -right-[5px] min-w-[16px] h-[16px] px-[3px] rounded-full bg-gold items-center justify-center border-[1.5px] border-white">
                <Typography className="text-[9px] font-extrabold text-navy">{draftCount}</Typography>
              </View>
            ) : null}
          </Pressable>
          <Pressable
            onPress={() => router.push('/(app)/notifications')}
            className="w-[34px] h-[34px] rounded-md bg-white border border-hairline items-center justify-center relative"
          >
            <BellIcon />
            <View className="absolute top-[6px] right-[6px] w-[7px] h-[7px] rounded-full bg-gold border-[1.5px] border-white" />
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="mx-5 mt-3 bg-navy rounded-xl p-4">
          <View className="flex-row items-center gap-[6px]">
            {/* The dot means "this show is running right now" — showing it on an
                event that starts in March would be a lie the rep acts on. */}
            <View
              className={`w-[6px] h-[6px] rounded-full ${event?.status === 'live' ? 'bg-success' : 'bg-white/30'}`}
            />
            <Typography className="text-[12px] font-semibold text-white/60">
              {event
                ? [event.name, event.stallNumber ?? event.city].filter(Boolean).join(' · ')
                : 'No event selected'}
            </Typography>
          </View>
          <View className="flex-row items-center justify-between mt-[12px]">
            <View>
              <Typography className="text-[13px] text-white/60">Leads captured today</Typography>
              <View className="flex-row items-center gap-1 bg-gold/[0.14] self-start rounded-full px-[10px] py-[5px] mt-[10px]">
                <TrendUpIcon />
                <Typography className="text-[11.5px] font-bold text-gold">
                  +{capturedSinceNoon} since noon
                </Typography>
              </View>
            </View>
            <Typography className="text-[72px] leading-none font-extrabold tracking-[-0.03em] text-white">
              {capturedToday.length}
            </Typography>
          </View>
        </View>

        <View className="mx-5 mt-3">
          <Typography className="text-[11px] font-bold tracking-[0.06em] text-slate" style={{ textTransform: 'uppercase' }}>
            Your events
          </Typography>
          {/* No className on the ScrollView itself — with this project's
              NativeWind setup that makes descendant text reserve space and paint
              no glyphs. Spacing goes in contentContainerClassName. See AGENTS.md. */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 mt-[8px]">
            {events?.map((e) => {
              const active = e.id === event?.id;
              return (
                <View key={e.id}>
                  <Pressable
                    onPress={() => selectEvent(e.id)}
                    className={`rounded-full px-4 py-2 ${active ? 'bg-navy' : 'bg-surface'}`}
                  >
                    <Typography
                      className={`text-[12.5px] font-bold ${active ? 'text-white' : 'text-navy'}`}
                    >
                      {e.name}
                    </Typography>
                  </Pressable>
                </View>
              );
            })}
            {isAdmin ? (
              <View>
                <Pressable onPress={() => router.push('/(app)/events/new')} className="border border-dashed border-hairline rounded-full px-4 py-2">
                  <Typography className="text-[12.5px] font-bold text-slate">
                    {events?.length ? '+ Add event' : '+ Create your first event'}
                  </Typography>
                </Pressable>
              </View>
            ) : null}
          </ScrollView>
        </View>

        <View className="flex-row justify-between mx-5 mt-3">
          <Pressable onPress={() => router.push('/(app)/follow-ups')} className="items-center gap-2 w-[80px]">
            <View className="w-12 h-12 rounded-2xl bg-surface items-center justify-center">
              <ClockIcon size={19} />
            </View>
            <Typography className="text-[10.5px] font-bold text-navy text-center" numberOfLines={1}>Follow-ups</Typography>
          </Pressable>
          <Pressable onPress={() => router.push('/(app)/(tabs)/leads')} className="items-center gap-2 w-[80px]">
            <View className="w-12 h-12 rounded-2xl bg-surface items-center justify-center">
              <UsersIcon size={19} />
            </View>
            <Typography className="text-[10.5px] font-bold text-navy text-center" numberOfLines={1}>All leads</Typography>
          </Pressable>
          <Pressable onPress={() => stubComingSoon('Search')} className="items-center gap-2 w-[80px]">
            <View className="w-12 h-12 rounded-2xl bg-surface items-center justify-center">
              <SearchIcon size={19} color="#0B132B" strokeWidth={1.75} />
            </View>
            <Typography className="text-[10.5px] font-bold text-navy text-center" numberOfLines={1}>Search</Typography>
          </Pressable>
          <Pressable
            onPress={() =>
              event
                ? router.push({ pathname: '/(app)/events/[id]/roi', params: { id: event.id } })
                : Alert.alert('No event yet', 'Reports appear once you have an event with leads in it.')
            }
            className="items-center gap-2 w-[80px]"
          >
            <View className="w-12 h-12 rounded-2xl bg-surface items-center justify-center">
              <BarChartIcon size={19} />
            </View>
            <Typography className="text-[10.5px] font-bold text-navy text-center" numberOfLines={1}>Reports</Typography>
          </Pressable>
        </View>

        <View className="bg-navy-elevated rounded-[14px] mx-5 mt-3 overflow-hidden">
          <View className="flex-row">
            <View className="flex-1 px-4 py-3">
              <Typography className="text-[9.5px] font-bold tracking-[0.08em] text-white/45" style={{ textTransform: 'uppercase' }}>
                This event
              </Typography>
              <Typography className="text-[16px] font-extrabold text-white mt-[3px]">
                {forThisEvent.length}
              </Typography>
            </View>
            <View className="w-px bg-white/[0.14]" />
            <View className="flex-1 px-4 py-3">
              <Typography className="text-[9.5px] font-bold tracking-[0.08em] text-white/45" style={{ textTransform: 'uppercase' }}>
                Follow-ups
              </Typography>
              <View className="flex-row items-center gap-[6px] mt-[5px]">
                <View className="w-[6px] h-[6px] rounded-full bg-gold" />
                <Typography className="text-[13px] font-bold text-white">{followUpsDue} due</Typography>
              </View>
            </View>
          </View>
          <View className="h-px bg-white/[0.14]" />
          <View className="flex-row">
            <View className="flex-1 px-4 py-3">
              <Typography className="text-[9.5px] font-bold tracking-[0.08em] text-white/45" style={{ textTransform: 'uppercase' }}>
                Needs a note
              </Typography>
              <View className="flex-row items-center gap-[6px] mt-[5px]">
                <View className="w-[6px] h-[6px] rounded-full bg-success" />
                <Typography className="text-[13px] font-bold text-white">{NEEDS_NOTE_COUNT}</Typography>
              </View>
            </View>
            <View className="w-px bg-white/[0.14]" />
            <View className="flex-1 px-4 py-3">
              <Typography className="text-[9.5px] font-bold tracking-[0.08em] text-white/45" style={{ textTransform: 'uppercase' }}>
                WhatsApp
              </Typography>
              <View className="flex-row items-center gap-[6px] mt-[5px]">
                <WhatsAppIcon size={11} color="#25D366" />
                <Typography className="text-[13px] font-bold text-white">{WHATSAPP_PENDING_COUNT} pending</Typography>
              </View>
            </View>
          </View>
        </View>

        <View className="mx-5 mt-4">
          <View className="flex-row items-center justify-between">
            <Typography className="text-[15px] font-extrabold text-navy">Recent leads</Typography>
            <Pressable onPress={() => router.push('/(app)/(tabs)/leads')} className="flex-row items-center gap-[2px]">
              <Typography className="text-[12.5px] font-bold text-blue">See all</Typography>
              <ChevronRightIcon size={11} color="#1D3F8A" strokeWidth={2.5} />
            </Pressable>
          </View>
          <View className="mt-3 gap-[10px]">
            {RECENT_LEADS.map((lead) => (
              <LeadRow key={lead.id} lead={lead} />
            ))}
          </View>
        </View>

        <View className="h-[130px]" />
      </ScrollView>
    </SafeAreaView>
  );
}
