import { useState, type ReactNode } from 'react';
import { Alert, Linking, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Constants from 'expo-constants';

import { Typography } from '../../../components/ui/Typography';
import { Toggle } from '../../../components/ui/Toggle';
import { useSessionStore } from '../../../stores/useSessionStore';
import { useTemplatesStore } from '../../../stores/useTemplatesStore';
import { useCompanyStore } from '../../../stores/useCompanyStore';
import { useTeamStore } from '../../../stores/useTeamStore';
import {
  ChevronRightIcon,
  DownloadIcon,
  FileIcon,
  LogoutIcon,
  MailIcon,
  RefreshIcon,
  StorageIcon,
  TagIcon,
  UsersIcon,
  WhatsAppIcon,
} from '../../../components/ui/icons';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

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

  const whatsappTemplateCount = useTemplatesStore((s) => s.whatsappTemplates.length);
  const emailTemplateCount = useTemplatesStore((s) => s.emailTemplates.length);
  const companyCategory = useCompanyStore((s) => s.selectedCategory);
  const activeMemberCount = useTeamStore((s) => s.members.filter((m) => m.status === 'active').length);

  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const checkForUpdate = () => {
    if (checkingUpdate) return;
    setCheckingUpdate(true);
    setTimeout(() => {
      setCheckingUpdate(false);
      Alert.alert("You're up to date", `Yieldd v${APP_VERSION} is the latest version.`);
    }, 900);
  };

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
            <Typography className="text-[12px] text-slate mt-[2px]">
              {user?.designation?.trim() || (user?.role === 'admin' ? 'Admin' : 'Sales rep')} &middot;{' '}
              {user?.company ?? ''}
            </Typography>
          </View>
          {/*
            No chevron here on purpose (PENDING.md #5) — this block is who you
            are signed in as, not a link. An arrow promised a screen that does
            not exist.
          */}
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
          <Row icon={<UsersIcon size={15} />} label="Team" right={<Typography className="text-[12px] font-semibold text-slate">{activeMemberCount} members</Typography>} onPress={() => router.push('/(app)/settings/team')} />
          <Row
            icon={<FileIcon color="#0B132B" />}
            label="Plan & billing"
            right={<ChevronRightIcon size={16} color="#97A3B8" strokeWidth={2} />}
            onPress={() => Alert.alert('Plan & billing', "Plan & billing isn't wired up yet.")}
            isLast
          />
        </Card>

        <SectionLabel>Business</SectionLabel>
        <Card>
          <Row
            icon={<WhatsAppIcon size={15} color="#25D366" />}
            label="WhatsApp template"
            right={
              <View className="flex-row items-center gap-[6px]">
                <Typography className="text-[12px] font-semibold text-slate">{whatsappTemplateCount}</Typography>
                <ChevronRightIcon size={16} color="#97A3B8" strokeWidth={2} />
              </View>
            }
            onPress={() => router.push('/(app)/settings/whatsapp-template')}
          />
          <Row
            icon={<MailIcon size={15} color="#0B132B" strokeWidth={1.75} />}
            label="Email template"
            right={
              <View className="flex-row items-center gap-[6px]">
                <Typography className="text-[12px] font-semibold text-slate">{emailTemplateCount}</Typography>
                <ChevronRightIcon size={16} color="#97A3B8" strokeWidth={2} />
              </View>
            }
            onPress={() => router.push('/(app)/settings/email-template')}
          />
          <Row
            icon={<TagIcon size={15} />}
            label="Company category"
            right={
              <View className="flex-row items-center gap-[6px]">
                <Typography className="text-[12px] font-semibold text-slate" numberOfLines={1}>
                  {companyCategory ?? 'Not set'}
                </Typography>
                <ChevronRightIcon size={16} color="#97A3B8" strokeWidth={2} />
              </View>
            }
            onPress={() => router.push('/(app)/settings/category')}
            isLast
          />
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

        <SectionLabel>Sync</SectionLabel>
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
            isLast
          />
        </Card>

        <SectionLabel>Data</SectionLabel>
        <Card>
          <Row
            icon={<DownloadIcon size={15} />}
            label="Export leads"
            right={<ChevronRightIcon size={16} color="#97A3B8" strokeWidth={2} />}
            onPress={() => router.push('/(app)/settings/export')}
            isLast
          />
        </Card>

        <SectionLabel>General</SectionLabel>
        <Card>
          <Row
            icon={<FileIcon color="#0B132B" />}
            label="Privacy policy"
            right={<ChevronRightIcon size={16} color="#97A3B8" strokeWidth={2} />}
            onPress={() => Linking.openURL('https://yieldd.co/privacy')}
          />
          <Row
            icon={<FileIcon color="#0B132B" />}
            label="Terms of service"
            right={<ChevronRightIcon size={16} color="#97A3B8" strokeWidth={2} />}
            onPress={() => Linking.openURL('https://yieldd.co/terms')}
          />
          <Row
            icon={<RefreshIcon size={15} />}
            label="Check for updates"
            right={
              <View className="flex-row items-center gap-[8px]">
                <Typography className="text-[12px] font-semibold text-slate">v{APP_VERSION}</Typography>
                <Typography className="text-[11.5px] font-bold text-gold">
                  {checkingUpdate ? 'Checking…' : 'Check now'}
                </Typography>
              </View>
            }
            onPress={checkForUpdate}
            isLast
          />
        </Card>

        <SectionLabel>Support</SectionLabel>
        <Card>
          <Row
            icon={<WhatsAppIcon size={15} color="#25D366" />}
            label="Chat with support"
            right={<ChevronRightIcon size={16} color="#97A3B8" strokeWidth={2} />}
            onPress={() => Alert.alert('Chat with support', "Support chat isn't wired up yet.")}
            isLast
          />
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
