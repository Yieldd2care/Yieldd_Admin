import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { FloatingLabelInput } from '../../../components/ui/FloatingLabelInput';
import { Toggle } from '../../../components/ui/Toggle';
import { ScreenHeader } from '../../../components/app/ScreenHeader';
import { FormTabs, type LeadFormTab } from '../../../components/app/FormTabs';
import { RepeatableField } from '../../../components/app/RepeatableField';
import { CustomFieldInput, isCustomFieldFilled } from '../../../components/app/CustomFieldInput';
import { NoEventNotice } from '../../../components/app/NoEventNotice';
import { DuplicateFlag } from '../../../components/capture/DuplicateFlag';
import { EventContextBar } from '../../../components/shared/EventContextBar';
import { SyncIndicator } from '../../../components/shared/SyncIndicator';
import { MicIcon, SparkleIcon } from '../../../components/ui/icons';
import { useDuplicateLead } from '../../../hooks/useDuplicateLead';
import { useLeadsStore } from '../../../stores/useLeadsStore';
import { useCaptureDraftStore } from '../../../stores/useCaptureDraftStore';
import { useEventFieldsStore } from '../../../stores/useEventFieldsStore';
import { useSessionStore } from '../../../stores/useSessionStore';
import { useCurrentEvent } from '../../../hooks/useEvents';
import { fetchEventFields } from '../../../lib/api/eventFields';
import { summariseCompany } from '../../../lib/api/companySummary';
import { splitLeadList } from '../../../lib/leadEdit';
import type { CustomFieldValue } from '../../../data/leads';
import { KeyboardSafe } from '../../../components/app/KeyboardSafe';
import { primeCaptureLocation } from '../../../lib/location';
import { CaptureLocationNotice } from '../../../components/capture/CaptureLocationNotice';
import { DuplicateSaveConfirm } from '../../../components/capture/DuplicateSaveConfirm';

/** The surface the fields sit on. The floated labels paint this behind
 *  themselves so they notch the border instead of smearing over it. */
const CARD = '#FFFFFF';

