import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { ScreenHeader } from '../../../components/app/ScreenHeader';
import { CheckIcon } from '../../../components/ui/icons';
import { useLeadsStore } from '../../../stores/useLeadsStore';
import { useAttention, type Attention } from '../../../hooks/useAttention';

/**
 * What needs your attention.
 *
 * This screen was entirely invented before: people who do not exist ("Priya
 * Sharma hasn't sent today's WhatsApp"), events nobody created ("IMTEX 2026
 * starts in 7 days"), a cost-per-lead of ₹42 computed from nothing, and
 * timestamps like "3 days ago" that were simply typed in. It had a "Mark all
 * read" button that raised a "coming soon" alert.
 *
 * The rules live in hooks/useAttention.tsx, which also feeds the dot on the
 * Home bell — see the note there on why there is no read/unread state.
 */
function Row({ item }: { item: Attention }) {
  return (
    <Pressable
      onPress={() => router.push(item.href)}
      className={`flex-row items-start gap-3 rounded-2xl px-4 py-[13px] mb-[10px] border ${
        item.urgent ? 'bg-gold/[0.08] border-gold/[0.35]' : 'bg-white border-hairline'
      }`}
    >
      <View className={`w-10 h-10 rounded-full items-center justify-center ${item.iconBg}`}>
        {item.icon}
      </View>
      <View className="flex-1 min-w-0">
        <Typography className="text-[13.5px] font-bold text-navy">{item.title}</Typography>
        <Typography className="text-[12px] text-slate mt-[2px]" style={{ lineHeight: 17 }}>
          {item.description}
        </Typography>
      </View>
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const items = useAttention();
  const isRefreshing = useLeadsStore((s) => s.isRefreshing);

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
      <ScreenHeader title="Needs attention" />

      <ScrollView
        contentContainerClassName="px-5 pt-[18px] pb-6 flex-grow"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => useLeadsStore.getState().refresh()}
          />
        }
      >
        {items.length ? (
          items.map((item) => <Row key={item.id} item={item} />)
        ) : (
          <View className="flex-1 items-center justify-center px-6 py-16">
            <View className="w-[62px] h-[62px] rounded-full bg-success/[0.12] items-center justify-center">
              <CheckIcon size={26} color="#2E9C61" strokeWidth={2.2} />
            </View>
            <Typography className="text-[17px] font-extrabold text-navy text-center mt-4">
              Nothing needs you
            </Typography>
            <Typography
              className="text-[13.5px] text-slate text-center mt-2 max-w-[290px]"
              style={{ lineHeight: 20 }}
            >
              No overdue follow-ups, nothing waiting to sync, and every lead from today has a
              note on it.
            </Typography>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
