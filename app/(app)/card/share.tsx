import { useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, Share, View } from 'react-native';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as MediaLibrary from 'expo-media-library';
import { File, Paths } from 'expo-file-system';
import QRCode from 'react-native-qrcode-svg';

import { Typography } from '../../../components/ui/Typography';
import { GridIcon, LinkIcon, MailIcon, MessageIcon, MoreIcon, WhatsAppIcon } from '../../../components/ui/icons';
import { useMyCard } from '../../../hooks/useBusinessCard';
import { useSessionStore } from '../../../stores/useSessionStore';
import { cardShareUrl, linkedinUrl } from '../../../lib/cardLinks';
import { buildVCard } from '../../../lib/vcard';
import { base64ToBytes } from '../../../lib/files';

/**
 * Handing the card to someone.
 *
 * Everything here now comes from the saved card rather than a constant, which
 * matters because the whole point of the screen is that the link works — a
 * hardcoded URL that four-fifths of customers cannot open is worse than no
 * button at all.
 *
 * The QR is rendered off-screen purely so it has a ref to export from.
 * react-native-qrcode-svg can hand back a PNG directly through `toDataURL`,
 * which is more reliable than screenshotting a view that is not on screen.
 */

type Status = { kind: 'idle' } | { kind: 'busy' } | { kind: 'done'; message: string } | { kind: 'error'; message: string };

function AppButton({
  label,
  background,
  icon,
  onPress,
  disabled,
}: {
  label: string;
  background: string;
  icon: ReactNode;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} className={`items-center gap-2 w-[60px] ${disabled ? 'opacity-40' : ''}`}>
      <View className="w-[52px] h-[52px] rounded-2xl items-center justify-center" style={{ backgroundColor: background }}>
        {icon}
      </View>
      <Typography className="text-[11px] font-semibold text-navy text-center">{label}</Typography>
    </Pressable>
  );
}

function ActionRow({
  icon,
  label,
  onPress,
  disabled,
  busy,
}: {
  icon: ReactNode;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      className={`flex-row items-center gap-[14px] py-3 ${disabled ? 'opacity-40' : ''}`}
    >
      <View className="w-9 h-9 rounded-md bg-surface items-center justify-center">{icon}</View>
      <Typography className="text-[13.5px] font-semibold text-navy">{label}</Typography>
      {busy ? <ActivityIndicator size="small" color="#97A3B8" /> : null}
    </Pressable>
  );
}

