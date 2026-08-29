import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { TextInput } from '../../../components/ui/TextInput';
import { ScreenHeader } from '../../../components/app/ScreenHeader';
import { useSessionStore } from '../../../stores/useSessionStore';
import { useMyCard } from '../../../hooks/useBusinessCard';

/**
 * What was read off the rep's own business card, before it is kept.
 *
 * Name, designation, mobile and company are columns on `profiles`, so they are
 * saved here. Website, LinkedIn and the office address belong to the digital
 * card, and that row is deliberately NOT created from this screen — it would
 * publish a public page nobody had looked at yet. They travel to the card
 * builder as parameters instead, and are written when the person saves there.
 */
export default function ScanOwnCardConfirmScreen() {
  const user = useSessionStore((s) => s.user);
  const updateProfile = useSessionStore((s) => s.updateProfile);
  const { data: card } = useMyCard();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(user?.name ?? '');
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
      <ScrollView contentContainerClassName="px-5 pt-5 pb-6" showsVerticalScrollIndicator={false}>
        <Typography className="text-[13px] text-slate mb-5">
          Check what we read off your card, then save it to your Yieldd profile.
        </Typography>
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
    </SafeAreaView>
  );
}
