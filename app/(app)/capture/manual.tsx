import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, TextInput as RNTextInput, View, type TextInputProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { Toggle } from '../../../components/ui/Toggle';
import { ScreenHeader } from '../../../components/app/ScreenHeader';
import { CustomFieldInput, isCustomFieldFilled } from '../../../components/app/CustomFieldInput';
import { NoEventNotice } from '../../../components/app/NoEventNotice';
import { ChevronRightIcon, MicIcon, SparkleIcon } from '../../../components/ui/icons';
import { useLeadsStore } from '../../../stores/useLeadsStore';
import { useCaptureDraftStore } from '../../../stores/useCaptureDraftStore';
import { useEventFieldsStore } from '../../../stores/useEventFieldsStore';
import { useSessionStore } from '../../../stores/useSessionStore';
import { useCurrentEvent } from '../../../hooks/useEvents';
import { fetchEventFields } from '../../../lib/api/eventFields';
import { summariseCompany } from '../../../lib/api/companySummary';
import type { CustomFieldValue } from '../../../data/leads';

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
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [designation, setDesignation] = useState('');
  const [note, setNote] = useState('');
  const [companyLandline, setCompanyLandline] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companySummary, setCompanySummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [consent, setConsent] = useState(true);
  const [customValues, setCustomValues] = useState<Record<string, CustomFieldValue>>({});

  const hasVoice = useCaptureDraftStore((s) => s.hasVoice);
  const voiceUri = useCaptureDraftStore((s) => s.voiceUri);
  const voiceDurationSeconds = useCaptureDraftStore((s) => s.voiceDurationSeconds);
  const voiceExtension = useCaptureDraftStore((s) => s.voiceExtension);
  const customFields = useEventFieldsStore((s) => s.customFields);
  const setFields = useEventFieldsStore((s) => s.setFields);

  const user = useSessionStore((s) => s.user);
  const { event } = useCurrentEvent();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!event?.id) return;
    let cancelled = false;
    fetchEventFields(event.id)
      .then((fields) => {
        if (!cancelled) setFields(fields);
      })
      .catch(() => {
        /* Offline: whatever is cached on the device is used instead. */
      });
    return () => {
      cancelled = true;
    };
  }, [event?.id, setFields]);

  const missingRequired = customFields.some((f) => f.required && !isCustomFieldFilled(f, customValues[f.id]));
  const canSave =
    name.trim().length > 0 &&
    phone.trim().length > 0 &&
    !missingRequired &&
    Boolean(event && user) &&
    !isSaving;

  /** Reads the company's own website. See the fuller note on the confirm screen. */
  const generateCompanySummary = async () => {
    if (summaryLoading) return;

    if (!companyWebsite.trim()) {
      Alert.alert(
        'No company website',
        'This lead does not have a company website, so there is nothing to read. Add it above, or type what you already know.'
      );
      return;
    }

    setSummaryLoading(true);
    const result = await summariseCompany({
      website: companyWebsite,
      companyName: company,
      refresh: Boolean(companySummary),
    });
    setSummaryLoading(false);

    if (result.ok) {
      setCompanySummary(result.summary);
      return;
    }
    Alert.alert("Couldn't summarise", result.message);
  };

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
      <ScreenHeader title="Manual entry" />

      <ScrollView contentContainerClassName="px-5 pt-[26px] pb-6" showsVerticalScrollIndicator={false}>
        {!event ? <NoEventNotice /> : null}
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
            <SmallField placeholder="Designation" value={designation} onChangeText={setDesignation} />
            <SmallField placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <RNTextInput
              className="rounded-md border border-hairline px-4 py-3 text-[14.5px] text-navy bg-white"
              placeholder="Notes — e.g. their name, spelled out"
              placeholderTextColor="#97A3B8"
              value={note}
              onChangeText={setNote}
              multiline
              style={{ minHeight: 68, textAlignVertical: 'top' }}
            />

            <Typography className="text-[10px] font-bold tracking-[0.12em] text-slate mt-3 mb-1" style={{ textTransform: 'uppercase' }}>
              Company
            </Typography>
            <SmallField placeholder="Company" value={company} onChangeText={setCompany} />
            <SmallField placeholder="Landline (optional)" value={companyLandline} onChangeText={setCompanyLandline} keyboardType="phone-pad" />
            <SmallField
              placeholder="Website (optional)"
              value={companyWebsite}
              onChangeText={setCompanyWebsite}
              autoCapitalize="none"
              keyboardType="url"
            />
            <SmallField placeholder="Address (optional)" value={companyAddress} onChangeText={setCompanyAddress} />

            <View className="mt-1">
              <View className="flex-row items-center gap-1 mb-[9px]">
                <Typography variant="body-sm" className="text-ink-muted">
                  Company summary
                </Typography>
                <View className="flex-row items-center gap-1 bg-blue/[0.10] rounded-full px-2 py-[3px] ml-1">
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

            {customFields.length > 0 ? (
              <>
                <Typography className="text-[10px] font-bold tracking-[0.12em] text-slate mt-3 mb-1" style={{ textTransform: 'uppercase' }}>
                  Event fields
                </Typography>
                <View className="gap-[10px]">
                  {customFields.map((field) => (
                    <CustomFieldInput
                      key={field.id}
                      field={field}
                      value={customValues[field.id]}
                      onChange={(value) => setCustomValues((prev) => ({ ...prev, [field.id]: value }))}
                    />
                  ))}
                </View>
              </>
            ) : null}
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
          className={`flex-row items-center justify-center gap-2 h-12 rounded-md border mt-[18px] ${
            hasVoice ? 'border-success bg-success/[0.08]' : 'border-dashed border-hairline bg-white'
          }`}
        >
          <MicIcon size={15} color={hasVoice ? '#2E9C61' : '#0B132B'} />
          <Typography className={`text-[13.5px] font-semibold ${hasVoice ? 'text-[#2E9C61]' : 'text-navy'}`}>
            {hasVoice ? 'Voice note attached' : 'Add a voice note'}
          </Typography>
        </Pressable>
      </ScrollView>

      <View className="bg-white border-t border-hairline px-5 pt-[14px] pb-6">
        <Pressable
          disabled={!canSave}
          onPress={async () => {
            if (!event || !user) return;
            setIsSaving(true);
            const lead = await useLeadsStore.getState().addLead({
              organizationId: user.organizationId,
              eventId: event.id,
              capturedBy: user.id,
              source: 'manual',
              consentGiven: consent,
              name,
              phone,
              company,
              email,
              designation,
              note,
              companyLandline,
              companyWebsite,
              companyAddress,
              companySummary,
              hasVoice,
              voiceUri: voiceUri ?? undefined,
              voiceDurationSeconds,
              voiceExtension,
              customFieldValues: customValues,
            });
            useCaptureDraftStore.getState().reset();
            router.replace({
              pathname: '/(app)/capture/saved',
              params: { name, isDraft: lead.syncStatus === 'draft' ? '1' : '0' },
            });
          }}
          className={`h-[54px] rounded-md items-center justify-center ${canSave ? 'bg-gold shadow-[0_10px_24px_rgba(244,176,0,0.30)]' : 'bg-surface'}`}
        >
          <Typography className={`text-[16px] font-bold ${canSave ? 'text-navy' : 'text-slate'}`}>Save lead</Typography>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
