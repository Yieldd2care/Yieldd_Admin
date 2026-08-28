import { Alert, Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { SheetShell } from '../../../components/app/SheetShell';
import { MailIcon, PhoneIcon } from '../../../components/ui/icons';
import { useTeamStore } from '../../../stores/useTeamStore';

export default function MemberDetailModal() {
  const { id, kind } = useLocalSearchParams<{ id?: string; kind?: 'member' | 'invite' }>();

  const members = useTeamStore((s) => s.members);
  const pendingInvites = useTeamStore((s) => s.pendingInvites);
  const revokeAccess = useTeamStore((s) => s.revokeAccess);
  const revokeInvite = useTeamStore((s) => s.revokeInvite);

  const member = kind === 'member' ? members.find((m) => m.id === id) : undefined;
  const invite = kind === 'invite' ? pendingInvites.find((i) => i.id === id) : undefined;

  if (!member && !invite) {
    return (
      <SheetShell>
        <Typography className="text-[15px] font-bold text-navy">This person is no longer on the team.</Typography>
        <Pressable onPress={() => router.back()} className="h-[52px] rounded-md bg-gold items-center justify-center mt-6">
          <Typography className="text-[15px] font-bold text-navy">Close</Typography>
        </Pressable>
      </SheetShell>
    );
  }

  const initial = member?.initial ?? invite?.initial;
  const name = member?.name ?? invite?.name;
  const phone = member?.phone ?? invite?.phone;
  const email = member?.email;
  const badgeLabel = member ? (member.badge === 'admin' ? 'Admin' : 'Rep') : 'Pending invite';

  const confirmRevokeAccess = () => {
    if (!member) return;
    Alert.alert('Revoke access', `${member.name} will lose access to this event. Their captured leads are kept.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Revoke access',
        style: 'destructive',
        onPress: () => {
          revokeAccess(member.id);
          router.back();
        },
      },
    ]);
  };

  const confirmRevokeInvite = () => {
    if (!invite) return;
    Alert.alert('Revoke invite', `${invite.name} won't be able to join with this invite anymore.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Revoke invite',
        style: 'destructive',
        onPress: () => {
          revokeInvite(invite.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <SheetShell>
      <View className="flex-row items-center gap-3">
        <View className="w-12 h-12 rounded-2xl bg-gold items-center justify-center">
          <Typography className="text-[18px] font-extrabold text-navy">{initial}</Typography>
        </View>
        <View className="flex-1">
          <Typography className="text-[17px] font-bold text-navy">{name}</Typography>
          <View className="self-start bg-surface rounded-full px-[9px] py-[3px] mt-[5px]">
            <Typography className="text-[10.5px] font-bold text-navy">{badgeLabel}</Typography>
          </View>
        </View>
      </View>

      <View className="bg-section rounded-2xl px-4 mt-5">
        <View className={`flex-row items-center gap-3 py-[14px] ${email ? 'border-b border-hairline' : ''}`}>
          <View className="w-8 h-8 rounded-[9px] bg-white items-center justify-center">
            <PhoneIcon size={14} color="#0B132B" strokeWidth={2} />
          </View>
          <View className="flex-1">
            <Typography className="text-[10.5px] font-bold tracking-[0.08em] text-slate" style={{ textTransform: 'uppercase' }}>
              Mobile number
            </Typography>
            <Typography className="text-[13.5px] font-bold text-navy mt-[2px]">{phone || 'Not provided'}</Typography>
          </View>
        </View>

        {email ? (
          <View className="flex-row items-center gap-3 py-[14px]">
            <View className="w-8 h-8 rounded-[9px] bg-white items-center justify-center">
              <MailIcon size={14} color="#0B132B" strokeWidth={1.75} />
            </View>
            <View className="flex-1">
              <Typography className="text-[10.5px] font-bold tracking-[0.08em] text-slate" style={{ textTransform: 'uppercase' }}>
                Email ID
              </Typography>
              <Typography className="text-[13.5px] font-bold text-navy mt-[2px]">{email}</Typography>
            </View>
          </View>
        ) : null}
      </View>

      {member?.status === 'deactivated' ? (
        <View className="flex-row items-center gap-2 bg-surface rounded-md px-[14px] py-3 mt-5">
          <Typography className="text-[12px] font-medium text-slate flex-1">
            Access already revoked. Their captured leads are retained.
          </Typography>
        </View>
      ) : null}

      {member && member.status === 'active' && !member.isSelf ? (
        <Pressable
          onPress={confirmRevokeAccess}
          className="h-[52px] rounded-md border border-[#C23B3B]/[0.35] bg-[#C23B3B]/[0.06] items-center justify-center mt-5"
        >
          <Typography className="text-[14.5px] font-bold text-[#C23B3B]">Revoke access</Typography>
        </Pressable>
      ) : null}

      {invite ? (
        <Pressable
          onPress={confirmRevokeInvite}
          className="h-[52px] rounded-md border border-[#C23B3B]/[0.35] bg-[#C23B3B]/[0.06] items-center justify-center mt-5"
        >
          <Typography className="text-[14.5px] font-bold text-[#C23B3B]">Revoke invite</Typography>
        </Pressable>
      ) : null}

      <Pressable onPress={() => router.back()} className="h-[52px] rounded-md bg-white border border-hairline items-center justify-center mt-3">
        <Typography className="text-[15px] font-bold text-navy">Close</Typography>
      </Pressable>
    </SheetShell>
  );
}
