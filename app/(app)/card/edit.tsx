import { useState, type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { Button } from '../../../components/ui/Button';
import { TextInput } from '../../../components/ui/TextInput';
import { ChevronLeftIcon, CameraIcon, MailIcon, PhoneIcon, ShareIcon } from '../../../components/ui/icons';
import { useSessionStore } from '../../../stores/useSessionStore';

const QR_SEED = [
  1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 0, 0, 1, 0, 1,
  1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 1, 0,
  1, 1, 0,
];

function QrGrid() {
  return (
    <View style={{ width: 9 * 7 + 8 * 2, flexDirection: 'row', flexWrap: 'wrap', gap: 2 }}>
      {QR_SEED.map((v, i) => (
        <View key={i} style={{ width: 7, height: 7, backgroundColor: v ? '#0B132B' : 'transparent' }} />
      ))}
    </View>
  );
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

export default function CardEditScreen() {
  const user = useSessionStore((s) => s.user);
  const [step, setStep] = useState<'build' | 'preview'>('build');
  const [designation, setDesignation] = useState('');
  const [mobile, setMobile] = useState('');

  const initial = user?.name?.trim()?.[0]?.toUpperCase() ?? 'Y';
  const role = [designation || 'Your role', user?.company].filter(Boolean).join(' · ');

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
                <Typography className="text-[11px] text-white/[0.60]">{mobile || '98204 41720'}</Typography>
              </View>
              <View className="flex-row items-center gap-[6px]">
                <MailIcon />
                <Typography className="text-[11px] text-white/[0.60]">{user?.email ?? 'you@company.com'}</Typography>
              </View>
            </View>
          </View>

          <View className="w-full bg-white border border-hairline rounded-lg p-5 mt-5 items-center">
            <QrGrid />
            <Typography className="text-[12px] text-slate text-center mt-[14px]">
              Anyone can scan this to save your details
            </Typography>
            <Typography className="text-[12.5px] font-bold text-navy mt-1">card.yieldd.co/priya-sharma</Typography>
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

        <View className="gap-[18px] mt-[22px]">
          <TextInput label="Full name" value={user?.name ?? ''} editable={false} onChangeText={() => {}} />
          <TextInput label="Company" value={user?.company ?? ''} editable={false} onChangeText={() => {}} />
          <TextInput
            label="Designation"
            placeholder="e.g. Sales Manager"
            value={designation}
            onChangeText={setDesignation}
          />
          <TextInput label="Mobile number" placeholder="98204 41720" value={mobile} onChangeText={setMobile} keyboardType="phone-pad" />
        </View>
      </ScrollView>
      <View className="bg-white border-t border-hairline px-5 pt-[14px] pb-6">
        <Button label="Save and preview" onPress={() => setStep('preview')} />
      </View>
    </SafeAreaView>
  );
}
