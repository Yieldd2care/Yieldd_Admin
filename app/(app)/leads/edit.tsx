import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput as RNTextInput, View, type TextInputProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { ScreenHeader } from '../../../components/app/ScreenHeader';
import { KeyboardSafe } from '../../../components/app/KeyboardSafe';
import { CustomFieldInput } from '../../../components/app/CustomFieldInput';
import { useLeadsStore } from '../../../stores/useLeadsStore';
import { fetchEventFields } from '../../../lib/api/eventFields';
import type { CustomFieldDef } from '../../../stores/useEventFieldsStore';
import type { CustomFieldValue } from '../../../data/leads';
import type { LeadPatch } from '../../../lib/api/leads';
import { canSaveLeadEdits, leadEditPatch, type LeadEditForm } from '../../../lib/leadEdit';

/**
 * Correcting a lead after it was captured.
 *
 * The reader gets things wrong — a smudged digit, a surname read as a company
 * — and until now the only fix was to capture the person again, which leaves
 * a duplicate behind. The edit button on the lead screen existed and did
 * nothing at all; this is what it does.
 *
 * Deliberately NOT here: status, deal value, follow-up date, assignment.
 * Those are paid features with their own sheets, and slipping them into a
 * form the whole plan can open would be a way around the locks.
 */

