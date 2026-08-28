import { useState, type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, TextInput as RNTextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';

import { Typography } from '../../../components/ui/Typography';
import { Button } from '../../../components/ui/Button';
import { TextInput } from '../../../components/ui/TextInput';
import { ChevronLeftIcon, CameraIcon, CloseIcon, MailIcon, PhoneIcon, PlusIcon, ShareIcon } from '../../../components/ui/icons';
import { useSessionStore } from '../../../stores/useSessionStore';
import { useCardProfileStore } from '../../../stores/useCardProfileStore';
import { buildVCard } from '../../../lib/vcard';

function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

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

function SocialLinksEditor() {
  const socialLinks = useCardProfileStore((s) => s.socialLinks);
  const addSocialLink = useCardProfileStore((s) => s.addSocialLink);
  const updateSocialLink = useCardProfileStore((s) => s.updateSocialLink);
  const removeSocialLink = useCardProfileStore((s) => s.removeSocialLink);

  return (
    <View className="mt-[22px]">
      <Typography className="text-[13px] font-semibold text-navy mb-[10px]">Social profiles</Typography>
      {socialLinks.map((link) => (
        <View key={link.id} className="flex-row items-center gap-2 mb-2">
          <RNTextInput
            className="w-[108px] h-[44px] border border-hairline rounded-md px-3 text-[13px] text-navy bg-white"
            placeholder="Platform"
            placeholderTextColor="#97A3B8"
            value={link.label}
            onChangeText={(v) => updateSocialLink(link.id, { label: v })}
          />
          <RNTextInput
            className="flex-1 h-[44px] border border-hairline rounded-md px-3 text-[13px] text-navy bg-white"
            placeholder="Profile URL"
            placeholderTextColor="#97A3B8"
            autoCapitalize="none"
            value={link.url}
            onChangeText={(v) => updateSocialLink(link.id, { url: v })}
          />
          <Pressable onPress={() => removeSocialLink(link.id)} className="w-[38px] h-[38px] items-center justify-center">
            <CloseIcon size={14} color="#97A3B8" />
          </Pressable>
        </View>
      ))}
      <Pressable
        onPress={addSocialLink}
        className="flex-row items-center gap-2 border-[1.5px] border-dashed border-hairline rounded-lg px-4 py-3"
      >
        <PlusIcon />
        <Typography className="text-[13px] font-bold text-gold">Add a social profile</Typography>
      </Pressable>
    </View>
  );
}

export default function CardEditScreen() {
  const user = useSessionStore((s) => s.user);
  const profile = useCardProfileStore();
  const [step, setStep] = useState<'build' | 'preview'>('build');

  const initial = user?.name?.trim()?.[0]?.toUpperCase() ?? 'Y';
  const role = [profile.designation || 'Your role', user?.company].filter(Boolean).join(' · ');
  const cardSlug = slugify(user?.name || 'your-name');
  const cardUrl = `card.yieldd.co/${cardSlug}`;

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
                <Typography className="text-[11px] text-white/[0.60]">{profile.mobile || '98204 41720'}</Typography>
              </View>
              <View className="flex-row items-center gap-[6px]">
                <MailIcon />
                <Typography className="text-[11px] text-white/[0.60]">{user?.email ?? 'you@company.com'}</Typography>
              </View>
            </View>
          </View>

          <View className="w-full bg-white border border-hairline rounded-lg p-5 mt-5 items-center">
            <QRCode value={vCardValue} size={140} color="#0B132B" backgroundColor="#fff" />
            <Typography className="text-[12px] text-slate text-center mt-[14px]">
              Anyone can scan this to save your details straight to their contacts
            </Typography>
            <Typography className="text-[12.5px] font-bold text-navy mt-1">{cardUrl}</Typography>
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
      <CardHeader title="Build your card" onBack={() => router.back()} />
      <ScrollView contentContainerClassName="px-5 pt-[22px] pb-5" showsVerticalScrollIndicator={false}>
        <View className="bg-navy rounded-2xl p-5 overflow-hidden">
          <View className="w-14 h-14 rounded-xl bg-gold items-center justify-center">
            <Typography className="text-[20px] font-extrabold text-navy">{initial}</Typography>
          </View>
          <Typography className="mt-[14px] text-[17px] font-bold text-white">{user?.name ?? 'Your name'}</Typography>
          <Typography className="text-[12.5px] text-white/[0.65] mt-[2px]">{role}</Typography>
        </View>

        <Pressable
          onPress={() => Alert.alert('Coming soon', 'Photo upload isn’t wired up yet.')}
          className="flex-row items-center gap-[14px] mt-[22px]"
        >
          <View className="w-14 h-14 rounded-full border-[1.5px] border-dashed border-hairline items-center justify-center bg-white">
            <CameraIcon size={20} color="#97A3B8" strokeWidth={1.75} />
          </View>
          <View>
            <Typography className="text-[13px] font-semibold text-navy">Add a photo</Typography>
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

        <View className="gap-[18px] mt-[22px]">
          <TextInput label="Full name" value={user?.name ?? ''} editable={false} onChangeText={() => {}} />
          <TextInput label="Company" value={user?.company ?? ''} editable={false} onChangeText={() => {}} />
          <TextInput
            label="Designation"
            placeholder="e.g. Sales Manager"
            value={profile.designation}
            onChangeText={(v) => profile.setField('designation', v)}
          />
          <TextInput
            label="Mobile number"
            placeholder="98204 41720"
            value={profile.mobile}
            onChangeText={(v) => profile.setField('mobile', v)}
            keyboardType="phone-pad"
          />
          <TextInput
            label="Secondary email"
            placeholder="optional"
            value={profile.secondaryEmail}
            onChangeText={(v) => profile.setField('secondaryEmail', v)}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            label="LinkedIn"
            placeholder="linkedin.com/in/you"
            value={profile.linkedin}
            onChangeText={(v) => profile.setField('linkedin', v)}
            autoCapitalize="none"
          />
          <TextInput
            label="Website"
            placeholder="optional"
            value={profile.website}
            onChangeText={(v) => profile.setField('website', v)}
            autoCapitalize="none"
            keyboardType="url"
          />
          <TextInput
            label="Office address"
            placeholder="optional"
            value={profile.officeAddress}
            onChangeText={(v) => profile.setField('officeAddress', v)}
          />
          <TextInput
            label="Bio"
            placeholder="A line or two about you"
            value={profile.bio}
            onChangeText={(v) => profile.setField('bio', v)}
            multiline
            style={{ height: 76, textAlignVertical: 'top', paddingTop: 12 }}
          />
        </View>

        <SocialLinksEditor />
      </ScrollView>
      <View className="bg-white border-t border-hairline px-5 pt-[14px] pb-6">
        <Button label="Save and preview" onPress={() => setStep('preview')} />
      </View>
    </SafeAreaView>
  );
}
