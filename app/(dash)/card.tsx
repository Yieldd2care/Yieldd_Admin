import { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';

import { DashShell } from '../../components/dash/DashShell';
import { Cap, Empty, GhostButton, Panel } from '../../components/dash/primitives';
import { Avatar, Icon, ICON } from '../../components/dash/controls';
import { Typography } from '../../components/ui/Typography';
import { useMyCard, useSetCardPublished } from '../../hooks/useBusinessCard';
import { useSessionStore } from '../../stores/useSessionStore';
import { cardShareUrl, displayUrl, linkedinUrl, safeExternalUrl } from '../../lib/cardLinks';
import { buildVCard } from '../../lib/vcard';

/**
 * The digital business card, from the desktop.
 *
 * Habsy's equivalent screen offers two QR codes, a brand-colour picker, a
 * background-cover upload and an enquiry-form builder. None of those are
 * taken. Yieldd has one card per person by design, its palette is fixed by the
 * brand, and the questions a visitor answers are the event's custom fields,
 * which already have a home in event setup. What is taken is the shape: the
 * code and the link on one side, what a visitor actually sees on the other.
 *
 * What is deliberately NOT here is a row of scan counters. Habsy shows Total
 * Scans, Unique and Contacts; Yieldd does not record a single one of those
 * yet, and three tiles reading 0 would be a claim we are measuring something
 * we are not.
 */

async function copy(text: string): Promise<boolean> {
  try {
    await globalThis.navigator?.clipboard?.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * A fixed width rather than `flex-1`. In a wrapping row, flexible children try
 * to share one line before they wrap, and nine of them on a narrow panel
 * overflow instead of forming rows.
 */
function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <View className="w-[210px] py-[10px]">
      <Cap>{label}</Cap>
      <Typography className={`text-[14px] mt-1 ${value ? 'text-navy font-medium' : 'text-placeholder'}`}>
        {value || 'Not added'}
      </Typography>
    </View>
  );
}

export default function DashCard() {
  const router = useRouter();
  const user = useSessionStore((s) => s.user);
  const { data: card, isLoading } = useMyCard();
  const setPublished = useSetCardPublished();

  const [copied, setCopied] = useState<'link' | 'vcard' | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <DashShell title="Digital card">
        <Panel>
          <Empty title="Loading your card" body="One moment." />
        </Panel>
      </DashShell>
    );
  }

  if (!card) {
    return (
      <DashShell title="Digital card">
        <Panel>
          <Empty
            title="No card yet"
            body="Build your card in the phone app under Your QR. It appears here the moment it saves, and the link works straight away."
          />
        </Panel>
      </DashShell>
    );
  }

  const url = cardShareUrl(card.slug);
  const name = card.displayName || user?.name || 'Your name';
  const role = [card.designation, card.companyName].filter(Boolean).join(' · ');

  /**
   * The QR carries a vCard, not the URL — same choice as the phone's Your QR
   * tab, and for the same reason: an exhibition hall is where this gets
   * scanned and it is where the wifi is worst. A vCard saves to contacts with
   * no connection at all. The link is printed underneath for anyone who wants
   * the full page.
   */
  const vcard = buildVCard({
    name,
    company: card.companyName ?? undefined,
    designation: card.designation ?? undefined,
    phone: card.phone ?? undefined,
    email: card.email ?? undefined,
    secondaryEmail: card.secondaryEmail ?? undefined,
    website: card.websiteUrl ?? undefined,
    linkedin: linkedinUrl(card.linkedinUrl) ?? undefined,
    address: card.officeAddress ?? undefined,
  });

  async function togglePublished() {
    setError(null);
    try {
      await setPublished.mutateAsync(!card!.isPublished);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't save. Try again.");
    }
  }

  return (
    <DashShell
      title="Digital card"
      subtitle="The free card every lead you meet can scan"
      actions={<GhostButton label="Edit on the phone app" onPress={() => router.push('/(dash)/settings')} />}
    >
      {error ? (
        <Panel className="px-5 py-4 mb-4">
          <Typography className="text-[13px] font-semibold text-[#C23B3B]">{error}</Typography>
        </Panel>
      ) : null}

      <View className="flex-row gap-4 items-start">
        <Panel className="flex-1 overflow-hidden">
          <LinearGradient
            colors={['#1D3F8A', '#0B132B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingHorizontal: 22, paddingVertical: 16 }}
          >
            <View className="flex-row items-center gap-[9px]">
              <Icon d={ICON.qr} size={15} color="#FFFFFF" />
              <Typography className="text-[14px] font-bold text-white">Your code and link</Typography>
            </View>
          </LinearGradient>

          <View className="px-[22px] py-6 items-center">
            <View className="p-4 bg-white border border-hairline rounded-lg">
              <QRCode value={vcard} size={176} color="#0B132B" backgroundColor="#FFFFFF" />
            </View>
            <Typography className="text-[12px] text-slate mt-[14px] text-center leading-[1.5] max-w-[280px]">
              This code saves your details straight to a phone&apos;s contacts, with or without signal.
            </Typography>
          </View>

          <View className="px-[22px] pb-[22px]">
            <Cap>Public link</Cap>
            <View className="flex-row items-center gap-2 mt-2">
              <View className="flex-1 bg-section border border-hairline rounded-md px-[13px] py-[10px]">
                <Typography className="text-[12.5px] text-ink-muted" numberOfLines={1}>
                  {displayUrl(url)}
                </Typography>
              </View>
              <Pressable
                onPress={async () => setCopied((await copy(url)) ? 'link' : null)}
                className="flex-row items-center gap-[6px] border border-hairline bg-white rounded-md px-[13px] py-[10px]"
              >
                <Icon d={ICON.copy} size={13} color="#5A6B87" />
                <Typography className="text-[12.5px] font-semibold text-navy">
                  {copied === 'link' ? 'Copied' : 'Copy'}
                </Typography>
              </Pressable>
              <a href={url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                <View className="flex-row items-center gap-[6px] border border-hairline bg-white rounded-md px-[13px] py-[10px]">
                  <Icon d={ICON.external} size={13} color="#5A6B87" />
                  <Typography className="text-[12.5px] font-semibold text-navy">Open</Typography>
                </View>
              </a>
            </View>

            <Pressable
              onPress={async () => setCopied((await copy(vcard)) ? 'vcard' : null)}
              className="mt-3 self-start"
            >
              <Typography className="text-[12.5px] font-semibold text-blue">
                {copied === 'vcard' ? 'Contact details copied' : 'Copy the contact details as text'}
              </Typography>
            </Pressable>
          </View>
        </Panel>

        <Panel className="flex-1 overflow-hidden">
          <LinearGradient
            colors={['#F4B000', '#FFC53D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingHorizontal: 22, paddingVertical: 16 }}
          >
            <View className="flex-row items-center gap-[9px]">
              <Icon d={ICON.user} size={15} color="#0B132B" />
              <Typography className="text-[14px] font-bold text-navy">What a visitor sees</Typography>
            </View>
          </LinearGradient>

          <View className="px-[22px] py-6">
            <View className="bg-navy rounded-xl p-5 overflow-hidden">
              {card.photoUrl ? (
                <Image source={{ uri: card.photoUrl }} className="w-16 h-16 rounded-xl" resizeMode="cover" />
              ) : (
                <Avatar name={name} size={64} tone="gold" />
              )}
              <Typography className="mt-[14px] text-[18px] font-bold text-white">{name}</Typography>
              {role ? (
                <Typography className="text-[13px] text-white/[0.65] mt-[2px]">{role}</Typography>
              ) : null}

              <View className="h-px bg-white/[0.12] my-[16px]" />

              <View className="gap-[9px]">
                {card.phone ? (
                  <View className="flex-row items-center gap-[9px]">
                    <Icon d={ICON.phone} size={13} color="rgba(255,255,255,0.6)" />
                    <Typography className="text-[12.5px] text-white/[0.78]">{card.phone}</Typography>
                  </View>
                ) : null}
                {card.email ? (
                  <View className="flex-row items-center gap-[9px]">
                    <Icon d={ICON.mail} size={13} color="rgba(255,255,255,0.6)" />
                    <Typography className="text-[12.5px] text-white/[0.78]">{card.email}</Typography>
                  </View>
                ) : null}
                {card.websiteUrl ? (
                  <View className="flex-row items-center gap-[9px]">
                    <Icon d={ICON.external} size={13} color="rgba(255,255,255,0.6)" />
                    <Typography className="text-[12.5px] text-white/[0.78]" numberOfLines={1}>
                      {displayUrl(safeExternalUrl(card.websiteUrl) ?? card.websiteUrl)}
                    </Typography>
                  </View>
                ) : null}
              </View>

              {card.bio ? (
                <Typography className="text-[12px] text-white/[0.62] leading-[1.6] mt-[16px]">{card.bio}</Typography>
              ) : null}
            </View>

            {/* The switch, and what turning it off actually does. A toggle that
                only says "Published" leaves you guessing whether the old link
                keeps working. */}
            <View className="flex-row items-start gap-[14px] mt-5 pt-5 border-t border-hairline">
              <View className="flex-1 min-w-0">
                <Typography className="text-[13.5px] font-bold text-navy">
                  {card.isPublished ? 'Live at this link' : 'Taken offline'}
                </Typography>
                <Typography className="text-[12.5px] text-slate leading-[1.5] mt-[3px]">
                  {card.isPublished
                    ? 'Anyone with the link or the code can open your card. Nothing else about your account is visible.'
                    : 'The link returns nothing at all, not even a note that the card once existed. Your QR code still saves contact details offline.'}
                </Typography>
              </View>
              <Pressable
                onPress={() => void togglePublished()}
                disabled={setPublished.isPending}
                className={`rounded-md px-[15px] py-[10px] border ${
                  card.isPublished ? 'bg-white border-hairline' : 'bg-navy border-navy'
                } ${setPublished.isPending ? 'opacity-50' : ''}`}
              >
                <Typography
                  className={`text-[12.5px] font-bold ${card.isPublished ? 'text-navy' : 'text-white'}`}
                >
                  {setPublished.isPending ? 'Saving…' : card.isPublished ? 'Take offline' : 'Publish'}
                </Typography>
              </Pressable>
            </View>
          </View>
        </Panel>
      </View>

      <Panel className="mt-4 px-[22px] py-5">
        <View className="flex-row items-center justify-between">
          <Typography className="text-[17px] font-bold text-navy">Card details</Typography>
          <Typography className="text-[12px] text-slate font-medium">Edited in the phone app</Typography>
        </View>
        <View className="flex-row flex-wrap gap-x-6 mt-2">
          <Detail label="Name" value={card.displayName} />
          <Detail label="Designation" value={card.designation} />
          <Detail label="Company" value={card.companyName} />
          <Detail label="Mobile" value={card.phone} />
          <Detail label="Email" value={card.email} />
          <Detail label="Second email" value={card.secondaryEmail} />
          <Detail label="Website" value={card.websiteUrl} />
          <Detail label="LinkedIn" value={card.linkedinUrl} />
          <Detail label="Office address" value={card.officeAddress} />
        </View>

        {card.socialLinks.length ? (
          <View className="mt-4 pt-4 border-t border-hairline">
            <Cap>Other links</Cap>
            <View className="flex-row flex-wrap gap-2 mt-2">
              {card.socialLinks.map((link) => (
                <View key={link.url} className="bg-surface rounded-full px-[13px] py-[6px]">
                  <Typography className="text-[12px] font-semibold text-navy">{link.label}</Typography>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </Panel>

      <Typography className="text-[12px] text-label leading-[1.55] mt-4 max-w-[620px]">
        Nothing counts how often this card is opened yet. When that lands it will appear here as scans over
        time, not as a single number. A total with no dates on it cannot tell you whether a show worked.
      </Typography>
    </DashShell>
  );
}
