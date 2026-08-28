import { Alert, Linking, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { ScreenHeader } from '../../../components/app/ScreenHeader';
import { ClockIcon, MicIcon, PhoneIcon, WhatsAppIcon } from '../../../components/ui/icons';
import { useLeadsStore, type StoredLead } from '../../../stores/useLeadsStore';

/** Midnight local, so "due today" means the whole day rather than this instant. */
function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function dueLabel(followUpDate: string): { text: string; overdue: boolean } {
  const days = Math.round((startOfDay(new Date(followUpDate)) - startOfDay(new Date())) / 86400000);
  if (days === 0) return { text: 'Due today', overdue: false };
  if (days === 1) return { text: 'Due tomorrow', overdue: false };
  if (days > 1) return { text: `Due in ${days} days`, overdue: false };
  return { text: days === -1 ? '1 day overdue' : `${Math.abs(days)} days overdue`, overdue: true };
}

/** wa.me wants bare digits — no plus, no spaces. */
function waDigits(phone: string | undefined): string {
  return (phone ?? '').replace(/\D/g, '');
}

function FollowUpCard({ lead }: { lead: StoredLead }) {
  const { text: when, overdue } = dueLabel(lead.followUpDate as string);

  const call = () => {
    if (!lead.phone) {
      Alert.alert('No number', 'This lead was captured without a phone number.');
      return;
    }
    Linking.openURL(`tel:${lead.phone.replace(/\s/g, '')}`).catch(() =>
      Alert.alert('Call', 'This device cannot place calls.')
    );
  };

  const whatsapp = () => {
    const digits = waDigits(lead.phone);
    const message = `Hi ${lead.name}, following up on our conversation.`;
    const url = digits
      ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => Alert.alert('WhatsApp', 'WhatsApp could not be opened.'));
  };

  return (
    <View className={`bg-white border rounded-2xl p-4 mb-3 ${overdue ? 'border-[#C23B3B]/[0.30]' : 'border-hairline'}`}>
      <Pressable
        onPress={() => router.push({ pathname: '/(app)/leads/[id]', params: { id: lead.id } })}
        className="flex-row items-center gap-[10px]"
      >
        <View className="w-[38px] h-[38px] rounded-[11px] bg-surface items-center justify-center">
          <Typography className="text-[14px] font-extrabold text-navy">{lead.initial}</Typography>
        </View>
        <View className="flex-1">
          <Typography className="text-[14.5px] font-bold text-navy">{lead.name}</Typography>
          <Typography className="text-[11.5px] text-slate mt-[1px]">
            {lead.company || 'No company'}
          </Typography>
        </View>
        <Typography className={`text-[11px] font-bold ${overdue ? 'text-[#C23B3B]' : 'text-slate'}`}>
          {when}
        </Typography>
      </Pressable>

      {/* The rep's own note. Nothing invented — a lead captured without one
          simply does not get this block. */}
      {lead.note?.trim() ? (
        <View className="flex-row gap-2 bg-section rounded-[10px] px-3 py-[11px] mt-3">
          <MicIcon size={13} color="#8A98B0" strokeWidth={2} />
          <Typography className="flex-1 text-[12.5px] font-medium text-navy" style={{ lineHeight: 18 }}>
            {lead.note}
          </Typography>
        </View>
      ) : null}

      <View className="flex-row gap-2 mt-[14px]">
        <Pressable
          onPress={call}
          className="flex-1 h-11 rounded-md bg-navy flex-row items-center justify-center gap-[7px]"
        >
          <PhoneIcon size={14} color="#fff" strokeWidth={2} />
          <Typography className="text-[13.5px] font-bold text-white">Call</Typography>
        </Pressable>
        <Pressable
          onPress={whatsapp}
          className="w-11 h-11 rounded-md bg-surface items-center justify-center"
        >
          <WhatsAppIcon size={16} color="#25D366" strokeWidth={2} />
        </Pressable>
        <Pressable
          onPress={() => router.push(`/(app)/(modals)/log-outcome?leadId=${lead.id}`)}
          className="w-11 h-11 rounded-md bg-surface items-center justify-center"
        >
          <ClockIcon size={16} strokeWidth={1.75} />
        </Pressable>
      </View>
    </View>
  );
}

export default function TodaysFollowUpsScreen() {
  const allLeads = useLeadsStore((s) => s.leads);
  const isRefreshing = useLeadsStore((s) => s.isRefreshing);

  const today = startOfDay(new Date());
  // Anything due today or earlier. A follow-up set for next week is not
  // today's work and would only make this list look impossible.
  const due = allLeads
    .filter((l) => l.followUpDate && startOfDay(new Date(l.followUpDate)) <= today)
    .sort((a, b) => (a.followUpDate as string).localeCompare(b.followUpDate as string));

  const overdue = due.filter((l) => startOfDay(new Date(l.followUpDate as string)) < today);
  const dueToday = due.filter((l) => startOfDay(new Date(l.followUpDate as string)) === today);

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
      <ScreenHeader
        title="Today's follow-ups"
        right={
          due.length ? (
            <View className="bg-gold rounded-full px-[11px] py-[5px]">
              <Typography className="text-[12px] font-extrabold text-navy">{due.length}</Typography>
            </View>
          ) : undefined
        }
      />

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
        {overdue.length ? (
          <>
            <Typography className="text-[10.5px] font-bold tracking-[0.12em] text-[#C23B3B] mb-3" style={{ textTransform: 'uppercase' }}>
              Overdue &middot; {overdue.length}
            </Typography>
            {overdue.map((lead) => (
              <FollowUpCard key={lead.id} lead={lead} />
            ))}
          </>
        ) : null}

        {dueToday.length ? (
          <>
            <Typography
              className={`text-[10.5px] font-bold tracking-[0.12em] text-slate mb-3 ${overdue.length ? 'mt-5' : ''}`}
              style={{ textTransform: 'uppercase' }}
            >
              Today &middot; {dueToday.length}
            </Typography>
            {dueToday.map((lead) => (
              <FollowUpCard key={lead.id} lead={lead} />
            ))}
          </>
        ) : null}

        {!due.length ? (
          <View className="flex-1 items-center justify-center px-6 py-16">
            <View className="w-[62px] h-[62px] rounded-full bg-surface items-center justify-center">
              <ClockIcon size={26} strokeWidth={1.6} />
            </View>
            <Typography className="text-[17px] font-extrabold text-navy text-center mt-4">
              Nothing due
            </Typography>
            <Typography className="text-[13.5px] text-slate text-center mt-2 leading-[1.5] max-w-[280px]">
              Set a follow-up date on a lead and it will appear here on the day.
            </Typography>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
