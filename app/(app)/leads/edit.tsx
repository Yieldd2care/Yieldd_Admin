import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { FloatingLabelInput } from '../../../components/ui/FloatingLabelInput';
import { ScreenHeader } from '../../../components/app/ScreenHeader';
import { KeyboardSafe } from '../../../components/app/KeyboardSafe';
import { FormTabs, type LeadFormTab } from '../../../components/app/FormTabs';
import { RepeatableField } from '../../../components/app/RepeatableField';
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
 * a duplicate behind.
 *
 * Deliberately NOT here: status, deal value, follow-up date, assignment.
 * Those are paid features with their own sheets, and slipping them into a
 * form the whole plan can open would be a way around the locks.
 *
 * ---------------------------------------------------------------------------
 * Why one card and a pair of tabs, rather than two stacked panels
 *
 * The two groups used to sit one under the other, each in its own tinted panel
 * with its heading notched into the border. Three things were wrong with it:
 * the company's landline sat four screens below the person's name; the heading
 * was drawn in the same strip of space the floated labels rise into, so a
 * filled field painted over it; and the tinted panel meant every label carried
 * a white rectangle across a blue background.
 *
 * One white card, and a tab to choose which half of the form is in it, fixes
 * all three at once. The counts on the tabs are what makes hiding a section
 * safe — see components/app/FormTabs.tsx.
 */

/** The surface the fields sit on. The floated labels paint this colour behind
 *  themselves so they read as a notch in the border rather than a smear. */
const CARD = '#FFFFFF';

/**
 * The stored split, back into the one list the form edits.
 *
 * `phone` and `extra_phones` are two columns because of what the rest of the
 * app does with the first of them — it is what gets dialled, what a list row
 * shows, what duplicate detection matches on. On this screen that distinction
 * would only be in the way, so the form sees one list and `leadEditPatch`
 * splits it again on the way out.
 */
function listFrom(primary: string | undefined, extras: string[] | undefined): string[] {
  return [primary ?? '', ...(extras ?? [])];
}

/** How many of these actually hold something, for the tab badge. */
function filledCount(...values: (string | string[])[]): number {
  let n = 0;
  for (const value of values) {
    if (Array.isArray(value)) n += value.filter((v) => v.trim()).length;
    else if (value.trim()) n += 1;
  }
  return n;
}

export default function EditLeadScreen() {
  const { leadId } = useLocalSearchParams<{ leadId?: string }>();
  const leads = useLeadsStore((s) => s.leads);
  const lead = leads.find((l) => l.id === leadId);
  const saveLeadEdits = useLeadsStore((s) => s.saveLeadEdits);

  const [tab, setTab] = useState<LeadFormTab>('person');

  const [name, setName] = useState('');
  const [phones, setPhones] = useState<string[]>(['']);
  const [company, setCompany] = useState('');
  const [emails, setEmails] = useState<string[]>(['']);
  const [designations, setDesignations] = useState<string[]>(['']);
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
   * would wipe out whatever the rep had half-typed. The three lists are seeded
   * HERE, in this same effect, for that reason — a second effect keyed on
   * `lead` would reintroduce exactly the wipe this guard exists to prevent.
   */
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  useEffect(() => {
    if (!lead || loadedFor === lead.id) return;
    setName(lead.name ?? '');
    setPhones(listFrom(lead.phone, lead.extraPhones));
    setCompany(lead.company ?? '');
    setEmails(listFrom(lead.email, lead.extraEmails));
    setDesignations(listFrom(lead.designation, lead.extraDesignations));
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
      phones,
      company,
      emails,
      designations,
      companyLandline,
      companyWebsite,
      companyAddress,
      branchAddress,
      note,
      customFieldValues: customValues,
    }),
    // Hand-written, so a field added above and forgotten here leaves the Save
    // button dead while the rep types — which reads as "the app won't let me
    // save", not as a stale memo.
    [
      name,
      phones,
      company,
      emails,
      designations,
      companyLandline,
      companyWebsite,
      companyAddress,
      branchAddress,
      note,
      customValues,
    ]
  );

  const patch = useMemo<LeadPatch>(() => (lead ? leadEditPatch(lead, form) : {}), [lead, form]);

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
          contentContainerClassName="px-4 pt-4 pb-8"
          // Not optional. Without it the first tap on the add and remove
          // controls, and on the tabs, is spent dismissing the keyboard and
          // reads as a dead button — see components/app/KeyboardSafe.tsx.
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="bg-white rounded-[18px] border border-hairline px-4 pt-4 pb-5">
            <FormTabs
              tab={tab}
              onChange={setTab}
              personFilled={filledCount(name, phones, emails, designations, note)}
              companyFilled={filledCount(
                company,
                companyLandline,
                companyWebsite,
                companyAddress,
                branchAddress
              )}
            />

            {/*
              gap-[22px], not the old 10. The floated label rises out of the
              box and needs clear air above it; at 10 it landed on the bottom
              border of the field above. This is the spacing bug, and the
              notchColor below is the other half of it.
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
                  <FloatingLabelInput
                    label="Notes"
                    value={note}
                    onChangeText={setNote}
                    hint="What did you talk about?"
                    multiline
                    notchColor={CARD}
                  />
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
                </>
              )}
            </View>
          </View>

          {/*
            Outside the tabbed card on purpose. An event's own questions belong
            to neither the person nor their company, and a required one hidden
            behind a tab the rep never opened is a save they cannot complete
            and cannot see why.
          */}
          {fieldDefs.length > 0 ? (
            <View className="bg-white rounded-[18px] border border-hairline px-4 pt-4 pb-5 mt-4">
              <Typography className="text-[13px] font-bold text-slate mb-4">Event fields</Typography>
              <View className="gap-[14px]">
                {fieldDefs.map((field) => (
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
