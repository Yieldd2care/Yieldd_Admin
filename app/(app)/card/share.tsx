import type { ReactNode } from 'react';
import { Alert, Linking, Pressable, Share, View } from 'react-native';
import { router } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { GridIcon, LinkIcon, MailIcon, MessageIcon, MoreIcon, WhatsAppIcon } from '../../../components/ui/icons';

const CARD_URL = 'https://card.yieldd.co/priya-sharma';
const SHARE_MESSAGE = `Here's my digital business card: ${CARD_URL}`;

function AppButton({ label, background, icon, onPress }: { label: string; background: string; icon: ReactNode; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="items-center gap-2 w-[60px]">
      <View className="w-[52px] h-[52px] rounded-2xl items-center justify-center" style={{ backgroundColor: background }}>
        {icon}
      </View>
      <Typography className="text-[11px] font-semibold text-navy text-center">{label}</Typography>
    </Pressable>
  );
}

function ActionRow({ icon, label, onPress }: { icon: ReactNode; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center gap-[14px] py-3">
      <View className="w-9 h-9 rounded-md bg-surface items-center justify-center">{icon}</View>
      <Typography className="text-[13.5px] font-semibold text-navy">{label}</Typography>
    </Pressable>
  );
}

export default function ShareSheetScreen() {
  const openWhatsApp = () => Linking.openURL(`https://wa.me/?text=${encodeURIComponent(SHARE_MESSAGE)}`);
  const openMessages = () => Linking.openURL(`sms:?body=${encodeURIComponent(SHARE_MESSAGE)}`);
  const openEmail = () => Linking.openURL(`mailto:?body=${encodeURIComponent(SHARE_MESSAGE)}`);
  const openMore = () => Share.share({ message: SHARE_MESSAGE });
  const copyLink = () => Alert.alert('Copy link', 'Clipboard support isn’t wired up yet.');
  const saveQr = () => Alert.alert('Save QR image', 'Image export isn’t wired up yet.');

  return (
    <Pressable className="flex-1 bg-navy/[0.55]" onPress={() => router.back()}>
      <Pressable className="mt-auto bg-white rounded-t-[20px] pt-[10px] px-5 pb-8" onPress={(e) => e.stopPropagation()}>
        <View className="w-9 h-1 rounded-full bg-hairline self-center mb-4" />
        <Typography className="text-[14px] font-bold text-navy mb-4">Share your card</Typography>

        <View className="flex-row gap-[18px]">
          <AppButton label="WhatsApp" background="#25D366" icon={<WhatsAppIcon size={24} color="#fff" />} onPress={openWhatsApp} />
          <AppButton label="Messages" background="#EEF1F7" icon={<MessageIcon size={22} color="#0B132B" />} onPress={openMessages} />
          <AppButton label="Email" background="#EEF1F7" icon={<MailIcon size={22} color="#0B132B" strokeWidth={1.75} />} onPress={openEmail} />
          <AppButton label="More" background="#EEF1F7" icon={<MoreIcon />} onPress={openMore} />
        </View>

        <View className="h-px bg-hairline my-[18px]" />

        <ActionRow icon={<LinkIcon />} label="Copy link" onPress={copyLink} />
        <ActionRow icon={<GridIcon />} label="Save QR image" onPress={saveQr} />
      </Pressable>
    </Pressable>
  );
}
