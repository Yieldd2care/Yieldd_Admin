import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { TextInput } from '../../../components/ui/TextInput';
import { Toggle } from '../../../components/ui/Toggle';
import { ScreenHeader } from '../../../components/app/ScreenHeader';
import { CustomFieldInput, isCustomFieldFilled } from '../../../components/app/CustomFieldInput';
import { NoEventNotice } from '../../../components/app/NoEventNotice';
import { DuplicateFlag } from '../../../components/capture/DuplicateFlag';
import { EventContextBar } from '../../../components/shared/EventContextBar';
import { SyncIndicator } from '../../../components/shared/SyncIndicator';
import { AlertCircleIcon, MicIcon, SparkleIcon, TrashIcon } from '../../../components/ui/icons';
import { useDuplicateLead } from '../../../hooks/useDuplicateLead';
import { useLeadsStore } from '../../../stores/useLeadsStore';
import { useCaptureDraftStore } from '../../../stores/useCaptureDraftStore';
import { useEventFieldsStore } from '../../../stores/useEventFieldsStore';
import { useSessionStore } from '../../../stores/useSessionStore';
import { useCurrentEvent } from '../../../hooks/useEvents';
import { fetchEventFields } from '../../../lib/api/eventFields';
import { scanCard } from '../../../lib/api/cardScan';
import { summariseCompany } from '../../../lib/api/companySummary';
import type { CustomFieldValue } from '../../../data/leads';

