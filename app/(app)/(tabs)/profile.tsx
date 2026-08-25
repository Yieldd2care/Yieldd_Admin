import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { Toggle } from '../../../components/ui/Toggle';
import { useSessionStore } from '../../../stores/useSessionStore';
import {
  ChevronRightIcon,
  FileIcon,
  LogoutIcon,
  StorageIcon,
  UsersIcon,
  WhatsAppIcon,
} from '../../../components/ui/icons';

function Row({
  icon,
  label,
  right,
  onPress,
  isLast,
}: {
  icon: ReactNode;
  label: string;
  right?: ReactNode;
  onPress?: () => void;
  isLast?: boolean;
}) {
  return (
    <Pressable onPress={onPress} className={`flex-row items-center gap-3 py-[13px] ${isLast ? '' : 'border-b border-section'}`}>
      <View className="w-8 h-8 rounded-[9px] bg-surface items-center justify-center">{icon}</View>
      <Typography className="text-[13.5px] font-semibold text-navy flex-1">{label}</Typography>
      {right}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const user = useSessionStore((s) => s.user);
  const signOut = useSessionStore((s) => s.signOut);
  const [notifications, setNotifications] = useState(true);
  const initial = user?.name?.trim()?.[0]?.toUpperCase() ?? 'Y';

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top']}>
      <View className="bg-white px-5 pt-[18px] pb-3">
        <Typography className="text-[26px] font-extrabold text-navy tracking-[-0.01em]">Settings</Typography>
      </View>

      <ScrollView contentContainerClassName="px-5 pt-[18px] pb-10" showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center gap-[14px] bg-white border border-hairline rounded-2xl p-4">
          <View className="w-[52px] h-[52px] rounded-2xl bg-gold items-center justify-center">
            <Typography className="text-[19px] font-extrabold text-navy">{initial}</Typography>
          </View>
          <View className="flex-1">
            <Typography className="text-[15px] font-bold text-navy">{user?.name ?? 'there'}</Typography>
            <Typography className="text-[12px] text-slate mt-[2px]">Admin &middot; {user?.company ?? ''}</Typography>
          </View>
          <ChevronRightIcon size={16} color="#5A6B87" strokeWidth={2} />
        </View>

        <View className="flex-row items-center gap-3 rounded-2xl px-[18px] py-4 mt-[14px]" style={{ backgroundColor: '#0B132B' }}>
          <View className="flex-1">
            <Typography className="text-[13.5px] font-bold text-white">Pro plan</Typography>
            <Typography className="text-[11.5px] text-white/[0.55] mt-[2px]">Renews 12 Mar 2027</Typography>
          </View>
          <View className="bg-gold rounded-full px-[10px] py-[4px]">
            <Typography className="text-[10.5px] font-extrabold text-navy" style={{ letterSpacing: 0.4 }}>ACTIVE</Typography>
          </View>
        </View>

        <SectionLabel>Account</SectionLabel>
        <Card>
          <Row icon={<UsersIcon size={15} />} label="Team" right={<Typography className="text-[12px] font-semibold text-slate">6 members</Typography>} onPress={() => router.push('/(app)/settings/team')} />
          <Row icon={<FileIcon color="#0B132B" />} label="Plan & billing" />
          <Row icon={<FileIcon color="#0B132B" />} label="GST invoices" isLast />
        </Card>

        <SectionLabel>Preferences</SectionLabel>
        <Card>
          <Row
            icon={<WhatsAppIcon size={15} color="#25D366" />}
            label="Notifications"
            right={<Toggle value={notifications} onValueChange={setNotifications} />}
            isLast
          />
        </Card>

        <SectionLabel>Sync &amp; storage</SectionLabel>
        <Card>
          <Row
            icon={<StorageIcon size={15} />}
            label="Sync status"
            right={
              <View className="flex-row items-center gap-[10px]">
                <View className="flex-row items-center gap-[5px]">
                  <View className="w-[6px] h-[6px] rounded-full bg-success" />
                  <Typography className="text-[12px] font-bold text-[#2E9C61]">Synced</Typography>
                </View>
                <Typography className="text-[11.5px] font-bold text-gold">Sync now</Typography>
              </View>
            }
          />
          <Row icon={<StorageIcon size={15} />} label="Storage used" right={<Typography className="text-[12px] font-semibold text-slate">214 MB</Typography>} isLast />
        </Card>

        <SectionLabel>Support</SectionLabel>
        <Card>
          <Row icon={<WhatsAppIcon size={15} color="#25D366" />} label="Chat with support" isLast />
        </Card>

        <Pressable onPress={signOut} className="flex-row items-center gap-3 bg-white border border-hairline rounded-2xl px-4 py-[14px] mt-[22px]">
          <LogoutIcon />
          <Typography className="text-[13.5px] font-bold text-[#C23B3B]">Log out</Typography>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <Typography className="text-[10.5px] font-bold tracking-[0.12em] text-slate mt-[22px] mb-[10px] px-[2px]" style={{ textTransform: 'uppercase' }}>
      {children}
    </Typography>
  );
}

function Card({ children }: { children: ReactNode }) {
  return <View className="bg-white border border-hairline rounded-2xl px-4">{children}</View>;
}
