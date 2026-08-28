import { useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { TextInput } from '../../../components/ui/TextInput';
import { Toggle } from '../../../components/ui/Toggle';
import { ScreenHeader } from '../../../components/app/ScreenHeader';
import { CustomFieldInput, isCustomFieldFilled } from '../../../components/app/CustomFieldInput';
import { AlertCircleIcon, ChevronRightIcon, MicIcon, SparkleIcon, TrashIcon } from '../../../components/ui/icons';
import { useLeadsStore } from '../../../stores/useLeadsStore';
import { useCaptureDraftStore } from '../../../stores/useCaptureDraftStore';
import { useEventFieldsStore } from '../../../stores/useEventFieldsStore';
import type { CustomFieldValue } from '../../../data/leads';

export default function ConfirmLeadScreen() {
  const [name, setName] = useState('Rajesh Menon');
  const [designation, setDesignation] = useState('Purchase Head');
  const [phone, setPhone] = useState('98204 41720');
  const [email, setEmail] = useState('rajesh@northline.co.in');
  const [note, setNote] = useState('');

  const [company, setCompany] = useState('Northline Engineering');
  const [companyLandline, setCompanyLandline] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companySummary, setCompanySummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [consent, setConsent] = useState(true);
  const [customValues, setCustomValues] = useState<Record<string, CustomFieldValue>>({});

  const hasVoice = useCaptureDraftStore((s) => s.hasVoice);
  const imageUri = useCaptureDraftStore((s) => s.imageUri);
  const customFields = useEventFieldsStore((s) => s.customFields);

  const missingRequired = customFields.some((f) => f.required && !isCustomFieldFilled(f, customValues[f.id]));
  const canSave = name.trim().length > 0 && !missingRequired;

  const generateCompanySummary = () => {
    if (summaryLoading) return;
    setSummaryLoading(true);
    setTimeout(() => {
      setCompanySummary(
        `${company || 'This company'} looks to operate in the industrial/manufacturing space${
          companyWebsite ? `, based on ${companyWebsite}` : ''
        }. AI-generated summary — verify before sharing.`
      );
      setSummaryLoading(false);
    }, 1500);
  };

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
            {imageUri ? (
              <Image source={{ uri: imageUri }} className="w-full h-full" resizeMode="cover" />
            ) : (
              <View className="absolute" style={{ top: 6, left: 6, right: 6, bottom: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', borderRadius: 4 }} />
            )}
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
          <View className="flex-row gap-3">
            <View className="flex-1">
              <TextInput label="Designation" value={designation} onChangeText={setDesignation} />
            </View>
            <View className="flex-1">
              <TextInput label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            </View>
          </View>
          <TextInput label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <TextInput
            label="Notes"
            value={note}
            onChangeText={setNote}
            placeholder="Anything OCR missed — e.g. their name, spelled out"
            multiline
            style={{ height: 76, textAlignVertical: 'top', paddingTop: 12 }}
          />
        </View>

        <Pressable
          onPress={() => router.push('/(app)/capture/voice')}
          className={`flex-row items-center justify-center gap-2 h-12 rounded-md border mt-4 ${
            hasVoice ? 'border-success bg-success/[0.08]' : 'border-dashed border-hairline bg-white'
          }`}
        >
          <MicIcon size={15} color={hasVoice ? '#2E9C61' : '#0B132B'} />
          <Typography className={`text-[13.5px] font-semibold ${hasVoice ? 'text-[#2E9C61]' : 'text-navy'}`}>
            {hasVoice ? 'Voice note attached' : 'Add a voice note'}
          </Typography>
        </Pressable>

        <Typography className="text-[10px] font-bold tracking-[0.12em] text-slate mt-6 mb-3" style={{ textTransform: 'uppercase' }}>
          Company
        </Typography>
        <View className="gap-4">
          <TextInput label="Company name" value={company} onChangeText={setCompany} />
          <TextInput label="Landline (optional)" value={companyLandline} onChangeText={setCompanyLandline} keyboardType="phone-pad" />
          <TextInput
            label="Website (optional)"
            value={companyWebsite}
            onChangeText={setCompanyWebsite}
            autoCapitalize="none"
            keyboardType="url"
          />
          <TextInput label="Address (optional)" value={companyAddress} onChangeText={setCompanyAddress} />
        </View>

        <View className="mt-4">
          <View className="flex-row items-center justify-between mb-[9px]">
            <Typography variant="body-sm" className="text-ink-muted">
              Company summary
            </Typography>
            <View className="flex-row items-center gap-1 bg-blue/[0.10] rounded-full px-2 py-[3px]">
              <SparkleIcon size={10} color="#1D3F8A" />
              <Typography className="text-[9.5px] font-bold text-blue">AI</Typography>
            </View>
          </View>
          {companySummary ? (
            <View className="bg-white border border-hairline rounded-md px-4 py-[14px] gap-2">
              <Typography className="text-[13px] leading-[1.5] text-navy">{companySummary}</Typography>
              <Pressable onPress={generateCompanySummary} disabled={summaryLoading}>
                <Typography className="text-[12px] font-bold text-gold">Regenerate</Typography>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={generateCompanySummary}
              disabled={summaryLoading}
              className="h-12 rounded-md border border-dashed border-hairline bg-white items-center justify-center flex-row gap-2"
            >
              {summaryLoading ? (
                <Typography className="text-[13.5px] font-semibold text-slate">Fetching company info…</Typography>
              ) : (
                <>
                  <SparkleIcon size={14} color="#0B132B" />
                  <Typography className="text-[13.5px] font-semibold text-navy">Get AI company summary</Typography>
                </>
              )}
            </Pressable>
          )}
        </View>

        <Typography className="text-[10px] font-bold tracking-[0.12em] text-slate mt-6 mb-3" style={{ textTransform: 'uppercase' }}>
          Event fields
        </Typography>
        {customFields.length === 0 ? (
          <Typography className="text-[12.5px] text-slate">No custom fields set for this event.</Typography>
        ) : (
          <View className="gap-4">
            {customFields.map((field) => (
              <CustomFieldInput
                key={field.id}
                field={field}
                value={customValues[field.id]}
                onChange={(value) => setCustomValues((prev) => ({ ...prev, [field.id]: value }))}
              />
            ))}
          </View>
        )}

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
      </ScrollView>

      <View className="bg-white border-t border-hairline flex-row gap-[10px] px-5 pt-[14px] pb-6">
        <Pressable onPress={() => router.replace('/(app)/(tabs)')} className="w-[54px] h-[54px] rounded-md bg-white border border-hairline items-center justify-center">
          <TrashIcon />
        </Pressable>
        <Pressable
          disabled={!canSave}
          onPress={async () => {
            const lead = await useLeadsStore.getState().addLead({
              name,
              company,
              phone,
              email,
              designation,
              note,
              companyLandline,
              companyWebsite,
              companyAddress,
              companySummary,
              hasVoice,
              customFieldValues: customValues,
              imageUri: imageUri ?? undefined,
            });
            useCaptureDraftStore.getState().reset();
            router.replace({
              pathname: '/(app)/capture/saved',
              params: { name, isDraft: lead.syncStatus === 'draft' ? '1' : '0' },
            });
          }}
          className={`flex-1 h-[54px] rounded-md items-center justify-center ${
            canSave ? 'bg-gold shadow-[0_10px_24px_rgba(244,176,0,0.30)]' : 'bg-surface'
          }`}
        >
          <Typography className={`text-[16px] font-bold ${canSave ? 'text-navy' : 'text-slate'}`}>Save lead</Typography>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
