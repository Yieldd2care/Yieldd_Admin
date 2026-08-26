import { useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { TextInput } from '../../../components/ui/TextInput';
import { Toggle } from '../../../components/ui/Toggle';
import { ScreenHeader } from '../../../components/app/ScreenHeader';
import { AlertCircleIcon, ChevronRightIcon, MicIcon, TrashIcon } from '../../../components/ui/icons';

export default function ConfirmLeadScreen() {
  const [name, setName] = useState('Rajesh Menon');
  const [company, setCompany] = useState('Northline Engineering');
  const [designation, setDesignation] = useState('Purchase Head');
  const [phone, setPhone] = useState('98204 41720');
  const [email, setEmail] = useState('rajesh@northline.co.in');
  const [consent, setConsent] = useState(true);

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
      <ScreenHeader
        title="Confirm lead"
        right={
          <View className="flex-row items-center gap-[6px] bg-success/[0.12] rounded-full px-3 py-[6px]">
            <View className="w-[6px] h-[6px] rounded-full bg-success" />
            <Typography className="text-[11px] font-bold text-[#2E9C61]">Auto-filled</Typography>
          </View>
        }
      />

      <ScrollView contentContainerClassName="px-5 pt-5 pb-6" showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center gap-3 mb-[18px]">
          <View className="w-16 h-11 rounded-lg bg-navy overflow-hidden relative">
            <View className="absolute" style={{ top: 6, left: 6, right: 6, bottom: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', borderRadius: 4 }} />
          </View>
          <View className="flex-1">
            <Typography className="text-[13.5px] font-semibold text-navy">Card captured</Typography>
            <Typography className="text-[11.5px] text-slate mt-[1px]">IMTEX 2026 &middot; B-42</Typography>
          </View>
          <Pressable onPress={() => router.replace('/(app)/capture/camera')}>
            <Typography className="text-[12px] font-bold text-blue">Retake</Typography>
          </Pressable>
        </View>

        <Pressable
          onPress={() => router.push('/(app)/(modals)/duplicate-detail')}
          className="flex-row items-center gap-[10px] bg-[#FFF6E0] border border-gold/[0.35] rounded-md px-[14px] py-3 mb-[18px]"
        >
          <View className="w-[30px] h-[30px] rounded-full bg-gold items-center justify-center">
            <AlertCircleIcon size={16} color="#0B132B" strokeWidth={2.25} />
          </View>
          <View className="flex-1">
            <Typography className="text-[12.5px] font-bold text-navy">Possible duplicate</Typography>
            <Typography className="text-[11.5px] text-slate mt-[1px]">Captured by Amit Shah &middot; 2 days ago</Typography>
          </View>
          <ChevronRightIcon color="#5A6B87" />
        </Pressable>

        <View className="gap-4">
          <TextInput label="Full name" value={name} onChangeText={setName} />
          <TextInput label="Company" value={company} onChangeText={setCompany} />
          <View className="flex-row gap-3">
            <View className="flex-1">
              <TextInput label="Designation" value={designation} onChangeText={setDesignation} />
            </View>
            <View className="flex-1">
              <TextInput label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            </View>
          </View>
          <TextInput label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        </View>

        <Typography className="text-[10px] font-bold tracking-[0.12em] text-slate mt-6 mb-3" style={{ textTransform: 'uppercase' }}>
          Event fields
        </Typography>
        <Pressable
          onPress={() => Alert.alert('Product interest', "Picking a product interest isn't wired up yet.")}
          className="h-[48px] border border-hairline rounded-md px-[14px] bg-white flex-row items-center justify-between"
        >
          <Typography className="text-[14.5px] text-placeholder">Product interest</Typography>
          <ChevronRightIcon size={14} color="#97A3B8" strokeWidth={2} />
        </Pressable>

        <Pressable
          onPress={() => setConsent((c) => !c)}
          className="flex-row items-center justify-between bg-white border border-hairline rounded-md px-4 py-[14px] mt-5"
        >
          <View className="flex-1 pr-3">
            <Typography className="text-[13px] font-semibold text-navy">Consent to follow up</Typography>
            <Typography className="text-[11.5px] text-slate mt-[2px]">Confirmed verbally at the stall</Typography>
          </View>
          <Toggle value={consent} onValueChange={setConsent} />
        </Pressable>

        <Pressable
          onPress={() => router.push('/(app)/capture/voice')}
          className="flex-row items-center justify-center gap-2 h-12 rounded-md border border-dashed border-hairline bg-white mt-3"
        >
          <MicIcon size={15} />
          <Typography className="text-[13.5px] font-semibold text-navy">Add a voice note</Typography>
        </Pressable>
      </ScrollView>

      <View className="bg-white border-t border-hairline flex-row gap-[10px] px-5 pt-[14px] pb-6">
        <Pressable onPress={() => router.replace('/(app)/(tabs)')} className="w-[54px] h-[54px] rounded-md bg-white border border-hairline items-center justify-center">
          <TrashIcon />
        </Pressable>
        <Pressable
          onPress={() => router.replace({ pathname: '/(app)/capture/saved', params: { name } })}
          className="flex-1 h-[54px] rounded-md bg-gold items-center justify-center shadow-[0_10px_24px_rgba(244,176,0,0.30)]"
        >
          <Typography className="text-[16px] font-bold text-navy">Save lead</Typography>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