function BigField({ label, ...rest }: { label: string } & TextInputProps) {
  return (
    <View className="mb-[18px]">
      <Typography
        className="text-[12.5px] font-bold tracking-[0.04em] text-slate mb-[9px]"
        style={{ textTransform: 'uppercase' }}
      >
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

function SectionLabel({ children }: { children: string }) {
  return (
    <Typography
      className="text-[10px] font-bold tracking-[0.12em] text-slate mt-5 mb-[10px]"
      style={{ textTransform: 'uppercase' }}
    >
      {children}
    </Typography>
  );
}

export default function EditLeadScreen() {
  const { leadId } = useLocalSearchParams<{ leadId?: string }>();
  const leads = useLeadsStore((s) => s.leads);
  const lead = leads.find((l) => l.id === leadId);
  const saveLeadEdits = useLeadsStore((s) => s.saveLeadEdits);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [designation, setDesignation] = useState('');
  const [companyLandline, setCompanyLandline] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [note, setNote] = useState('');
  const [customValues, setCustomValues] = useState<Record<string, CustomFieldValue>>({});

  /**
   * Filled once, from the lead as it stands when the screen opens.
   *
   * Keyed on the id rather than on the lead object: the store hands back a new
   * object whenever a sync lands, and re-running this on every one of those
   * would wipe out whatever the rep had half-typed.
   */
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  useEffect(() => {
    if (!lead || loadedFor === lead.id) return;
    setName(lead.name ?? '');
    setPhone(lead.phone ?? '');
    setCompany(lead.company ?? '');
    setEmail(lead.email ?? '');
    setDesignation(lead.designation ?? '');
    setCompanyLandline(lead.companyLandline ?? '');
    setCompanyWebsite(lead.companyWebsite ?? '');
    setCompanyAddress(lead.companyAddress ?? '');
    setBranchAddress(lead.branchAddress ?? '');
    setNote(lead.note ?? '');
    setCustomValues(lead.customFieldValues ?? {});
    setLoadedFor(lead.id);
  }, [lead, loadedFor]);

  const [fieldDefs, setFieldDefs] = useState<CustomFieldDef[]>([]);
  useEffect(() => {
    if (!lead?.eventId) return;
    let cancelled = false;
    fetchEventFields(lead.eventId)
      .then((defs) => {
        if (!cancelled) setFieldDefs(defs);
      })
      .catch(() => {
        /* Same as the detail screen: without the definitions the answers are
           simply not offered, which beats showing raw UUIDs. */
      });
    return () => {
      cancelled = true;
    };
  }, [lead?.eventId]);

  /**
   * Only what actually moved. The rule and its reasoning live in
   * lib/leadEdit.ts, where they can be tested — sending an untouched field
   * would overwrite whatever someone else changed on this lead from the
   * dashboard while the rep had the form open.
   */
  const form = useMemo<LeadEditForm>(
    () => ({
      name,
      phone,
      company,
      email,
      designation,
      companyLandline,
      companyWebsite,
      companyAddress,
      branchAddress,
      note,
      customFieldValues: customValues,
    }),
    [
      name,
      phone,
      company,
      email,
      designation,
      companyLandline,
      companyWebsite,
      companyAddress,
      branchAddress,
      note,
      customValues,
    ]
  );

  const patch = useMemo<LeadPatch>(
    () => (lead ? leadEditPatch(lead, form) : {}),
    [lead, form]
  );

  const dirty = Object.keys(patch).length > 0;
  const canSave = canSaveLeadEdits(patch, form);

  if (!lead) {
    return (
      <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
        <ScreenHeader title="Edit lead" />
        <View className="flex-1 items-center justify-center px-8">
          <Typography className="text-[14px] text-slate text-center">
            That lead is not on this device any more.
          </Typography>
        </View>
      </SafeAreaView>
    );
  }

  const save = () => {
    if (!canSave) return;
    saveLeadEdits(lead.id, patch);
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
      <ScreenHeader title="Edit lead" />

      <KeyboardSafe className="flex-1">
        <ScrollView
          contentContainerClassName="px-5 pt-[18px] pb-8"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <BigField label="Name" value={name} onChangeText={setName} autoCapitalize="words" />

          <SectionLabel>Person</SectionLabel>
          <View className="gap-[10px]">
            <SmallField
              placeholder="Phone"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <SmallField
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <SmallField placeholder="Designation" value={designation} onChangeText={setDesignation} />
          </View>

          <SectionLabel>Company</SectionLabel>
          <View className="gap-[10px]">
            <SmallField placeholder="Company" value={company} onChangeText={setCompany} autoCapitalize="words" />
            <SmallField
              placeholder="Landline"
              value={companyLandline}
              onChangeText={setCompanyLandline}
              keyboardType="phone-pad"
            />
            <SmallField
              placeholder="Website"
              value={companyWebsite}
              onChangeText={setCompanyWebsite}
              autoCapitalize="none"
              keyboardType="url"
            />
            <SmallField placeholder="Address" value={companyAddress} onChangeText={setCompanyAddress} />
            <SmallField placeholder="Branch address" value={branchAddress} onChangeText={setBranchAddress} />
          </View>

          <SectionLabel>Note</SectionLabel>
          <RNTextInput
            className="min-h-[96px] rounded-md border border-hairline px-4 py-3 text-[14.5px] text-navy bg-white"
            placeholderTextColor="#97A3B8"
            placeholder="What did you talk about?"
            value={note}
            onChangeText={setNote}
            multiline
            textAlignVertical="top"
          />

          {fieldDefs.length > 0 ? (
            <>
              <SectionLabel>Event fields</SectionLabel>
              <View className="gap-[10px]">
                {fieldDefs.map((field) => (
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
        </ScrollView>
      </KeyboardSafe>

      <View className="bg-white border-t border-hairline px-5 pt-[14px] pb-6">
        {/*
          The shadow is present in both branches and only its alpha changes.
          A class list that gains its first `shadow-*` after the first render
          makes NativeWind upgrade the component mid-life and throw a red
          screen about a missing navigation context — see AGENTS.md. This is
          exactly the disabled-to-enabled save button described there.
        */}
        <Pressable
          disabled={!canSave}
          onPress={save}
          className={`h-[54px] rounded-md items-center justify-center ${
            canSave
              ? 'bg-gold shadow-[0_10px_24px_rgba(244,176,0,0.30)]'
              : 'bg-surface shadow-[0_10px_24px_rgba(244,176,0,0)]'
          }`}
        >
          <Typography className={`text-[15px] font-bold ${canSave ? 'text-navy' : 'text-slate'}`}>
            {dirty && !canSave ? 'A name is needed' : 'Save changes'}
          </Typography>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
