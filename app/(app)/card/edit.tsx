import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  TextInput as RNTextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import QRCode from 'react-native-qrcode-svg';

import { Typography } from '../../../components/ui/Typography';
import { Button } from '../../../components/ui/Button';
import { TextInput } from '../../../components/ui/TextInput';
import { Toggle } from '../../../components/ui/Toggle';
import {
  ChevronLeftIcon,
  CameraIcon,
  CloseIcon,
  MailIcon,
  PhoneIcon,
  PlusIcon,
  ShareIcon,
} from '../../../components/ui/icons';
import { useSessionStore } from '../../../stores/useSessionStore';
import { useMyCard, useSaveCard } from '../../../hooks/useBusinessCard';
import {
  isSlugAvailable,
  removeCardPhoto,
  suggestSlug,
  uploadCardPhoto,
} from '../../../lib/api/businessCard';
import { cardShareUrl, displayUrl, linkedinUrl, type SocialLink } from '../../../lib/cardLinks';
import { buildVCard } from '../../../lib/vcard';

/**
 * The card builder.
 *
 * What is on this screen is a row in `business_cards` and a page anyone with
 * the link can open, so the form is seeded from the server and saved to it —
 * the local card store this screen used to write to was invisible to the
 * hosted page and to the person's other device, which made "your card" a
 * claim the product could not keep.
 *
 * The link is the part worth care. It is the whole of the public URL, it is
 * unique across every customer, and it outlives the name that produced it —
 * so it is shown, editable, checked while it is typed, and never silently
 * regenerated when someone corrects the spelling of their own name.
 */

/** Mirrors `business_cards_slug_format` exactly. Two places, one rule — the database is the one that wins. */
const SLUG_RULE = /^[a-z0-9]([a-z0-9-]{0,58}[a-z0-9])?$/;

/** What a person is allowed to type into the link field. Normalising as they type is kinder than rejecting afterwards. */
function normaliseSlugInput(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .slice(0, 60);
}

type SlugState = { checking: boolean; available: boolean | null };

function CardHeader({ title, right, onBack }: { title: string; right?: ReactNode; onBack: () => void }) {
  return (
    <View className="bg-white border-b border-hairline px-5 pt-[18px] pb-4 flex-row items-center gap-3">
      <Pressable onPress={onBack} className="w-[34px] h-[34px] rounded-md bg-surface items-center justify-center">
        <ChevronLeftIcon />
      </Pressable>
      <Typography className="flex-1 text-[20px] leading-[1.3] font-bold tracking-[-0.01em] text-navy">
        {title}
      </Typography>
      {right}
    </View>
  );
}

