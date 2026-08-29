import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Image, Linking, Platform, Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { Typography } from '../../components/ui/Typography';
import {
  GlobeIcon,
  LinkIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  ContactsIcon,
  WhatsAppIcon,
} from '../../components/ui/icons';
import { fetchPublicCard, type BusinessCard } from '../../lib/api/businessCard';
import { linkedinUrl, mailtoUrl, safeExternalUrl, telUrl } from '../../lib/cardLinks';
import { whatsappDigits } from '../../lib/messageText';
import { buildVCard } from '../../lib/vcard';

/**
 * Somebody's card, opened by somebody else.
 *
 * This route sits at the filesystem root rather than inside `(app)` or
 * `(web)` — for the same reason `invite.tsx` does. Both those groups guard on
 * whether there is a session, and the entire audience for this page has no
 * account. It is read as `anon`, through a column-level grant, so a column
 * added to `business_cards` later stays private until someone opts it in.
 *
 * Every URL on the page goes through `safeExternalUrl` first. The card owner
 * types these, the page is served from yieldd.co, and a `javascript:` href
 * here would run in yieldd.co's origin for every visitor who tapped it.
 */

type State =
  | { kind: 'loading' }
  | { kind: 'found'; card: BusinessCard }
  | { kind: 'missing' }
  | { kind: 'error' };

export default function PublicCardScreen() {
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    if (!slug) {
      setState({ kind: 'missing' });
      return;
    }
    let cancelled = false;
    setState({ kind: 'loading' });

    void fetchPublicCard(slug).then((result) => {
      if (cancelled) return;
      setState(result.state === 'found' ? { kind: 'found', card: result.card } : { kind: result.state });
    });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  // The browser tab, and what a shared link shows in a chat preview.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const card = state.kind === 'found' ? state.card : null;
    globalThis.document.title = card
      ? [card.displayName, card.companyName].filter(Boolean).join(' · ')
      : 'Yieldd';
  }, [state]);

  if (state.kind === 'loading') {
    return (
      <View className="flex-1 bg-navy items-center justify-center">
        <ActivityIndicator size="small" color="#F4B000" />
      </View>
    );
  }

  if (state.kind !== 'found') {
    return <NotFound isError={state.kind === 'error'} />;
  }

  return <Card card={state.card} />;
}

