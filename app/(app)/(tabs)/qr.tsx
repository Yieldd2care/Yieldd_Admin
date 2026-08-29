import { ActivityIndicator, Image, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';

import { Typography } from '../../../components/ui/Typography';
import { Button } from '../../../components/ui/Button';
import { EditIcon, MailIcon, PhoneIcon, ShareIcon } from '../../../components/ui/icons';
import { useSessionStore } from '../../../stores/useSessionStore';
import { useMyCard } from '../../../hooks/useBusinessCard';
import { displayUrl, cardShareUrl, linkedinUrl } from '../../../lib/cardLinks';
import { buildVCard } from '../../../lib/vcard';

/**
 * The screen a rep holds up at a stall.
 *
 * The QR carries a vCard rather than the card's URL on purpose: an exhibition
 * hall is where this gets used and where the wifi is worst, and a vCard scan
 * saves straight to contacts with no connection at all. The link is shown
 * underneath for anyone who wants the full page.
 */
export default function QrTabScreen() {
  const user = useSessionStore((s) => s.user);
  const { data: card, isLoading } = useMyCard();

  const initial = user?.name?.trim()?.[0]?.toUpperCase() ?? 'Y';
  const designation = card?.designation ?? user?.designation ?? '';
  const phone = card?.phone ?? user?.phone ?? '';
  const email = card?.email ?? user?.email ?? '';
  const role = [designation || 'Your role', card?.companyName ?? user?.company].filter(Boolean).join(' · ');

  const vCardValue = buildVCard({
    name: card?.displayName ?? user?.name ?? 'Your name',
    company: card?.companyName ?? user?.company ?? undefined,
    designation,
    phone,
    email,
    secondaryEmail: card?.secondaryEmail ?? undefined,
    website: card?.websiteUrl ?? undefined,
    linkedin: linkedinUrl(card?.linkedinUrl) ?? undefined,
    address: card?.officeAddress ?? undefined,
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
          {card?.photoUrl ? (
            <Image source={{ uri: card.photoUrl }} className="w-14 h-14 rounded-xl" resizeMode="cover" />
          ) : (
            <View className="w-14 h-14 rounded-xl bg-gold items-center justify-center">
              <Typography className="text-[20px] font-extrabold text-navy">{initial}</Typography>
            </View>
          )}
          <Typography className="mt-[14px] text-[17px] font-bold text-white">
            {card?.displayName ?? user?.name ?? 'Your name'}
          </Typography>
          <Typography className="text-[12.5px] text-white/[0.65] mt-[2px]">{role}</Typography>
          <View className="h-px bg-white/[0.12] my-[14px]" />
          <View className="flex-row gap-4">
            <View className="flex-row items-center gap-[6px]">
              <PhoneIcon />
              <Typography className="text-[11px] text-white/[0.60]">{phone || 'Add your mobile'}</Typography>
            </View>
            <View className="flex-row items-center gap-[6px]">
              <MailIcon />
              <Typography className="text-[11px] text-white/[0.60]">{email || 'you@company.com'}</Typography>
            </View>
          </View>
        </View>

        <View className="w-full bg-white border border-hairline rounded-lg p-5 mt-5 items-center">
          {isLoading ? (
            <View className="h-[180px] items-center justify-center">
              <ActivityIndicator size="small" color="#0B132B" />
            </View>
          ) : (
            <QRCode value={vCardValue} size={180} color="#0B132B" backgroundColor="#fff" />
          )}
          <Typography className="text-[12px] text-slate text-center mt-[14px] leading-[1.45]">
            Anyone can scan this to save your details straight to their contacts — it works with no signal.
          </Typography>
          {card ? (
            <Typography className="text-[12.5px] font-bold text-navy mt-2">
              {displayUrl(cardShareUrl(card.slug))}
            </Typography>
          ) : null}
        </View>

        {!isLoading && !card ? (
          <Typography className="text-[12.5px] text-slate text-center mt-4 leading-[1.5] max-w-[280px]">
            Build your card to get a link people can open, and a QR with your real details on it.
          </Typography>
        ) : null}

        <Button
          label={card ? 'Share your card' : 'Build your card'}
          onPress={() => router.push(card ? '/(app)/card/share' : '/(app)/card/edit')}
          icon={card ? <ShareIcon size={17} color="#0B132B" /> : undefined}
          className="w-full mt-5"
        />
      </ScrollView>
    </SafeAreaView>
  );
}
