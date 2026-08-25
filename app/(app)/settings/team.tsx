import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Typography } from '../../../components/ui/Typography';
import { ScreenHeader } from '../../../components/app/ScreenHeader';

const MEMBERS = [
  { initial: 'P', name: 'Priya Sharma', role: 'You', badge: 'admin' as const },
  { initial: 'R', name: 'Rajesh Menon', role: '142 leads captured', badge: 'rep' as const },
  { initial: 'S', name: 'Sneha Kulkarni', role: '118 leads captured', badge: 'rep' as const },
  { initial: 'A', name: 'Amit Shah', role: 'Deactivated · leads retained', badge: null, dimmed: true },
];

export default function TeamManagementScreen() {
  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
      <ScreenHeader
        title="Team"
        right={
          <Pressable className="bg-gold rounded-full px-[14px] py-[9px]">
            <Typography className="text-[12.5px] font-bold text-navy">+ Invite</Typography>
          </Pressable>
        }
      />

      <ScrollView contentContainerClassName="px-5 pt-[18px] pb-8" showsVerticalScrollIndicator={false}>
        <View className="rounded-2xl px-[18px] py-4" style={{ backgroundColor: '#0B132B' }}>
          <View className="flex-row items-center justify-between">
            <Typography className="text-[13px] font-bold text-white">Seats used</Typography>
            <Typography className="text-[13px] font-bold text-gold">6 of 10</Typography>
          </View>
          <View className="h-[6px] rounded-full bg-white/[0.14] mt-[10px] overflow-hidden">
            <View className="h-full bg-gold rounded-full" style={{ width: '60%' }} />
          </View>
        </View>

        <Typography className="text-[10.5px] font-bold tracking-[0.12em] text-slate mt-[22px] mb-[10px]" style={{ textTransform: 'uppercase' }}>
          Active
        </Typography>
        <View className="bg-white border border-hairline rounded-2xl px-4">
          {MEMBERS.map((m, i) => (
            <View
              key={m.name}
              className={`flex-row items-center gap-3 py-[13px] ${i < MEMBERS.length - 1 ? 'border-b border-section' : ''}`}
            >
              <View className={`w-9 h-9 rounded-[10px] bg-surface items-center justify-center ${m.dimmed ? 'opacity-50' : ''}`}>
                <Typography className="text-[13px] font-extrabold text-navy">{m.initial}</Typography>
              </View>
              <View className="flex-1">
                <Typography className={`text-[13.5px] font-bold ${m.dimmed ? 'text-slate' : 'text-navy'}`}>{m.name}</Typography>
                <Typography className="text-[11.5px] text-slate mt-[1px]">{m.role}</Typography>
              </View>
              {m.badge ? (
                <View className={`rounded-full px-[9px] py-[4px] ${m.badge === 'admin' ? 'bg-gold/[0.16]' : 'bg-surface'}`}>
                  <Typography className={`text-[10.5px] font-bold ${m.badge === 'admin' ? 'text-[#8A6100]' : 'text-navy'}`}>
                    {m.badge === 'admin' ? 'Admin' : 'Rep'}
                  </Typography>
                </View>
              ) : null}
            </View>
          ))}
        </View>

        <Typography className="text-[10.5px] font-bold tracking-[0.12em] text-slate mt-[22px] mb-[10px]" style={{ textTransform: 'uppercase' }}>
          Pending invites
        </Typography>
        <View className="bg-white border border-hairline rounded-2xl px-4">
          <View className="flex-row items-center gap-3 py-[13px]">
            <View className="w-9 h-9 rounded-[10px] bg-section items-center justify-center">
              <Typography className="text-[13px] font-extrabold text-slate">M</Typography>
            </View>
            <View className="flex-1">
              <Typography className="text-[13.5px] font-bold text-navy">Meera Iyer</Typography>
              <Typography className="text-[11.5px] text-slate mt-[1px]">Invited 2 days ago &middot; 98204 55210</Typography>
            </View>
            <Typography className="text-[11.5px] font-bold text-gold">Resend</Typography>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