export default function CardEditScreen() {
  const user = useSessionStore((s) => s.user);
  const { data: card, isLoading } = useMyCard();
  const save = useSaveCard();

  // Arriving from "scan my own card": what was read off the photograph, not
  // yet written anywhere. It seeds the form and is saved with everything else.
  const scanned = useLocalSearchParams<{ website?: string; linkedin?: string; officeAddress?: string }>();

  const [step, setStep] = useState<'build' | 'preview'>('build');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [slug, setSlug] = useState('');
  const [slugState, setSlugState] = useState<SlugState>({ checking: false, available: null });
  const [designation, setDesignation] = useState('');
  const [mobile, setMobile] = useState('');
  const [secondaryEmail, setSecondaryEmail] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [website, setWebsite] = useState('');
  const [officeAddress, setOfficeAddress] = useState('');
  const [bio, setBio] = useState('');
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [isPublished, setIsPublished] = useState(true);

  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const replacedPhotoPath = useRef<string | null>(null);

  // Seeded once, from the card if there is one and from the signed-in profile
  // if there is not. Re-seeding on every render of the query would throw away
  // what the person is in the middle of typing.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || isLoading || !user) return;
    seeded.current = true;

    if (card) {
      setSlug(card.slug);
      setDesignation(card.designation ?? '');
      setMobile(card.phone ?? '');
      setSecondaryEmail(card.secondaryEmail ?? '');
      setLinkedin(card.linkedinUrl ?? '');
      setWebsite(card.websiteUrl ?? '');
      setOfficeAddress(card.officeAddress ?? '');
      setBio(card.bio ?? '');
      setSocialLinks(card.socialLinks);
      setIsPublished(card.isPublished);
      setPhotoPath(card.photoPath);
      setPhotoPreview(card.photoUrl);
      if (scanned.linkedin) setLinkedin(scanned.linkedin);
      if (scanned.website) setWebsite(scanned.website);
      if (scanned.officeAddress) setOfficeAddress(scanned.officeAddress);
      return;
    }

    setDesignation(user.designation ?? '');
    setMobile(user.phone ?? '');
    setLinkedin(scanned.linkedin ?? '');
    setWebsite(scanned.website ?? '');
    setOfficeAddress(scanned.officeAddress ?? '');
    // The first link is asked for rather than assumed: an India-first product
    // cannot rely on a name that survives being reduced to [a-z0-9], and the
    // database is the only thing that knows what is already taken.
    void suggestSlug(user.name ?? '').then((suggested) => {
      if (suggested) setSlug((current) => current || suggested);
    });
  // `scanned` is intentionally not a dependency: it is read once, at the same
  // moment everything else is seeded, and re-running on a params identity
  // change would overwrite whatever is being typed.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card, isLoading, user]);

  // Availability, checked while the link is typed. Debounced because every
  // keystroke would otherwise be a round trip on hall wifi.
  useEffect(() => {
    if (!slug || slug === card?.slug) {
      setSlugState({ checking: false, available: null });
      return;
    }
    if (!SLUG_RULE.test(slug)) {
      setSlugState({ checking: false, available: false });
      return;
    }

    let cancelled = false;
    setSlugState({ checking: true, available: null });
    const timer = setTimeout(async () => {
      const available = await isSlugAvailable(slug);
      if (!cancelled) setSlugState({ checking: false, available });
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [slug, card?.slug]);

  const initial = user?.name?.trim()?.[0]?.toUpperCase() ?? 'Y';
  const role = [designation || 'Your role', user?.company].filter(Boolean).join(' · ');
  const shareUrl = slug ? cardShareUrl(slug) : '';

  const vCardValue = buildVCard({
    name: user?.name ?? 'Your name',
    company: user?.company ?? undefined,
    designation,
    phone: mobile,
    email: user?.email,
    secondaryEmail,
    website,
    linkedin: linkedinUrl(linkedin) ?? undefined,
    address: officeAddress,
  });

  const pickPhoto = async () => {
    if (photoBusy || !user) return;
    setError(null);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Yieldd needs access to your photos to add one to your card.');
      return;
    }

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (picked.canceled || !picked.assets[0]) return;

    setPhotoBusy(true);
    const uri = picked.assets[0].uri;
    // Shown immediately from the local file: the upload takes as long as it
    // takes, and a photo that appears only after it finishes reads as a
    // failure while it is in flight.
    setPhotoPreview(uri);

    const result = await uploadCardPhoto(user.id, uri);
    setPhotoBusy(false);

    if ('error' in result) {
      setPhotoPreview(photoPath ? photoPreview : null);
      setError(result.error);
      return;
    }
    // The file is up but the row still points at the old one. The old key is
    // only deleted once the save succeeds — deleting it now would blank a
    // published card if the save then failed.
    if (photoPath && photoPath !== result.path) replacedPhotoPath.current = photoPath;
    setPhotoPath(result.path);
  };

  const onSave = async () => {
    if (save.isPending || !user) return;
    setError(null);
    setNotice(null);

    if (!SLUG_RULE.test(slug)) {
      setError('Your link needs at least one letter or number, and can only use lowercase letters, numbers and dashes.');
      return;
    }

    try {
      const { card: saved, slugChanged } = await save.mutateAsync({
        slug,
        displayName: user.name ?? 'Your card',
        designation,
        companyName: user.company ?? null,
        phone: mobile,
        email: user.email ?? null,
        secondaryEmail,
        websiteUrl: website,
        // Stored normalised, so `priya-sharma`, `@priya-sharma` and the full
        // URL all become the same link on the public page.
        linkedinUrl: linkedinUrl(linkedin),
        officeAddress,
        bio,
        photoPath,
        socialLinks,
        isPublished,
      });

      if (replacedPhotoPath.current) {
        void removeCardPhoto(replacedPhotoPath.current);
        replacedPhotoPath.current = null;
      }

      setSlug(saved.slug);
      setPhotoPreview(saved.photoUrl ?? photoPreview);
      if (slugChanged) {
        setNotice(`Someone had already taken that link, so your card is at ${displayUrl(cardShareUrl(saved.slug))}.`);
      }
      setStep('preview');
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't save. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-section items-center justify-center" edges={['top', 'bottom']}>
        <ActivityIndicator size="small" color="#0B132B" />
      </SafeAreaView>
    );
  }

  if (step === 'preview') {
    return (
      <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
        <CardHeader
          title="Your card"
          onBack={() => setStep('build')}
          right={
            <Pressable onPress={() => setStep('build')}>
              <Typography className="text-[13px] font-bold text-gold">Edit</Typography>
            </Pressable>
          }
        />
        <ScrollView contentContainerClassName="items-center px-5 pt-[22px] pb-5" showsVerticalScrollIndicator={false}>
          {notice ? (
            <View className="w-full bg-gold/[0.12] border border-gold/[0.35] rounded-md px-4 py-3 mb-4">
              <Typography className="text-[12.5px] text-navy leading-[1.45]">{notice}</Typography>
            </View>
          ) : null}

          <View className="w-full bg-navy rounded-2xl p-5 overflow-hidden">
            {photoPreview ? (
              <Image source={{ uri: photoPreview }} className="w-14 h-14 rounded-xl" resizeMode="cover" />
            ) : (
              <View className="w-14 h-14 rounded-xl bg-gold items-center justify-center">
                <Typography className="text-[20px] font-extrabold text-navy">{initial}</Typography>
              </View>
            )}
            <Typography className="mt-[14px] text-[17px] font-bold text-white">{user?.name ?? 'Your name'}</Typography>
            <Typography className="text-[12.5px] text-white/[0.65] mt-[2px]">{role}</Typography>
            <View className="h-px bg-white/[0.12] my-[14px]" />
            <View className="flex-row gap-4">
              <View className="flex-row items-center gap-[6px]">
                <PhoneIcon />
                <Typography className="text-[11px] text-white/[0.60]">{mobile || 'Add your mobile'}</Typography>
              </View>
              <View className="flex-row items-center gap-[6px]">
                <MailIcon />
                <Typography className="text-[11px] text-white/[0.60]">{user?.email ?? 'you@company.com'}</Typography>
              </View>
            </View>
          </View>

          <View className="w-full bg-white border border-hairline rounded-lg p-5 mt-5 items-center">
            <QRCode value={vCardValue} size={140} color="#0B132B" backgroundColor="#fff" />
            <Typography className="text-[12px] text-slate text-center mt-[14px] leading-[1.45]">
              Anyone can scan this to save your details straight to their contacts — it works with no signal.
            </Typography>
            <Typography className="text-[12.5px] font-bold text-navy mt-2">{displayUrl(shareUrl)}</Typography>
            {!isPublished ? (
              <Typography className="text-[11.5px] text-slate text-center mt-2">
                Your page is switched off, so that link shows nothing for now.
              </Typography>
            ) : null}
          </View>
        </ScrollView>
        <View className="bg-white border-t border-hairline px-5 pt-[14px] pb-6 gap-3 items-center">
          <Button
            label="Share your card"
            onPress={() => router.push('/(app)/card/share')}
            icon={<ShareIcon size={17} color="#0B132B" />}
            className="w-full"
          />
          <Pressable onPress={() => router.push('/(app)/card/first-scan')}>
            <Typography className="text-[13px] font-semibold text-gold">Continue</Typography>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
      <CardHeader title={card ? 'Your card' : 'Build your card'} onBack={() => router.back()} />
      <ScrollView contentContainerClassName="px-5 pt-[22px] pb-5" showsVerticalScrollIndicator={false}>
        <View className="bg-navy rounded-2xl p-5 overflow-hidden">
          {photoPreview ? (
            <Image source={{ uri: photoPreview }} className="w-14 h-14 rounded-xl" resizeMode="cover" />
          ) : (
            <View className="w-14 h-14 rounded-xl bg-gold items-center justify-center">
              <Typography className="text-[20px] font-extrabold text-navy">{initial}</Typography>
            </View>
          )}
          <Typography className="mt-[14px] text-[17px] font-bold text-white">{user?.name ?? 'Your name'}</Typography>
          <Typography className="text-[12.5px] text-white/[0.65] mt-[2px]">{role}</Typography>
        </View>

        <Pressable onPress={pickPhoto} disabled={photoBusy} className="flex-row items-center gap-[14px] mt-[22px]">
          <View className="w-14 h-14 rounded-full border-[1.5px] border-dashed border-hairline items-center justify-center bg-white overflow-hidden">
            {photoBusy ? (
              <ActivityIndicator size="small" color="#97A3B8" />
            ) : photoPreview ? (
              <Image source={{ uri: photoPreview }} className="w-14 h-14" resizeMode="cover" />
            ) : (
              <CameraIcon size={20} color="#97A3B8" strokeWidth={1.75} />
            )}
          </View>
          <View>
            <Typography className="text-[13px] font-semibold text-navy">
              {photoPreview ? 'Change your photo' : 'Add a photo'}
            </Typography>
            <Typography className="text-[11.5px] text-slate mt-[2px]">
              Optional &mdash; helps people remember you
            </Typography>
          </View>
        </Pressable>

        <Pressable
          onPress={() => router.push({ pathname: '/(app)/capture/camera', params: { mode: 'profile' } })}
          className="flex-row items-center justify-center gap-2 h-12 rounded-md border border-dashed border-hairline bg-white mt-[18px]"
        >
          <CameraIcon size={16} color="#0B132B" />
          <Typography className="text-[13.5px] font-semibold text-navy">Scan my own card instead</Typography>
        </Pressable>

        <SlugField
          slug={slug}
          onChange={(value) => setSlug(normaliseSlugInput(value))}
          state={slugState}
          unchanged={slug === card?.slug}
        />

        <View className="gap-[18px] mt-[22px]">
          <TextInput label="Full name" value={user?.name ?? ''} editable={false} onChangeText={() => {}} />
          <TextInput label="Company" value={user?.company ?? ''} editable={false} onChangeText={() => {}} />
          <TextInput
            label="Designation"
            placeholder="e.g. Sales Manager"
            value={designation}
            onChangeText={setDesignation}
          />
          <TextInput
            label="Mobile number"
            placeholder="98204 41720"
            value={mobile}
            onChangeText={setMobile}
            keyboardType="phone-pad"
          />
          <TextInput
            label="Secondary email"
            placeholder="optional"
            value={secondaryEmail}
            onChangeText={setSecondaryEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            label="LinkedIn"
            placeholder="linkedin.com/in/you"
            value={linkedin}
            onChangeText={setLinkedin}
            autoCapitalize="none"
          />
          <TextInput
            label="Website"
            placeholder="optional"
            value={website}
            onChangeText={setWebsite}
            autoCapitalize="none"
            keyboardType="url"
          />
          <TextInput
            label="Office address"
            placeholder="optional"
            value={officeAddress}
            onChangeText={setOfficeAddress}
          />
          <View>
            <TextInput
              label="Bio"
              placeholder="A line or two about you"
              value={bio}
              onChangeText={(value) => setBio(value.slice(0, 500))}
              multiline
              style={{ height: 76, textAlignVertical: 'top', paddingTop: 12 }}
            />
            <Typography className="text-[11px] text-slate mt-[6px] text-right">{bio.length}/500</Typography>
          </View>
        </View>

        <SocialLinksEditor links={socialLinks} onChange={setSocialLinks} />

        <View className="flex-row items-center gap-4 bg-white border border-hairline rounded-2xl px-4 py-[14px] mt-[22px]">
          <View className="flex-1">
            <Typography className="text-[13.5px] font-semibold text-navy">Card page is live</Typography>
            <Typography className="text-[11.5px] text-slate mt-[2px] leading-[1.45]">
              {isPublished
                ? 'Anyone with your link can see this page.'
                : 'Your link shows nothing until you switch this back on.'}
            </Typography>
          </View>
          <Toggle value={isPublished} onValueChange={setIsPublished} />
        </View>
      </ScrollView>

      <View className="bg-white border-t border-hairline px-5 pt-[14px] pb-6">
        {error ? (
          <Typography className="text-[12.5px] font-semibold text-[#C23B3B] text-center mb-3 leading-[1.45]">
            {error}
          </Typography>
        ) : null}
        <Button
          label={save.isPending ? 'Saving…' : 'Save and preview'}
          onPress={onSave}
          disabled={save.isPending || photoBusy}
        />
      </View>
    </SafeAreaView>
  );
}

function SlugField({
  slug,
  onChange,
  state,
  unchanged,
}: {
  slug: string;
  onChange: (value: string) => void;
  state: SlugState;
  unchanged: boolean;
}) {
  const status = unchanged
    ? { text: 'This is your link', tone: 'text-slate' }
    : state.checking
      ? { text: 'Checking…', tone: 'text-slate' }
      : state.available === true
        ? { text: 'Available', tone: 'text-[#2E8C40]' }
        : state.available === false
          ? { text: 'Already taken', tone: 'text-[#C23B3B]' }
          : { text: '', tone: 'text-slate' };

  return (
    <View className="mt-[22px]">
      <Typography className="text-[13px] font-semibold text-navy mb-[7px]">Your link</Typography>
      <View className="flex-row items-center bg-white border border-hairline rounded-md h-[52px] px-4">
        <Typography className="text-[14px] text-slate">{displayUrl(cardShareUrl(''))}/</Typography>
        <RNTextInput
          className="flex-1 text-[15.5px] text-navy"
          value={slug}
          onChangeText={onChange}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="your-name"
          placeholderTextColor="#97A3B8"
        />
      </View>
      <Typography className={`text-[11.5px] mt-[6px] ${status.tone}`}>
        {status.text || 'Lowercase letters, numbers and dashes.'}
      </Typography>
    </View>
  );
}

function SocialLinksEditor({
  links,
  onChange,
}: {
  links: SocialLink[];
  onChange: (links: SocialLink[]) => void;
}) {
  const update = (index: number, patch: Partial<SocialLink>) =>
    onChange(links.map((link, i) => (i === index ? { ...link, ...patch } : link)));

  return (
    <View className="mt-[22px]">
      <Typography className="text-[13px] font-semibold text-navy mb-[10px]">Social profiles</Typography>
      {links.map((link, index) => (
        <View key={index} className="flex-row items-center gap-2 mb-2">
          <RNTextInput
            className="w-[108px] h-[44px] border border-hairline rounded-md px-3 text-[13px] text-navy bg-white"
            placeholder="Platform"
            placeholderTextColor="#97A3B8"
            value={link.label}
            onChangeText={(value) => update(index, { label: value })}
          />
          <RNTextInput
            className="flex-1 h-[44px] border border-hairline rounded-md px-3 text-[13px] text-navy bg-white"
            placeholder="Profile URL"
            placeholderTextColor="#97A3B8"
            autoCapitalize="none"
            value={link.url}
            onChangeText={(value) => update(index, { url: value })}
          />
          <Pressable
            onPress={() => onChange(links.filter((_, i) => i !== index))}
            className="w-[38px] h-[38px] items-center justify-center"
          >
            <CloseIcon size={14} color="#97A3B8" />
          </Pressable>
        </View>
      ))}
      <Pressable
        onPress={() => onChange([...links, { label: '', url: '' }])}
        className="flex-row items-center gap-2 border-[1.5px] border-dashed border-hairline rounded-lg px-4 py-3"
      >
        <PlusIcon />
        <Typography className="text-[13px] font-bold text-gold">Add a social profile</Typography>
      </Pressable>
      <Typography className="text-[11px] text-slate mt-2 leading-[1.45]">
        Only web addresses are published — a row without a working link is dropped when you save.
      </Typography>
    </View>
  );
}