export default function ConfirmLeadScreen() {
  // Blank, not pre-filled. Card reading is not built yet, and seeding the form
  // with a plausible-looking stranger is how "Rajesh Menon" ends up saved as a
  // real lead by a rep moving fast between conversations.
  const [name, setName] = useState('');
  const [designation, setDesignation] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');

  const [company, setCompany] = useState('');
  const [companyLandline, setCompanyLandline] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companySummary, setCompanySummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [consent, setConsent] = useState(true);
  const [customValues, setCustomValues] = useState<Record<string, CustomFieldValue>>({});

  const hasVoice = useCaptureDraftStore((s) => s.hasVoice);
  const voiceUri = useCaptureDraftStore((s) => s.voiceUri);
  const voiceDurationSeconds = useCaptureDraftStore((s) => s.voiceDurationSeconds);
  const voiceExtension = useCaptureDraftStore((s) => s.voiceExtension);
  const imageUri = useCaptureDraftStore((s) => s.imageUri);
  const customFields = useEventFieldsStore((s) => s.customFields);
  const setFields = useEventFieldsStore((s) => s.setFields);

  const user = useSessionStore((s) => s.user);
  const { event } = useCurrentEvent();
  const [isSaving, setIsSaving] = useState(false);

  // Watches the number as the card scan fills it in, or as the rep corrects it.
  // Never gates `canSave` — a flagged duplicate is information, not a refusal.
  const duplicate = useDuplicateLead(event?.id, phone);

  const [scanState, setScanState] = useState<'idle' | 'reading' | 'done' | 'failed' | 'empty'>(
    imageUri ? 'reading' : 'idle'
  );
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  /**
   * Reads the card while the rep is standing there.
   *
   * Two rules make this safe to run underneath someone who is already typing:
   * a field is only filled if it is still empty, and the whole thing is
   * abandoned if the screen goes away. Losing a typed correction to a late
   * response would be worse than not reading the card at all.
   *
   * The photo is not required for the lead to save. If this fails — no signal,
   * a smudged card, the service down — the rep types the details and nothing
   * about the capture changes.
   */
  useEffect(() => {
    if (!imageUri) return;
    let cancelled = false;

    void (async () => {
      const result = await scanCard(imageUri);
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

      const fillIfEmpty = (
        value: string | null,
        current: string,
        set: (next: string) => void
      ) => {
        if (value && !current.trim()) set(value);
      };

      const f = result.fields;
      setName((current) => (f.fullName && !current.trim() ? f.fullName : current));
      setDesignation((current) => (f.designation && !current.trim() ? f.designation : current));
      setCompany((current) => (f.company && !current.trim() ? f.company : current));
      setPhone((current) => (f.phone && !current.trim() ? f.phone : current));
      setEmail((current) => (f.email && !current.trim() ? f.email : current));
      setCompanyLandline((current) =>
        f.companyLandline && !current.trim() ? f.companyLandline : current
      );
      setCompanyWebsite((current) =>
        f.companyWebsite && !current.trim() ? f.companyWebsite : current
      );
      setCompanyAddress((current) =>
        f.companyAddress && !current.trim() ? f.companyAddress : current
      );
      void fillIfEmpty;

      setScanState('done');
      setScanMessage(null);
    })();

    return () => {
      cancelled = true;
    };
  }, [imageUri]);

  // The fields on this form belong to this event, and an admin can change them
  // mid-show — so they are loaded here rather than trusted from whatever the
  // editor happened to leave behind.
  useEffect(() => {
    if (!event?.id) return;
    let cancelled = false;
    fetchEventFields(event.id)
      .then((fields) => {
        if (!cancelled) setFields(fields);
      })
      .catch(() => {
        /* Offline: the fields already cached on the device are used instead. */
      });
    return () => {
      cancelled = true;
    };
  }, [event?.id, setFields]);

  const missingRequired = customFields.some((f) => f.required && !isCustomFieldFilled(f, customValues[f.id]));
  const canSave = name.trim().length > 0 && !missingRequired && Boolean(event && user) && !isSaving;

  /**
   * Reads the company's own website and summarises what is actually on it.
   *
   * Nothing is invented here — that was the old version's problem. With no
   * website there is nothing to read, so the rep is told exactly that instead
   * of being handed a confident paragraph about a company nobody looked up.
   */
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
    // Only the "Regenerate" press asks for a fresh read; the first press is
    // happy with whatever the team has already fetched for this domain.
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
        {!event ? <NoEventNotice /> : <EventContextBar className="mb-4" />}
        <SyncIndicator className="mb-4" />

        {scanState === 'reading' ? (
          <View className="flex-row items-center gap-[10px] bg-navy/[0.04] border border-hairline rounded-md px-4 py-3 mb-4">
            <ActivityIndicator size="small" color="#F4B000" />
            <Typography className="text-[12.5px] font-semibold text-navy flex-1">
              Reading the card&#8230; you can start typing, nothing will be overwritten.
            </Typography>
          </View>
        ) : null}

        {scanState === 'done' ? (
          <View className="flex-row items-start gap-2 bg-gold/[0.08] border border-gold/[0.30] rounded-md px-[14px] py-3 mb-4">
            <AlertCircleIcon size={14} color="#8A6100" strokeWidth={2} />
            <Typography className="flex-1 text-[12px] font-medium text-navy" style={{ lineHeight: 17 }}>
              Filled in from the card. Check the number and spelling before saving &mdash; a misread
              digit is a lead nobody can call back.
            </Typography>
          </View>
        ) : null}

        {scanState === 'empty' ? (
          <View className="bg-surface rounded-md px-[14px] py-3 mb-4">
            <Typography className="text-[12.5px] font-medium text-navy leading-[1.45]">
              Nothing readable on that photo. Type the details in.
            </Typography>
          </View>
        ) : null}

        {scanState === 'failed' && scanMessage ? (
          <View className="bg-surface rounded-md px-[14px] py-3 mb-4">
            <Typography className="text-[12.5px] font-medium text-navy leading-[1.45]">
              {scanMessage}
            </Typography>
            {/* The rep is already on the form, so the recovery is to type — say
                so. The photo stays attached either way and still uploads with
                the lead, so nothing about the failed read is lost. */}
            <Typography className="text-[12px] text-slate mt-[6px] leading-[1.45]">
              Type the details in below. The photo stays attached to the lead.
            </Typography>
          </View>
        ) : null}
        <View className="flex-row items-center gap-3 mb-[18px]">
          <View className="w-16 h-11 rounded-lg bg-navy overflow-hidden relative">
            {imageUri ? (
              <Image source={{ uri: imageUri }} className="w-full h-full" resizeMode="cover" />
            ) : (
              <View className="absolute" style={{ top: 6, left: 6, right: 6, bottom: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', borderRadius: 4 }} />
            )}
          </View>
          <View className="flex-1">
            <Typography className="text-[13.5px] font-semibold text-navy">
              {imageUri ? 'Card captured' : 'No photo'}
            </Typography>
            {/* The event name lives in EventContextBar above, read from the real
                current event. This line used to print "IMTEX 2026 · B-42". */}
            <Typography className="text-[11.5px] text-slate mt-[1px]">
              {imageUri ? 'Check the details below' : 'Type the details in'}
            </Typography>
          </View>
          <Pressable onPress={() => router.replace('/(app)/capture/camera')}>
            <Typography className="text-[12px] font-bold text-blue">Retake</Typography>
          </Pressable>
        </View>

        <DuplicateFlag {...duplicate} />

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
            if (!event || !user) return;
            setIsSaving(true);
            const lead = await useLeadsStore.getState().addLead({
              organizationId: user.organizationId,
              eventId: event.id,
              capturedBy: user.id,
              source: 'card_scan',
              consentGiven: consent,
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
              voiceUri: voiceUri ?? undefined,
              voiceDurationSeconds,
              voiceExtension,
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
