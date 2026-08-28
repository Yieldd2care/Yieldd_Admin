import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';

import { Typography } from '../../../components/ui/Typography';
import { Button } from '../../../components/ui/Button';
import { EditIcon, MailIcon, PhoneIcon, ShareIcon } from '../../../components/ui/icons';
import { useSessionStore } from '../../../stores/useSessionStore';
import { useCardProfileStore } from '../../../stores/useCardProfileStore';
import { buildVCard } from '../../../lib/vcard';

export default function QrTabScreen() {
  const user = useSessionStore((s) => s.user);
  const profile = useCardProfileStore();

  const initial = user?.name?.trim()?.[0]?.toUpperCase() ?? 'Y';
  const role = [profile.designation || 'Your role', user?.company].filter(Boolean).join(' · ');

  const vCardValue = buildVCard({
    name: user?.name ?? 'Your name',
    company: user?.company,
    designation: profile.designation,
    phone: profile.mobile,
    email: user?.email,
    secondaryEmail: profile.secondaryEmail,
    website: profile.website,
    linkedin: profile.linkedin,
    address: profile.officeAddress,
  });

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top']}>
      <View className="bg-white px-5 pt-[18px] pb-3 flex-row items-center justify-between">
        <Typography className="text-[26px] font-extrabold text-navy tracking-[-0.01em]">Your QR</Typography>
        <Pressable onPress={() => router.push('/(app)/card/edit')} className="w-9 h-9 rounded-full bg-surface items-center justify-center">
          <EditIcon size={15} />
        </Pressable>
      </View>

      <ScrollView contentContainerClassName="items-center px-5 pt-[22px] pb-8" showsVerticalScrollIndicator={false}>
        <View className="w-full bg-navy rounded-2xl p-5 overflow-hidden">
          <View className="w-14 h-14 rounded-xl bg-gold items-center justify-center">
            <Typography className="text-[20px] font-extrabold text-navy">{initial}</Typography>
          </View>
          <Typography className="mt-[14px] text-[17px] font-bold text-white">{user?.name ?? 'Your name'}</Typography>
          <Typography className="text-[12.5px] text-white/[0.65] mt-[2px]">{role}</Typography>
          <View className="h-px bg-white/[0.12] my-[14px]" />
          <View className="flex-row gap-4">
            <View className="flex-row items-center gap-[6px]">
              <PhoneIcon />
              <Typography className="text-[11px] text-white/[0.60]">{profile.mobile || 'Add your mobile'}</Typography>
            </View>
            <View className="flex-row items-center gap-[6px]">
              <MailIcon />
              <Typography className="text-[11px] text-white/[0.60]">{user?.email ?? 'you@company.com'}</Typography>
            </View>
          </View>
        </View>

        <View className="w-full bg-white border border-hairline rounded-lg p-5 mt-5 items-center">
          <QRCode value={vCardValue} size={180} color="#0B132B" backgroundColor="#fff" />
          <Typography className="text-[12px] text-slate text-center mt-[14px]">
            Anyone can scan this to save your details straight to their contacts
          </Typography>
        </View>

        <Button
          label="Share your card"
          onPress={() => router.push('/(app)/card/share')}
          icon={<ShareIcon size={17} color="#0B132B" />}
          className="w-full mt-5"
        />
      </ScrollView>
    </SafeAreaView>
  );
}
