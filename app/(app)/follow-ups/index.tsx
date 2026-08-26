import { Alert, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { ScreenHeader } from '../../../components/app/ScreenHeader';
import { ClockIcon, MicIcon, PhoneIcon, WhatsAppIcon } from '../../../components/ui/icons';

function FollowUpCard({
  initial,
  name,
  company,
  when,
  overdue,
  note,
}: {
  initial: string;
  name: string;
  company: string;
  when: string;
  overdue?: boolean;
  note: string;
}) {
  return (
    <View className={`bg-white border rounded-2xl p-4 mb-3 ${overdue ? 'border-[#C23B3B]/[0.30]' : 'border-hairline'}`}>
      <View className="flex-row items-center gap-[10px]">
        <View className="w-[38px] h-[38px] rounded-[11px] bg-surface items-center justify-center">
          <Typography className="text-[14px] font-extrabold text-navy">{initial}</Typography>
        </View>
        <View className="flex-1">
          <Typography className="text-[14.5px] font-bold text-navy">{name}</Typography>
          <Typography className="text-[11.5px] text-slate mt-[1px]">{company}</Typography>
        </View>
        <Typography className={`text-[11px] font-bold ${overdue ? 'text-[#C23B3B]' : 'text-slate'}`}>{when}</Typography>
      </View>

      <View className="flex-row gap-2 bg-section rounded-[10px] px-3 py-[11px] mt-3">
        <MicIcon size={13} color="#8A98B0" strokeWidth={2} />
        <Typography className="flex-1 text-[12.5px] font-medium text-navy" style={{ lineHeight: 18 }}>
          {note}
        </Typography>
      </View>

      <View className="flex-row gap-2 mt-[14px]">
        <Pressable
          onPress={() => Alert.alert('Call', "Calling isn't wired up yet.")}
          className="flex-1 h-11 rounded-md bg-navy flex-row items-center justify-center gap-[7px]"
        >
          <PhoneIcon size={14} color="#fff" strokeWidth={2} />
          <Typography className="text-[13.5px] font-bold text-white">Call</Typography>
        </Pressable>
        <Pressable
          onPress={() => Alert.alert('WhatsApp', "Messaging isn't wired up yet.")}
          className="w-11 h-11 rounded-md bg-surface items-center justify-center"
        >
          <WhatsAppIcon size={16} color="#25D366" strokeWidth={2} />
        </Pressable>
        <Pressable
          onPress={() => router.push('/(app)/(modals)/log-outcome')}
          className="w-11 h-11 rounded-md bg-surface items-center justify-center"
        >
          <ClockIcon size={16} strokeWidth={1.75} />
        </Pressable>
      </View>
    </View>
  );
}

export default function TodaysFollowUpsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
      <ScreenHeader
        title="Today's follow-ups"
        right={
          <View className="bg-gold rounded-full px-[11px] py-[5px]">
            <Typography className="text-[12px] font-extrabold text-navy">3</Typography>
          </View>
        }
      />

      <ScrollView contentContainerClassName="px-5 pt-[18px] pb-6" showsVerticalScrollIndicator={false}>
        <Typography className="text-[10.5px] font-bold tracking-[0.12em] text-[#C23B3B] mb-3" style={{ textTransform: 'uppercase' }}>
          Overdue &middot; 1
        </Typography>
        <FollowUpCard
          initial="V"
          name="Vikram Nair"
          company="Delta Precision"
          when="2 days overdue"
          overdue
          note="Wants pricing for a 3-unit order, comparing against two other vendors before month-end."
        />

        <Typography className="text-[10.5px] font-bold tracking-[0.12em] text-slate mt-5 mb-3" style={{ textTransform: 'uppercase' }}>
          Today &middot; 2
        </Typography>
        <FollowUpCard
          initial="R"
          name="Rajesh Menon"
          company="Northline Engineering"
          when="Due today"
          note="Evaluating three vendors for the new plant line — wants a formal quote with lead times."
        />
        <FollowUpCard
          initial="K"
          name="Kavita Rao"
          company="Suntech Moulds"
          when="Due today"
          note="Asked for catalog and MOQ — open to a call after 5pm this week."
        />
      </ScrollView>
    </SafeAreaView>
  );
}
