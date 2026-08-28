import type { ReactNode } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { ScreenHeader } from '../../../components/app/ScreenHeader';
import {
  BarChartIcon,
  CalendarIcon,
  ClockIcon,
  EditIcon,
  RefreshIcon,
  UsersIcon,
  WhatsAppIcon,
} from '../../../components/ui/icons';
import { useLeadsStore } from '../../../stores/useLeadsStore';

type NotificationItem = {
  id: string;
  icon: ReactNode;
  iconBg: string;
  title: string;
  description: string;
  time: string;
  unread?: boolean;
  onPress: () => void;
};

function stubComingSoon(what: string) {
  Alert.alert('Coming soon', `${what} isn't wired up yet.`);
}

function NotificationRow({ item }: { item: NotificationItem }) {
  return (
    <Pressable
      onPress={item.onPress}
      className="flex-row items-start gap-3 bg-white border border-hairline rounded-2xl px-4 py-[13px] mb-[10px]"
    >
      <View className={`w-10 h-10 rounded-full items-center justify-center ${item.iconBg}`}>{item.icon}</View>
      <View className="flex-1 min-w-0">
        <View className="flex-row items-center gap-[6px]">
          <Typography
            className={`flex-1 text-[13.5px] text-navy ${item.unread ? 'font-extrabold' : 'font-bold'}`}
            numberOfLines={1}
          >
            {item.title}
          </Typography>
          {item.unread ? <View className="w-[7px] h-[7px] rounded-full bg-gold" /> : null}
        </View>
        <Typography className="text-[12px] text-slate mt-[2px]" style={{ lineHeight: 17 }} numberOfLines={2}>
          {item.description}
        </Typography>
        <Typography className="text-[11px] font-semibold text-slate mt-[6px]">{item.time}</Typography>
      </View>
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const firstLead = useLeadsStore((s) => s.leads[0]);

  const NEW: NotificationItem[] = [
    {
      id: 'whatsapp-pending',
      icon: <WhatsAppIcon size={17} color="#25D366" />,
      iconBg: 'bg-[#25D366]/[0.14]',
      title: "Priya Sharma hasn't sent today's WhatsApp welcome message",
      description: '4 of her leads captured today are still marked New — nudge her to tap WhatsApp on each.',
      time: 'Today, 9:00 AM',
      unread: true,
      onPress: () => router.push('/(app)/settings/team'),
    },
    {
      id: 'followups-due',
      icon: <ClockIcon size={17} color="#0B132B" strokeWidth={1.75} />,
      iconBg: 'bg-surface',
      title: '3 follow-ups due today',
      description: '1 is already 2 days overdue — Vikram Nair at Delta Precision is comparing two other vendors.',
      time: 'Today, 10:00 AM',
      unread: true,
      onPress: () => router.push('/(app)/follow-ups'),
    },
    {
      id: 'event-reminder-7day',
      icon: <CalendarIcon size={17} color="#1D3F8A" strokeWidth={1.75} />,
      iconBg: 'bg-blue/[0.12]',
      title: 'IMTEX 2026 starts in 7 days',
      description: 'Time to lock bookings and get marketing material ready before show day.',
      time: 'Today, 11:00 AM',
      unread: true,
      onPress: () => router.push({ pathname: '/(app)/events/[id]/dashboard', params: { id: 'imtex-2026' } }),
    },
    {
      id: 'event-reminder-2day',
      icon: <CalendarIcon size={17} color="#1D3F8A" strokeWidth={1.75} />,
      iconBg: 'bg-blue/[0.12]',
      title: 'Auto Expo Q3 starts in 2 days',
      description: 'Final push — confirm bookings and marketing material are ready to go.',
      time: 'Today, 11:00 AM',
      unread: true,
      onPress: () => router.push({ pathname: '/(app)/events/[id]/dashboard', params: { id: 'auto-expo-q3' } }),
    },
    {
      id: 'roi-milestone',
      icon: <BarChartIcon size={16} color="#8A6100" strokeWidth={1.75} />,
      iconBg: 'bg-gold/[0.16]',
      title: 'New best cost-per-lead for IMTEX 2026',
      description: 'Your cost-per-lead dropped to ₹42 — the lowest of any event so far.',
      time: 'Just now',
      unread: true,
      onPress: () => router.push({ pathname: '/(app)/events/[id]/roi', params: { id: 'imtex-2026' } }),
    },
    ...(firstLead
      ? [
          {
            id: 'lead-captured',
            icon: <UsersIcon size={16} color="#1D3F8A" strokeWidth={1.75} />,
            iconBg: 'bg-blue/[0.12]',
            title: `New lead captured: ${firstLead.name}`,
            description: `${firstLead.company} was just added to your event.`,
            time: '3h ago',
            unread: true,
            onPress: () => router.push({ pathname: '/(app)/leads/[id]', params: { id: firstLead.id } }),
          } satisfies NotificationItem,
        ]
      : []),
  ];

  const EARLIER: NotificationItem[] = [
    {
      id: 'invite-accepted',
      icon: <UsersIcon size={16} color="#0B132B" strokeWidth={1.75} />,
      iconBg: 'bg-surface',
      title: 'Meera Iyer joined your team',
      description: 'Your invite to join the IMTEX 2026 team was accepted.',
      time: 'Yesterday',
      onPress: () => router.push('/(app)/settings/team'),
    },
    {
      id: 'drafts-synced',
      icon: <RefreshIcon size={16} color="#0B132B" strokeWidth={1.75} />,
      iconBg: 'bg-surface',
      title: '2 draft leads synced',
      description: "You're back online — leads saved while offline have been synced.",
      time: '3 days ago',
      onPress: () => router.push('/(app)/leads/drafts'),
    },
    {
      id: 'evening-review',
      icon: <EditIcon size={15} color="#0B132B" strokeWidth={1.75} />,
      iconBg: 'bg-surface',
      title: 'Your evening review is ready',
      description: '5 leads from today still need a quick note before you forget the details.',
      time: '5 days ago',
      onPress: () => stubComingSoon('Evening review'),
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
      <ScreenHeader
        title="Notifications"
        right={
          <Pressable onPress={() => stubComingSoon('Mark all as read')}>
            <Typography className="text-[12.5px] font-bold text-blue">Mark all read</Typography>
          </Pressable>
        }
      />

      <ScrollView contentContainerClassName="px-5 pt-[18px] pb-6" showsVerticalScrollIndicator={false}>
        <Typography
          className="text-[10.5px] font-bold tracking-[0.12em] text-slate mb-3"
          style={{ textTransform: 'uppercase' }}
        >
          New
        </Typography>
        {NEW.map((item) => (
          <NotificationRow key={item.id} item={item} />
        ))}

        <Typography
          className="text-[10.5px] font-bold tracking-[0.12em] text-slate mt-2 mb-3"
          style={{ textTransform: 'uppercase' }}
        >
          Earlier
        </Typography>
        {EARLIER.map((item) => (
          <NotificationRow key={item.id} item={item} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
