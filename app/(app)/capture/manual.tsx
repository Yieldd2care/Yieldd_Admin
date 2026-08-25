import { useState } from 'react';
import { Pressable, ScrollView, TextInput as RNTextInput, View, type TextInputProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { Toggle } from '../../../components/ui/Toggle';
import { ScreenHeader } from '../../../components/app/ScreenHeader';
import { ChevronRightIcon, MicIcon } from '../../../components/ui/icons';

function BigField({ label, ...rest }: { label: string } & TextInputProps) {
  return (
    <View className="mb-[18px]">
      <Typography className="text-[12.5px] font-bold tracking-[0.04em] text-slate mb-[9px]" style={{ textTransform: 'uppercase' }}>
        {label}
      </Typography>
      <RNTextInput
        className="h-[60px] rounded-[14px] border-[1.5px] border-hairline px-[18px] text-[20px] font-semibold text-navy bg-white"
        placeholderTextColor="#97A3B8"
        {...rest}
      />
    </View>
  );
}

function SmallField(props: TextInputProps) {
  return (
    <RNTextInput
      className="h-[50px] rounded-md border border-hairline px-4 text-[14.5px] text-navy bg-white"
      placeholderTextColor="#97A3B8"
      {...props}
    />
  );
}

export default function ManualEntryScreen() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [consent, setConsent] = useState(true);

  const canSave = name.trim().length > 0 && phone.trim().length > 0;

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
      <ScreenHeader title="Manual entry" />

      <ScrollView contentContainerClassName="px-5 pt-[26px] pb-6" showsVerticalScrollIndicator={false}>
        <Typography className="text-[13.5px] text-slate mb-6">
          No card, no problem. Just a name and number saves the lead.
        </Typography>

        <BigField label="Name" value={name} onChangeText={setName} placeholder="Full name" />
        <BigField label="Phone" value={phone} onChangeText={setPhone} placeholder="98204 41720" keyboardType="phone-pad" />

        <Pressable
          onPress={() => setExpanded((v) => !v)}
          className="flex-row items-center justify-between py-4 border-t border-hairline mt-[6px]"
        >
          <Typography className="text-[14px] font-semibold text-navy">+ Add more details</Typography>
          <ChevronRightIcon size={16} color="#0B132B" strokeWidth={2} />
        </Pressable>

        {expanded ? (
          <View className="gap-[10px] mb-1">
            <SmallField placeholder="Company" />
            <SmallField placeholder="Designation" />
            <SmallField placeholder="Email" keyboardType="email-address" autoCapitalize="none" />
          </View>
        ) : null}

        <Pressable
          onPress={() => setConsent((c) => !c)}
          className="flex-row items-center justify-between bg-white border border-hairline rounded-md px-4 py-[14px] mt-[18px]"
        >
          <View className="flex-1 pr-3">
            <Typography className="text-[13px] font-semibold text-navy">Consent to follow up</Typography>
            <Typography className="text-[11.5px] text-slate mt-[2px]">Confirmed verbally at the stall</Typography>
          </View>
          <Toggle value={consent} onValueChange={setConsent} />
        </Pressable>

        <Pressable
          onPress={() => router.push('/(app)/capture/voice')}
          className="flex-row items-center justify-center gap-2 h-12 rounded-md border border-dashed border-hairline bg-white mt-[18px]"
        >
          <MicIcon size={15} />
          <Typography className="text-[13.5px] font-semibold text-navy">Add a voice note</Typography>
        </Pressable>
      </ScrollView>

      <View className="bg-white border-t border-hairline px-5 pt-[14px] pb-6">
        <Pressable
          disabled={!canSave}
          onPress={() => router.replace('/(app)/capture/saved')}
          className={`h-[54px] rounded-md items-center justify-center ${canSave ? 'bg-gold shadow-[0_10px_24px_rgba(244,176,0,0.30)]' : 'bg-surface'}`}
        >
          <Typography className={`text-[16px] font-bold ${canSave ? 'text-navy' : 'text-slate'}`}>Save lead</Typography>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
