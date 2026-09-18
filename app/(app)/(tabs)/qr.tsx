import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, View, type LayoutChangeEvent } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';

import { Typography } from '../../../components/ui/Typography';
import { Button } from '../../../components/ui/Button';
import { TAB_BAR_HEIGHT } from '../../../components/app/TabBar';
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
 *
 * Deliberately does not scroll. You hold this screen out to someone, so
 * everything has to be on it at once — and a screen you scroll is a screen
 * where "Share your card" can hide under the tab bar, which is exactly what
 * it did. The fixed column below ends above the bar, and the QR takes
 * whatever height is left over rather than a hard-coded size.
 */
export default function QrTabScreen() {
  const user = useSessionStore((s) => s.user);
  const insets = useSafeAreaInsets();
  const { data: card, isLoading } = useMyCard();

  const initial = user?.name?.trim()?.[0]?.toUpperCase() ?? 'Y';
  const designation = card?.designation ?? user?.designation ?? '';
  const phone = card?.phone ?? user?.phone ?? '';
  const email = card?.email ?? user?.email ?? '';
  // `||`, not `??`: user.company is the empty string for an admin who has not
  // named their organisation yet (stripped in lib/mappers/profile.ts), and
  // filter(Boolean) then drops it — so the card a rep holds up reads
  // "Your role" rather than "Your role · My workspace".
  const role = [designation || 'Your role', card?.companyName || user?.company]
    .filter(Boolean)
    .join(' · ');

  /**
   * The QR is sized from the space actually left over, not from a constant.
   *
   * The caption wraps to a different number of lines at different system font
   * sizes, and the "build your card" state adds a line of its own, so no fixed
   * size is right on every phone. The box below is `flex-1`, so it reports
   * whatever the card and the button did not take, and the code fills it up to
   * 200 — comfortably scannable, and never large enough to push the button
   * under the tab bar.
   */
  const [qrBox, setQrBox] = useState(0);
  const onQrLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    const next = Math.floor(Math.min(width, height));
    // Ignore the 0 a tab transition can report, and no-op on an identical
    // re-measure, the way CaptureMap does.
    if (next > 0 && next !== qrBox) setQrBox(next);
  };
  const qrSize = Math.min(200, qrBox);

  const vCardValue = buildVCard({
    name: card?.displayName ?? user?.name ?? 'Your name',
    company: card?.companyName || user?.company || undefined,
    designation,
    phone,
    email,
    secondaryEmail: card?.secondaryEmail ?? undefined,
    website: card?.websiteUrl ?? undefined,
    linkedin: linkedinUrl(card?.linkedinUrl) ?? undefined,
    address: card?.officeAddress ?? undefined,
  });

  return (
    // `edges={['top']}` only: the tab bar already adds `insets.bottom` itself,
    // and the column below adds it again for its own clearance. Asking for the
    // bottom edge here as well would reserve that space a third time.
    <SafeAreaView className="flex-1 bg-section" edges={['top']}>
      <View className="bg-white px-5 pt-[14px] pb-[10px] flex-row items-center justify-between">
        <Typography className="text-[26px] font-extrabold text-navy tracking-[-0.01em]">Your QR</Typography>
        <Pressable onPress={() => router.push('/(app)/card/edit')} className="w-9 h-9 rounded-full bg-surface items-center justify-center">
          <EditIcon size={15} />
        </Pressable>
      </View>

      <View
        className="flex-1 px-5 pt-3 items-center"
        style={{ paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 12 }}
      >
        <View className="w-full bg-navy rounded-2xl p-4 overflow-hidden">
          {card?.photoUrl ? (
            <Image source={{ uri: card.photoUrl }} className="w-12 h-12 rounded-xl" resizeMode="cover" />
          ) : (
            <View className="w-12 h-12 rounded-xl bg-gold items-center justify-center">
              <Typography className="text-[18px] font-extrabold text-navy">{initial}</Typography>
            </View>
          )}
          <Typography className="mt-3 text-[17px] font-bold text-white">
            {card?.displayName ?? user?.name ?? 'Your name'}
          </Typography>
          <Typography className="text-[12.5px] text-white/[0.65] mt-[2px]">{role}</Typography>
          <View className="h-px bg-white/[0.12] my-[10px]" />
          {/* One row each, not two side by side: an email of any normal length
              overran the card and was clipped by `overflow-hidden`. `flex-1`
              on the text is what lets it truncate rather than overflow. */}
          <View className="flex-row items-center gap-[6px]">
            <PhoneIcon />
            <Typography className="text-[11px] text-white/[0.60]">{phone || 'Add your mobile'}</Typography>
          </View>
          <View className="flex-row items-center gap-[6px] mt-[6px]">
            <MailIcon />
            <Typography numberOfLines={1} ellipsizeMode="tail" className="flex-1 text-[11px] text-white/[0.60]">
              {email || 'you@company.com'}
            </Typography>
          </View>
        </View>

        <View className="w-full flex-1 bg-white border border-hairline rounded-lg p-4 mt-3 items-center">
          <View className="w-full flex-1 items-center justify-center" onLayout={onQrLayout}>
            {isLoading || qrSize < 1 ? (
              <ActivityIndicator size="small" color="#0B132B" />
            ) : (
              <QRCode value={vCardValue} size={qrSize} color="#0B132B" backgroundColor="#fff" />
            )}
          </View>
          <Typography className="text-[12px] text-slate text-center mt-[14px] leading-[1.45]">
            Anyone can scan this to save your details straight to their contacts, and it works with no signal.
          </Typography>
          {card ? (
            <Typography className="text-[12.5px] font-bold text-navy mt-2">
              {displayUrl(cardShareUrl(card.slug))}
            </Typography>
          ) : null}
        </View>

        {!isLoading && !card ? (
          <Typography numberOfLines={3} className="text-[12.5px] text-slate text-center mt-3 leading-[1.5] max-w-[280px]">
            Build your card to get a link people can open, and a QR with your real details on it.
          </Typography>
        ) : null}

        <Button
          label={card ? 'Share your card' : 'Build your card'}
          onPress={() => router.push(card ? '/(app)/card/share' : '/(app)/card/edit')}
          icon={card ? <ShareIcon size={17} color="#0B132B" /> : undefined}
          className="w-full mt-3"
        />
      </View>
    </SafeAreaView>
  );
}
