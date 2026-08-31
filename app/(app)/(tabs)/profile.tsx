import { useState, type ReactNode } from 'react';
import { Alert, Linking, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Constants from 'expo-constants';

import { Typography } from '../../../components/ui/Typography';
import { Toggle } from '../../../components/ui/Toggle';
import { useSessionStore } from '../../../stores/useSessionStore';
import { useTeam } from '../../../hooks/useTeam';
import { useOrganization } from '../../../hooks/useOrganization';
import { useTemplates } from '../../../hooks/useMessageTemplates';
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
  const updateProfile = useSessionStore((s) => s.updateProfile);
  const initial = user?.name?.trim()?.[0]?.toUpperCase() ?? 'Y';

  const { data: organization } = useOrganization();
  const isPro = (organization?.planTier ?? user?.planTier) === 'pro';
  const seats = organization?.seats ?? 1;
  const companyCategory = organization?.category;

  const { data: whatsappTemplates } = useTemplates('whatsapp');
  const { data: emailTemplates } = useTemplates('email');
  const { data: teamMembers } = useTeam();
  const activeMemberCount = teamMembers?.filter((m) => m.status === 'active').length ?? 0;

  /**
   * The toggle shows what is actually stored, and writes it.
   *
   * It used to be `useState(true)` — it looked like a setting, turned off
   * happily, and forgot the moment the screen closed. The column
   * (`profiles.notifications_enabled`) had existed unused since 20260827130700.
   */
  const notifications = user?.notificationsEnabled ?? true;
  const [savingNotifications, setSavingNotifications] = useState(false);
  const toggleNotifications = async (next: boolean) => {
    if (savingNotifications) return;
    setSavingNotifications(true);
    const { error } = await updateProfile({ notificationsEnabled: next });
    setSavingNotifications(false);
    if (error) Alert.alert("Couldn't save that", error);
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

        {/*
          Reads the organisation's real plan. This block used to say "Pro plan ·
          Renews 12 Mar 2027 · ACTIVE" to everyone, including every Free account
          — a renewal date for a subscription nobody had bought.

          No renewal date is shown at all yet: it belongs to a `subscriptions`
          row, and nothing writes one until the payment webhook exists (Phase
          4.2). Showing the seat count instead is true today.
        */}
        <View className="flex-row items-center gap-3 rounded-2xl px-[18px] py-4 mt-[14px]" style={{ backgroundColor: '#0B132B' }}>
          <View className="flex-1">
            <Typography className="text-[13.5px] font-bold text-white">
              {isPro ? 'Pro plan' : 'Free plan'}
            </Typography>
            <Typography className="text-[11.5px] text-white/[0.55] mt-[2px]">
              {isPro
                ? `${seats} ${seats === 1 ? 'seat' : 'seats'} · annual`
                : '1 event · 100 leads · 3 voice notes'}
            </Typography>
          </View>
          {isPro ? (
            <View className="bg-gold rounded-full px-[10px] py-[4px]">
              <Typography className="text-[10.5px] font-extrabold text-navy" style={{ letterSpacing: 0.4 }}>
                ACTIVE
              </Typography>
            </View>
          ) : (
            <Pressable
              onPress={() => router.push('/(app)/(modals)/upgrade')}
              className="bg-gold rounded-full px-[13px] py-[6px]"
            >
              <Typography className="text-[11px] font-extrabold text-navy">Upgrade</Typography>
            </Pressable>
          )}
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
                <Typography className="text-[12px] font-semibold text-slate">{whatsappTemplates?.length ?? 0}</Typography>
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
                <Typography className="text-[12px] font-semibold text-slate">{emailTemplates?.length ?? 0}</Typography>
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
            right={<Toggle value={notifications} onValueChange={(v) => void toggleNotifications(v)} />}
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
          {/*
            Version only, with no "Check now".
            The old row waited 900ms and then said "You're up to date" no matter
            what — it could not have known, because expo-updates is not installed
            and there is no update channel to ask. A button that always returns
            the same reassuring answer is worse than no button. Add it back with
            expo-updates if OTA updates are ever set up.
          */}
          <Row
            icon={<RefreshIcon size={15} />}
            label="Version"
            right={<Typography className="text-[12px] font-semibold text-slate">v{APP_VERSION}</Typography>}
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

        {/*
          Both stores require account deletion to be reachable inside the app,
          not only by writing in. Deliberately plain and last — it belongs
          nowhere near the rows people tap to change their name, and the screen
          it opens explains the damage before anything happens.
        */}
        <Pressable
          onPress={() => router.push('/(app)/settings/delete-account')}
          className="items-center py-4 mt-2"
        >
          <Typography className="text-[13px] font-semibold text-slate underline">
            Delete account
          </Typography>
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