export default function ManualEntryScreen() {
  const [tab, setTab] = useState<LeadFormTab>('person');

  const [name, setName] = useState('');
  const [phones, setPhones] = useState<string[]>(['']);
  const [company, setCompany] = useState('');
  const [emails, setEmails] = useState<string[]>(['']);
  const [designations, setDesignations] = useState<string[]>(['']);
  const [note, setNote] = useState('');
  const [companyLandline, setCompanyLandline] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [companySummary, setCompanySummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
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
  /** The duplicate confirmation is up and the save is waiting on its answer. */
  const [pendingSave, setPendingSave] = useState(false);

  /**
   * The first row only.
   *
   * `useDuplicateLead` fires an RPC 500ms after its match key changes, so
   * watching the whole list would mean one request per row per typing burst.
   * The check is also one-sided by design: the server matches on the primary
   * column, so a second number here would be asking a question it cannot
   * answer. See the column comment on `extra_phones`.
   */
  const primaryPhone = phones[0] ?? '';

  // Information, plus a confirmation before the write — still never a refusal.
  // `canSave` below stays untouched: the duplicate gates the ACTION, not the
  // button, so the rep is never left staring at a Save they cannot press.
  const duplicate = useDuplicateLead(event?.id, primaryPhone);

  /**
   * Start looking for the device's position, once, on the way in.
   *
   * This screen is a ScrollView of TextInputs, which is exactly the shape
   * AGENTS.md warns against putting a location watch on. This is not a watch:
   * `primeCaptureLocation` fires one read, sets no state and subscribes to
   * nothing, so the form never re-renders because of it.
   */
  useEffect(() => {
    primeCaptureLocation();
  }, []);

  /**
   * An answer belongs to the event whose question it was.
   *
   * `customValues` is keyed by field id, and the context bar now changes the
   * event from inside this form rather than by navigating away from it. Without
   * this, switching shows mid-entry would carry the old show's answers into the
   * new show's lead under ids that event has never heard of — invisible on
   * screen, because the inputs below only render the NEW event's fields.
   *
   * Cleared rather than remapped: two events' custom fields are different
   * questions even when they happen to share a label.
   *
   * Guarded on a previous id, not just a change, so the first resolve of
   * `useCurrentEvent` (undefined → id) cannot wipe anything already typed.
   */
  const lastEventId = useRef<string | undefined>(undefined);
  useEffect(() => {
    const id = event?.id;
    if (!id) return;
    if (lastEventId.current && lastEventId.current !== id) setCustomValues({});
    lastEventId.current = id;
  }, [event?.id]);

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

  const missingRequired = customFields.some(
    (f) => f.required && !isCustomFieldFilled(f, customValues[f.id])
  );
  /**
   * Everything the Save button used to do inline.
   *
   * Lifted out verbatim so the duplicate confirmation can call it from two
   * places — straight through when there is no match, and from "Save anyway"
   * when there is.
   */
  const doSave = async () => {
    if (!event || !user) return;
    setIsSaving(true);
    // The same cleaning the edit form's patch does, from the same
    // function: blanks dropped, repeats dropped, [0] is the primary.
    const phone = splitLeadList(phones);
    const email = splitLeadList(emails);
    const designation = splitLeadList(designations);
    const lead = await useLeadsStore.getState().addLead({
      organizationId: user.organizationId,
      eventId: event.id,
      capturedBy: user.id,
      source: 'manual',
      consentGiven: consent,
      name,
      phone: phone.primary,
      extraPhones: phone.extras,
      company,
      email: email.primary,
      extraEmails: email.extras,
      designation: designation.primary,
      extraDesignations: designation.extras,
      note,
      companyLandline,
      companyWebsite,
      companyAddress,
      branchAddress,
      companySummary,
      hasVoice,
      voiceUri: voiceUri ?? undefined,
      voiceDurationSeconds,
      voiceExtension,
      customFieldValues: customValues,
      /**
       * Record the match the rep was just shown and chose to save through.
       *
       * Until now the manual path rendered the warning and stored nothing, so a
       * duplicate typed in by hand was invisible everywhere afterwards. It also
       * makes this lead removable under `leads_delete_own_duplicate` — which is
       * consistent: the rep was warned and said yes.
       */
      duplicateOfLeadId: duplicate.match?.leadId,
      duplicateMatch: duplicate.match ?? undefined,
    });
    useCaptureDraftStore.getState().reset();
    router.replace({
      pathname: '/(app)/capture/saved',
      params: { leadId: lead.id },
    });
  };

  const canSave =
    name.trim().length > 0 &&
    primaryPhone.trim().length > 0 &&
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

      <KeyboardSafe>
        <ScrollView
          contentContainerClassName="px-4 pt-4 pb-6"
          // Not optional. Without it the first tap on the add and remove
          // controls, and on the tabs, is spent dismissing the keyboard and
          // reads as a dead button — see components/app/KeyboardSafe.tsx.
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {!event ? <NoEventNotice /> : <EventContextBar className="mb-3" />}
          <SyncIndicator className="mb-3" />

          <View className="bg-white rounded-[18px] border border-hairline px-4 pt-4 pb-5">
            <FormTabs tab={tab} onChange={setTab} />

            {/*
              gap-[22px], not 10. A floated label rises out of its box and needs
              clear air above it; at 10 it landed on the bottom border of the
              field above. The notchColor is the other half of the same fix.
            */}
            <View className="gap-[22px] mt-6">
              {tab === 'person' ? (
                <>
                  <FloatingLabelInput
                    label="Person name"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    notchColor={CARD}
                  />
                  <RepeatableField
                    label="Mobile number"
                    values={phones}
                    onChange={setPhones}
                    hint="98204 41720"
                    keyboardType="phone-pad"
                    notchColor={CARD}
                  />
                  <RepeatableField
                    label="Email"
                    values={emails}
                    onChange={setEmails}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    notchColor={CARD}
                  />
                  <RepeatableField
                    label="Job title"
                    values={designations}
                    onChange={setDesignations}
                    notchColor={CARD}
                  />

                  {/*
                    Notes, then the recorder attached underneath it.

                    Below rather than above, and the reasoning is about what a
                    rep reads first. "Notes" is the labelled destination - the
                    thing they came to this part of the form to fill - and a
                    button sitting above it competes with it for that role,
                    leaving an unexplained empty box underneath. Directly below
                    and visually joined, it reads as the second way to fill the
                    same field: type it, or say it. It is also the slower path
                    to reach for, and the faster one should not be the one the
                    thumb lands on by accident.

                    gap-0 between the two, deliberately: the 22px that separates
                    every other field would make this read as a separate thing
                    rather than part of the note.
                  */}
                  <View className="gap-[8px]">
                    <FloatingLabelInput
                      label="Notes"
                      value={note}
                      onChangeText={setNote}
                      hint="e.g. their name spelled out"
                      multiline
                      notchColor={CARD}
                    />
                    <Pressable
                      onPress={() => router.push('/(app)/capture/voice')}
                      className={`flex-row items-center justify-center gap-2 h-[46px] rounded-[12px] border-[1.5px] ${
                        hasVoice ? 'border-success bg-success/[0.08]' : 'border-hairline bg-white'
                      }`}
                    >
                      <MicIcon size={15} color={hasVoice ? '#2E9C61' : '#1D3F8A'} />
                      <Typography
                        className={`text-[13.5px] font-semibold ${
                          hasVoice ? 'text-[#2E9C61]' : 'text-blue'
                        }`}
                      >
                        {hasVoice ? 'Voice note attached' : 'Add a voice note'}
                      </Typography>
                    </Pressable>
                  </View>
                </>
              ) : (
                <>
                  <FloatingLabelInput
                    label="Company name"
                    value={company}
                    onChangeText={setCompany}
                    autoCapitalize="words"
                    notchColor={CARD}
                  />
                  <FloatingLabelInput
                    label="Landline"
                    value={companyLandline}
                    onChangeText={setCompanyLandline}
                    keyboardType="phone-pad"
                    notchColor={CARD}
                  />
                  <FloatingLabelInput
                    label="Website"
                    value={companyWebsite}
                    onChangeText={setCompanyWebsite}
                    autoCapitalize="none"
                    keyboardType="url"
                    notchColor={CARD}
                  />
                  <FloatingLabelInput
                    label="Address"
                    value={companyAddress}
                    onChangeText={setCompanyAddress}
                    multiline
                    minHeight={76}
                    notchColor={CARD}
                  />
                  <FloatingLabelInput
                    label="Branch address"
                    value={branchAddress}
                    onChangeText={setBranchAddress}
                    multiline
                    minHeight={76}
                    notchColor={CARD}
                  />

                  <View>
                    <View className="flex-row items-center gap-1 mb-[10px]">
                      <Typography className="text-[12.5px] font-semibold text-slate">
                        Company summary
                      </Typography>
                      <View className="flex-row items-center gap-1 bg-blue/[0.10] rounded-full px-2 py-[3px] ml-1">
                        <SparkleIcon size={10} color="#1D3F8A" />
                        <Typography className="text-[9.5px] font-bold text-blue">AI</Typography>
                      </View>
                    </View>
                    {companySummary ? (
                      <View className="bg-white border-[1.5px] border-hairline rounded-[12px] px-4 py-[14px] gap-2">
                        <Typography className="text-[13px] leading-[1.5] text-navy">
                          {companySummary}
                        </Typography>
                        <Pressable onPress={generateCompanySummary} disabled={summaryLoading}>
                          <Typography className="text-[12px] font-bold text-blue">Regenerate</Typography>
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable
                        onPress={generateCompanySummary}
                        disabled={summaryLoading}
                        className="h-[46px] rounded-[12px] border-[1.5px] border-hairline bg-white items-center justify-center flex-row gap-2"
                      >
                        {summaryLoading ? (
                          <Typography className="text-[13.5px] font-semibold text-slate">
                            Fetching company info…
                          </Typography>
                        ) : (
                          <>
                            <SparkleIcon size={14} color="#1D3F8A" />
                            <Typography className="text-[13.5px] font-semibold text-blue">
                              Get AI company summary
                            </Typography>
                          </>
                        )}
                      </Pressable>
                    )}
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Directly under the card that produced it, so the cause is obvious. */}
          <View className="mt-3">
            <DuplicateFlag {...duplicate} />
          </View>

          {/*
            Outside the tabbed card on purpose. An event's own questions belong
            to neither the person nor their company, and a REQUIRED one hidden
            behind a tab the rep never opened is a save they cannot complete and
            cannot see the reason for.
          */}
          {customFields.length > 0 ? (
            <View className="bg-white rounded-[18px] border border-hairline px-4 pt-4 pb-5 mt-4">
              <Typography className="text-[13px] font-bold text-slate mb-4">Event fields</Typography>
              <View className="gap-[14px]">
                {customFields.map((field) => (
                  <CustomFieldInput
                    key={field.id}
                    field={field}
                    value={customValues[field.id]}
                    onChange={(value) => setCustomValues((prev) => ({ ...prev, [field.id]: value }))}
                  />
                ))}
              </View>
            </View>
          ) : null}

          <Pressable
            onPress={() => setConsent((c) => !c)}
            className="flex-row items-center justify-between bg-white border border-hairline rounded-[18px] px-4 py-[16px] mt-4"
          >
            <View className="flex-1 pr-3">
              <Typography className="text-[13px] font-semibold text-navy">
                Consent to follow up
              </Typography>
              <Typography className="text-[11.5px] text-slate mt-[2px]">
                Confirmed verbally at the stall
              </Typography>
            </View>
            <Toggle value={consent} onValueChange={setConsent} />
          </Pressable>
        </ScrollView>

        <View className="bg-white border-t border-hairline px-5 pt-[14px] pb-6">
          <Pressable
            disabled={!canSave}
            onPress={() => {
              if (!event || !user) return;
              /**
               * The gate, and it sits exactly here for a reason: after the last
               * precondition and before the first side effect.
               *
               * That is what makes Cancel correct by DOING NOTHING rather than
               * by undoing anything. `isSaving` never went true, the lists were
               * never split, `addLead` never ran, the draft store was never
               * reset and nothing navigated — so the form is still intact by
               * construction. There is no state to restore.
               */
              if (duplicate.match) {
                setPendingSave(true);
                return;
              }
              void doSave();
            }}
            className={`h-[54px] rounded-md items-center justify-center ${
              canSave
                ? 'bg-gold shadow-[0_10px_24px_rgba(244,176,0,0.30)]'
                : 'bg-surface shadow-[0_10px_24px_rgba(244,176,0,0)]'
            }`}
          >
            <Typography
              className={`text-[16px] font-bold ${canSave ? 'text-navy' : 'text-slate'}`}
            >
              Save lead
            </Typography>
          </Pressable>
        </View>
      </KeyboardSafe>

      {/* Outside KeyboardSafe and outside the ScrollView, deliberately. A Modal
          portals to its own window so it has no layout of its own here, but a
          NativeWind gap- container above would still reserve a gap for it, and
          opening one inside KeyboardSafe with the keyboard up forces the whole
          form to reflow. */}
      <CaptureLocationNotice />
      <DuplicateSaveConfirm
        visible={pendingSave}
        match={duplicate.match}
        isSelf={duplicate.isSelf}
        onConfirm={() => {
          setPendingSave(false);
          void doSave();
        }}
        onCancel={() => setPendingSave(false)}
      />
    </SafeAreaView>
  );
}
