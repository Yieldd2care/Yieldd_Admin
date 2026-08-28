import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { ScreenHeader } from '../../../components/app/ScreenHeader';
import { useTeamStore } from '../../../stores/useTeamStore';

const SEAT_LIMIT = 10;

function openMemberDetail(id: string, kind: 'member' | 'invite') {
  router.push({ pathname: '/(app)/(modals)/member-detail', params: { id, kind } });
}

export default function TeamManagementScreen() {
  const members = useTeamStore((s) => s.members);
  const pendingInvites = useTeamStore((s) => s.pendingInvites);
  const activeMembers = members.filter((m) => m.status === 'active');
  const deactivatedMembers = members.filter((m) => m.status === 'deactivated');

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
            <Typography className="text-[13px] font-bold text-gold">
              {activeMembers.length} of {SEAT_LIMIT}
            </Typography>
          </View>
          <View className="h-[6px] rounded-full bg-white/[0.14] mt-[10px] overflow-hidden">
            <View
              className="h-full bg-gold rounded-full"
              style={{ width: `${Math.min(100, (activeMembers.length / SEAT_LIMIT) * 100)}%` }}
            />
          </View>
        </View>

        <Typography className="text-[10.5px] font-bold tracking-[0.12em] text-slate mt-[22px] mb-[10px]" style={{ textTransform: 'uppercase' }}>
          Active
        </Typography>
        <View className="bg-white border border-hairline rounded-2xl px-4">
          {activeMembers.map((m, i) => (
            <Pressable
              key={m.id}
              onPress={() => openMemberDetail(m.id, 'member')}
              className={`flex-row items-center gap-3 py-[13px] ${i < activeMembers.length - 1 ? 'border-b border-section' : ''}`}
            >
              <View className="w-9 h-9 rounded-[10px] bg-surface items-center justify-center">
                <Typography className="text-[13px] font-extrabold text-navy">{m.initial}</Typography>
              </View>
              <View className="flex-1">
                <Typography className="text-[13.5px] font-bold text-navy">{m.name}</Typography>
                <Typography className="text-[11.5px] text-slate mt-[1px]">{m.role}</Typography>
              </View>
              <View className={`rounded-full px-[9px] py-[4px] ${m.badge === 'admin' ? 'bg-gold/[0.16]' : 'bg-surface'}`}>
                <Typography className={`text-[10.5px] font-bold ${m.badge === 'admin' ? 'text-[#8A6100]' : 'text-navy'}`}>
                  {m.badge === 'admin' ? 'Admin' : 'Rep'}
                </Typography>
              </View>
            </Pressable>
          ))}
        </View>

        {deactivatedMembers.length > 0 ? (
          <>
            <Typography className="text-[10.5px] font-bold tracking-[0.12em] text-slate mt-[22px] mb-[10px]" style={{ textTransform: 'uppercase' }}>
              Deactivated
            </Typography>
            <View className="bg-white border border-hairline rounded-2xl px-4">
              {deactivatedMembers.map((m, i) => (
                <Pressable
                  key={m.id}
                  onPress={() => openMemberDetail(m.id, 'member')}
                  className={`flex-row items-center gap-3 py-[13px] ${i < deactivatedMembers.length - 1 ? 'border-b border-section' : ''}`}
                >
                  <View className="w-9 h-9 rounded-[10px] bg-surface items-center justify-center opacity-50">
                    <Typography className="text-[13px] font-extrabold text-navy">{m.initial}</Typography>
                  </View>
                  <View className="flex-1">
                    <Typography className="text-[13.5px] font-bold text-slate">{m.name}</Typography>
                    <Typography className="text-[11.5px] text-slate mt-[1px]">{m.role}</Typography>
                  </View>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        {pendingInvites.length > 0 ? (
          <>
            <Typography className="text-[10.5px] font-bold tracking-[0.12em] text-slate mt-[22px] mb-[10px]" style={{ textTransform: 'uppercase' }}>
              Pending invites
            </Typography>
            <View className="bg-white border border-hairline rounded-2xl px-4">
              {pendingInvites.map((inv, i) => (
                <Pressable
                  key={inv.id}
                  onPress={() => openMemberDetail(inv.id, 'invite')}
                  className={`flex-row items-center gap-3 py-[13px] ${i < pendingInvites.length - 1 ? 'border-b border-section' : ''}`}
                >
                  <View className="w-9 h-9 rounded-[10px] bg-section items-center justify-center">
                    <Typography className="text-[13px] font-extrabold text-slate">{inv.initial}</Typography>
                  </View>
                  <View className="flex-1">
                    <Typography className="text-[13.5px] font-bold text-navy">{inv.name}</Typography>
                    <Typography className="text-[11.5px] text-slate mt-[1px]">{inv.invitedLabel}</Typography>
                  </View>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
