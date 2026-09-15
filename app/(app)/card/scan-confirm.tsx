import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { TextInput } from '../../../components/ui/TextInput';
import { ScreenHeader } from '../../../components/app/ScreenHeader';
import { AlertCircleIcon } from '../../../components/ui/icons';
import { useSessionStore } from '../../../stores/useSessionStore';
import { useCaptureDraftStore } from '../../../stores/useCaptureDraftStore';
import { useMyCard } from '../../../hooks/useBusinessCard';
import { scanCard } from '../../../lib/api/cardScan';
import { KeyboardSafe } from '../../../components/app/KeyboardSafe';

/**
 * What was read off the rep's own business card, before it is kept.
 *
 * Name, designation, mobile and company are columns on `profiles`, so they are
 * saved here. Website, LinkedIn and the office address belong to the digital
 * card, and that row is deliberately NOT created from this screen — it would
 * publish a public page nobody had looked at yet. They travel to the card
 * builder as parameters instead, and are written when the person saves there.
 *
 * The card is actually read here. It was not before: the camera stored the
 * photo and pushed to this screen, which seeded itself from the profile the
 * person already had and never called `scanCard` at all. For the first-time
 * user this screen exists to serve, that meant taking a photo and arriving at
 * an empty form — the scan looked broken because nothing was ever scanned.
 */