export default function ShareSheetScreen() {
  const user = useSessionStore((s) => s.user);
  const { data: card, isLoading } = useMyCard();
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const qrRef = useRef<{ toDataURL: (cb: (data: string) => void) => void } | null>(null);

  const shareUrl = card ? cardShareUrl(card.slug) : null;
  const shareMessage = shareUrl
    ? `Here's my digital business card: ${shareUrl}`
    : '';

  const vCardValue = card
    ? buildVCard({
        name: card.displayName,
        company: card.companyName ?? undefined,
        designation: card.designation ?? undefined,
        phone: card.phone ?? undefined,
        email: card.email ?? undefined,
        secondaryEmail: card.secondaryEmail ?? undefined,
        website: card.websiteUrl ?? undefined,
        linkedin: linkedinUrl(card.linkedinUrl) ?? undefined,
        address: card.officeAddress ?? undefined,
      })
    : buildVCard({ name: user?.name ?? 'Your card' });

  const ready = Boolean(shareUrl);

  const copyLink = async () => {
    if (!shareUrl) return;
    await Clipboard.setStringAsync(shareUrl);
    setStatus({ kind: 'done', message: 'Link copied.' });
  };

  const saveQr = async () => {
    if (!card) return;
    setStatus({ kind: 'busy' });

    const base64 = await new Promise<string | null>((resolve) => {
      const target = qrRef.current;
      if (!target?.toDataURL) return resolve(null);
      // No timeout guard: toDataURL is synchronous inside the library and a
      // never-resolving promise here would only ever be a bug in it.
      target.toDataURL((data) => resolve(data));
    });

    if (!base64) {
      setStatus({ kind: 'error', message: "The QR image couldn't be created." });
      return;
    }

    try {
      if (Platform.OS === 'web') {
        // A browser has no photo library; the download is the save.
        const link = globalThis.document.createElement('a');
        link.href = `data:image/png;base64,${base64}`;
        link.download = `${card.slug}-qr.png`;
        link.click();
        setStatus({ kind: 'done', message: 'QR image downloaded.' });
        return;
      }

      // Write-only. The app saves an image and never reads the gallery, and
      // the read half pulls READ_MEDIA_IMAGES into the manifest — which Play
      // restricts, and for which "so we can save a picture" is not an accepted
      // reason. Asking to add is enough.
      const permission = await MediaLibrary.requestPermissionsAsync(true);
      if (!permission.granted) {
        setStatus({ kind: 'error', message: 'Yieldd needs permission to save to your photos.' });
        return;
      }

      const file = new File(Paths.cache, `${card.slug}-qr.png`);
      if (file.exists) file.delete();
      file.create();
      file.write(base64ToBytes(base64));

      await MediaLibrary.saveToLibraryAsync(file.uri);
      setStatus({ kind: 'done', message: 'QR image saved to your photos.' });
    } catch {
      setStatus({ kind: 'error', message: "The QR image couldn't be saved." });
    }
  };

  const openWhatsApp = () => Linking.openURL(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`);
  const openMessages = () => Linking.openURL(`sms:?body=${encodeURIComponent(shareMessage)}`);
  const openEmail = () =>
    Linking.openURL(
      `mailto:?subject=${encodeURIComponent(`${card?.displayName ?? 'My'} — business card`)}&body=${encodeURIComponent(shareMessage)}`
    );
  const openMore = () => Share.share({ message: shareMessage });

  return (
    <Pressable className="flex-1 bg-navy/[0.55]" onPress={() => router.back()}>
      <Pressable className="mt-auto bg-white rounded-t-[20px] pt-[10px] px-5 pb-8" onPress={(e) => e.stopPropagation()}>
        <View className="w-9 h-1 rounded-full bg-hairline self-center mb-4" />
        <Typography className="text-[14px] font-bold text-navy mb-1">Share your card</Typography>

        {isLoading ? (
          <Typography className="text-[12px] text-slate mb-4">Loading your card…</Typography>
        ) : ready ? (
          <Typography className="text-[12px] text-slate mb-4">{shareUrl?.replace(/^https?:\/\//, '')}</Typography>
        ) : (
          <Typography className="text-[12px] text-slate mb-4 leading-[1.45]">
            Build and save your card first — there is no link to send yet.
          </Typography>
        )}

        <View className="flex-row gap-[18px]">
          <AppButton label="WhatsApp" background="#25D366" icon={<WhatsAppIcon size={24} color="#fff" />} onPress={openWhatsApp} disabled={!ready} />
          <AppButton label="Messages" background="#EEF1F7" icon={<MessageIcon size={22} color="#0B132B" />} onPress={openMessages} disabled={!ready} />
          <AppButton label="Email" background="#EEF1F7" icon={<MailIcon size={22} color="#0B132B" strokeWidth={1.75} />} onPress={openEmail} disabled={!ready} />
          <AppButton label="More" background="#EEF1F7" icon={<MoreIcon />} onPress={openMore} disabled={!ready} />
        </View>

        <View className="h-px bg-hairline my-[18px]" />

        <ActionRow icon={<LinkIcon />} label="Copy link" onPress={copyLink} disabled={!ready} />
        <ActionRow
          icon={<GridIcon />}
          label="Save QR image"
          onPress={saveQr}
          disabled={!ready}
          busy={status.kind === 'busy'}
        />

        {status.kind === 'done' || status.kind === 'error' ? (
          <Typography
            className={`text-[12px] mt-1 ${status.kind === 'error' ? 'text-[#C23B3B]' : 'text-slate'}`}
          >
            {status.message}
          </Typography>
        ) : null}

        {!card?.isPublished && card ? (
          <Typography className="text-[11.5px] text-slate mt-3 leading-[1.45]">
            Your card page is switched off, so anyone opening this link sees nothing. Turn it back on from
            &ldquo;Your card&rdquo;.
          </Typography>
        ) : null}

        {/* Off-screen, purely so the QR has a ref to export a PNG from. */}
        <View style={{ position: 'absolute', opacity: 0, left: -10000, top: 0 }} pointerEvents="none">
          <QRCode
            value={vCardValue}
            size={512}
            color="#0B132B"
            backgroundColor="#ffffff"
            quietZone={24}
            getRef={(component) => {
              qrRef.current = component as unknown as { toDataURL: (cb: (data: string) => void) => void } | null;
            }}
          />
        </View>
      </Pressable>
    </Pressable>
  );
}