function Card({ card }: { card: BusinessCard }) {
  const initial = card.displayName.trim()[0]?.toUpperCase() ?? 'Y';
  const role = [card.designation, card.companyName].filter(Boolean).join(' · ');

  const tel = telUrl(card.phone);
  const mailto = mailtoUrl(card.email);
  const secondaryMailto = mailtoUrl(card.secondaryEmail);
  const website = safeExternalUrl(card.websiteUrl);
  const linkedin = linkedinUrl(card.linkedinUrl);
  const whatsapp = whatsappDigits(card.phone);

  const vcard = buildVCard({
    name: card.displayName,
    company: card.companyName ?? undefined,
    designation: card.designation ?? undefined,
    phone: card.phone ?? undefined,
    email: card.email ?? undefined,
    secondaryEmail: card.secondaryEmail ?? undefined,
    website: website ?? undefined,
    linkedin: linkedin ?? undefined,
    address: card.officeAddress ?? undefined,
  });

  const saveContact = () => {
    if (Platform.OS === 'web') {
      // A .vcf is what every phone and every mail client understands; the
      // browser's download is the only route to the contacts app from here.
      const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' });
      const url = globalThis.URL.createObjectURL(blob);
      const link = globalThis.document.createElement('a');
      link.href = url;
      link.download = `${card.slug}.vcf`;
      link.click();
      globalThis.URL.revokeObjectURL(url);
      return;
    }
    void Linking.openURL(`data:text/vcard;charset=utf-8,${encodeURIComponent(vcard)}`);
  };

  return (
    <ScrollView className="flex-1 bg-section" contentContainerClassName="items-center px-4 py-8">
      <View className="w-full max-w-[440px]">
        {/* ---- the card itself ---- */}
        <View className="bg-navy rounded-[22px] px-6 pt-7 pb-6 overflow-hidden">
          {card.photoUrl ? (
            <Image source={{ uri: card.photoUrl }} className="w-[76px] h-[76px] rounded-2xl" resizeMode="cover" />
          ) : (
            <View className="w-[76px] h-[76px] rounded-2xl bg-gold items-center justify-center">
              <Typography className="text-[30px] font-extrabold text-navy">{initial}</Typography>
            </View>
          )}

          <Typography className="mt-4 text-[24px] font-extrabold text-white tracking-[-0.01em] leading-[1.2]">
            {card.displayName}
          </Typography>
          {role ? (
            <Typography className="text-[13.5px] text-white/[0.68] mt-[5px] leading-[1.45]">{role}</Typography>
          ) : null}

          {card.bio ? (
            <>
              <View className="h-px bg-white/[0.12] my-[18px]" />
              <Typography className="text-[13px] text-white/[0.72] leading-[1.6]">{card.bio}</Typography>
            </>
          ) : null}
        </View>

        {/* ---- the three things a visitor actually came to do ---- */}
        <View className="flex-row gap-[10px] mt-4">
          {tel ? (
            <QuickAction
              icon={<PhoneIcon size={18} color="#0B132B" />}
              label="Call"
              onPress={() => Linking.openURL(tel)}
            />
          ) : null}
          {whatsapp ? (
            <QuickAction
              icon={<WhatsAppIcon size={19} color="#0B132B" />}
              label="WhatsApp"
              onPress={() => Linking.openURL(`https://wa.me/${whatsapp}`)}
            />
          ) : null}
          {mailto ? (
            <QuickAction
              icon={<MailIcon size={19} color="#0B132B" strokeWidth={1.75} />}
              label="Email"
              onPress={() => Linking.openURL(mailto)}
            />
          ) : null}
        </View>

        <Pressable
          onPress={saveContact}
          className="flex-row items-center justify-center gap-2 h-[54px] rounded-md bg-gold mt-[10px] shadow-[0_10px_24px_rgba(244,176,0,0.30)]"
        >
          <ContactsIcon size={18} color="#0B132B" />
          <Typography className="text-[15.5px] font-bold text-navy">Save to contacts</Typography>
        </Pressable>

        {/* ---- the detail ---- */}
        <View className="bg-white border border-hairline rounded-2xl px-4 mt-5">
          <DetailRow icon={<PhoneIcon size={17} color="#0B132B" strokeWidth={1.75} />} label="Mobile" value={card.phone} href={tel} />
          <DetailRow icon={<MailIcon size={17} color="#0B132B" strokeWidth={1.75} />} label="Email" value={card.email} href={mailto} />
          <DetailRow
            icon={<MailIcon size={17} color="#0B132B" strokeWidth={1.75} />}
            label="Other email"
            value={card.secondaryEmail}
            href={secondaryMailto}
          />
          <DetailRow icon={<GlobeIcon />} label="Website" value={website?.replace(/^https?:\/\//, '').replace(/\/$/, '')} href={website} />
          <DetailRow icon={<LinkIcon />} label="LinkedIn" value={linkedin?.replace(/^https?:\/\/(www\.)?/, '')} href={linkedin} />
          <DetailRow icon={<MapPinIcon />} label="Office" value={card.officeAddress} href={null} last />
        </View>

        {card.socialLinks.length ? (
          <View className="mt-5">
            <Typography
              className="text-[10px] font-bold tracking-[0.12em] text-slate mb-[10px]"
              style={{ textTransform: 'uppercase' }}
            >
              Elsewhere
            </Typography>
            <View className="flex-row flex-wrap gap-2">
              {card.socialLinks.map((link) => (
                <Pressable
                  key={link.url}
                  onPress={() => Linking.openURL(link.url)}
                  className="flex-row items-center gap-2 bg-white border border-hairline rounded-full px-[14px] py-[9px]"
                >
                  <LinkIcon />
                  <Typography className="text-[12.5px] font-semibold text-navy">{link.label}</Typography>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <Pressable onPress={() => Linking.openURL('https://yieldd.co')} className="items-center mt-8 py-3">
          <Typography className="text-[11.5px] text-slate">
            Card by <Typography className="text-[11.5px] font-bold text-navy">Yieldd</Typography>
          </Typography>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function QuickAction({ icon, label, onPress }: { icon: ReactNode; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 items-center justify-center gap-[6px] bg-white border border-hairline rounded-md py-[14px]"
    >
      {icon}
      <Typography className="text-[12px] font-semibold text-navy">{label}</Typography>
    </Pressable>
  );
}

function DetailRow({
  icon,
  label,
  value,
  href,
  last,
}: {
  icon: ReactNode;
  label: string;
  value: string | null | undefined;
  href: string | null | undefined;
  last?: boolean;
}) {
  if (!value) return null;

  const body = (
    <View className={`flex-row items-center gap-[14px] py-[14px] ${last ? '' : 'border-b border-section'}`}>
      <View className="w-9 h-9 rounded-md bg-surface items-center justify-center">{icon}</View>
      <View className="flex-1">
        <Typography className="text-[11px] text-slate">{label}</Typography>
        <Typography className="text-[14px] font-semibold text-navy mt-[1px] leading-[1.4]">{value}</Typography>
      </View>
    </View>
  );

  return href ? <Pressable onPress={() => Linking.openURL(href)}>{body}</Pressable> : body;
}

function NotFound({ isError }: { isError: boolean }) {
  return (
    <View className="flex-1 bg-navy items-center justify-center px-8">
      <View className="w-[74px] h-[74px] rounded-2xl bg-white/[0.06] border border-white/[0.14] items-center justify-center">
        <LinkIcon size={26} color="#F4B000" />
      </View>
      <Typography className="mt-6 text-[21px] font-extrabold text-white text-center tracking-[-0.01em]">
        {isError ? 'That didn’t load' : 'This card isn’t available'}
      </Typography>
      <Typography className="mt-3 text-[13.5px] text-white/[0.62] text-center leading-[1.55] max-w-[300px]">
        {isError
          ? 'Something went wrong fetching this card. Check your connection and try again.'
          : 'The link may be mistyped, or its owner may have switched their card off.'}
      </Typography>
      <Pressable
        onPress={() => Linking.openURL('https://yieldd.co')}
        className="bg-gold rounded-full px-7 py-3 mt-7"
      >
        <Typography className="text-[14.5px] font-bold text-navy">What is Yieldd?</Typography>
      </Pressable>
    </View>
  );
}