export default function ScanOwnCardConfirmScreen() {
  const user = useSessionStore((s) => s.user);
  const updateProfile = useSessionStore((s) => s.updateProfile);
  const { data: card } = useMyCard();
  const imageUri = useCaptureDraftStore((s) => s.imageUri);
  const backImageUri = useCaptureDraftStore((s) => s.backImageUri);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(user?.name ?? '');
  // Empty rather than the database placeholder for an organisation nobody has
  // named yet (stripped in lib/mappers/profile.ts). It matters more here than
  // anywhere: saving this screen writes company through to
  // business_cards.company_name, which is a page anyone with the link can open.
  const [company, setCompany] = useState(user?.company ?? '');
  const [designation, setDesignation] = useState(card?.designation ?? user?.designation ?? '');
  const [mobile, setMobile] = useState(card?.phone ?? user?.phone ?? '');
  // No setter: the address is what you signed in with, and the profile guard
  // trigger blocks changing it from the client. An editable field here promised
  // something the save could never deliver.
  const [email] = useState(user?.email ?? '');
  const [website, setWebsite] = useState(card?.websiteUrl ?? '');
  const [linkedin, setLinkedin] = useState(card?.linkedinUrl ?? '');
  const [officeAddress, setOfficeAddress] = useState(card?.officeAddress ?? '');

  const [scanState, setScanState] = useState<'idle' | 'reading' | 'done' | 'failed' | 'empty'>(
    imageUri ? 'reading' : 'idle'
  );
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  /**
   * Reads the photo the camera just took.
   *
   * Same two rules as the lead capture screen, for the same reasons: a field is
   * filled only if it is still empty, so a correction typed while the read is
   * in flight is never overwritten, and the whole thing is abandoned if the
   * screen goes away.
   *
   * A failure costs nothing here — every field is typeable, which is exactly
   * what someone arriving from "Enter manually instead" already does.
   */
  useEffect(() => {
    if (!imageUri) return;
    let cancelled = false;

    void (async () => {
      const result = await scanCard(imageUri, backImageUri ?? undefined);
      if (cancelled) return;

      if (!result.ok) {
        setScanState('failed');
        setScanMessage(result.message);
        return;
      }
      if (!result.read) {
        setScanState('empty');
        setScanMessage(null);
        return;
      }

      const f = result.fields;
      setName((current) => (f.fullName && !current.trim() ? f.fullName : current));
      setCompany((current) => (f.company && !current.trim() ? f.company : current));
      setDesignation((current) => (f.designation && !current.trim() ? f.designation : current));
      setMobile((current) => (f.phone && !current.trim() ? f.phone : current));
      setWebsite((current) => (f.companyWebsite && !current.trim() ? f.companyWebsite : current));
      setOfficeAddress((current) =>
        f.companyAddress && !current.trim() ? f.companyAddress : current
      );
      // Email is deliberately not filled — it is read-only on this screen,
      // because the profile guard refuses a change to the address you signed in
      // with. `ScannedCard` carries no LinkedIn field, so that stays hand-typed.

      setScanState('done');
      setScanMessage(null);
    })();

    return () => {
      cancelled = true;
    };
  }, [imageUri, backImageUri]);

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
      <ScreenHeader
        title="Confirm your details"
        right={
          <Pressable onPress={() => router.replace('/(app)/capture/camera?mode=profile')}>
            <Typography className="text-[12px] font-bold text-blue">Retake</Typography>
          </Pressable>
        }
      />
      <KeyboardSafe>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="px-5 pt-5 pb-6" showsVerticalScrollIndicator={false}>
          <Typography className="text-[13px] text-slate mb-5">
            Check what we read off your card, then save it to your Yieldd profile.
          </Typography>

          {scanState === 'reading' ? (
            <View className="flex-row items-center gap-[10px] bg-navy/[0.04] border border-hairline rounded-md px-4 py-3 mb-4">
              <ActivityIndicator size="small" color="#F4B000" />
              <Typography className="text-[12.5px] font-semibold text-navy flex-1">
                Reading your card&#8230; you can start typing, nothing will be overwritten.
              </Typography>
            </View>
          ) : null}

          {scanState === 'done' ? (
            <View className="flex-row items-start gap-2 bg-gold/[0.08] border border-gold/[0.30] rounded-md px-[14px] py-3 mb-4">
              <AlertCircleIcon size={14} color="#8A6100" strokeWidth={2} />
              <Typography className="flex-1 text-[12px] font-medium text-navy" style={{ lineHeight: 17 }}>
                Filled in from your card. Check the spelling and the number: this is what the
                people you meet will see.
              </Typography>
            </View>
          ) : null}

          {scanState === 'empty' ? (
            <View className="bg-surface rounded-md px-[14px] py-3 mb-4">
              <Typography className="text-[12.5px] font-medium text-navy leading-[1.45]">
                Nothing readable on that photo. Type your details in, or retake it.
              </Typography>
            </View>
          ) : null}

          {scanState === 'failed' && scanMessage ? (
            <View className="bg-surface rounded-md px-[14px] py-3 mb-4">
              <Typography className="text-[12.5px] font-medium text-navy leading-[1.45]">
                {scanMessage}
              </Typography>
            </View>
          ) : null}

          <View className="gap-4">
            <TextInput label="Full name" value={name} onChangeText={setName} />
            <TextInput label="Company" value={company} onChangeText={setCompany} />
            <View className="flex-row gap-3">
              <View className="flex-1">
                <TextInput label="Designation" value={designation} onChangeText={setDesignation} />
              </View>
              <View className="flex-1">
                <TextInput label="Mobile" value={mobile} onChangeText={setMobile} keyboardType="phone-pad" />
              </View>
            </View>
            <TextInput label="Email" value={email} editable={false} />
            <TextInput label="Website (optional)" value={website} onChangeText={setWebsite} autoCapitalize="none" keyboardType="url" />
            <TextInput label="LinkedIn (optional)" value={linkedin} onChangeText={setLinkedin} autoCapitalize="none" />
            <TextInput label="Office address (optional)" value={officeAddress} onChangeText={setOfficeAddress} />
          </View>
        </ScrollView>
        <View className="bg-white border-t border-hairline px-5 pt-[14px] pb-6">
          {error ? (
            <Typography className="text-[12.5px] font-semibold text-[#C23B3B] text-center mb-3 leading-[1.45]">
              {error}
            </Typography>
          ) : null}
          <Pressable
            disabled={saving}
            onPress={async () => {
              if (saving) return;
              setError(null);
              setSaving(true);

              // Name, designation, mobile and company are real columns now, so
              // they go to the database. Writing them straight into the store —
              // which is what this screen used to do — looked like it had worked
              // and was wiped by the next profile refresh.
              const result = await updateProfile({ name, designation, phone: mobile, company });
              setSaving(false);

              if (result.error) {
                setError(result.error);
                return;
              }

              // The photo has been read and is not wanted again. Left in the
              // draft it would still be there when the next lead capture opened,
              // which is one route away from your own card being filed under a
              // stranger's name.
              useCaptureDraftStore.getState().setImageUri(null);
              useCaptureDraftStore.getState().setBackImageUri(null);

              // The rest goes to the card builder as a starting point rather
              // than straight to the database: creating the row here would put a
              // public page live before anyone had seen it.
              router.replace({
                pathname: '/(app)/card/edit',
                params: { website, linkedin, officeAddress },
              });
            }}
            className={`h-[54px] rounded-md bg-gold items-center justify-center shadow-[0_10px_24px_rgba(244,176,0,0.30)] ${saving ? 'opacity-50' : ''}`}
          >
            <Typography className="text-[16px] font-bold text-navy">
              {saving ? 'Saving…' : 'Save to my profile'}
            </Typography>
          </Pressable>
        </View>
      </KeyboardSafe>
    </SafeAreaView>
  );
}
