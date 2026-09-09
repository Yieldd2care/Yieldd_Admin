import { useEffect, useMemo, useState } from 'react';
import { Pressable, TextInput as RNTextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { DashShell } from '../dash/DashShell';
import { Cap, Empty, GhostButton, GoldButton, Panel, Pill, StatusChip, TempChip } from '../dash/primitives';
import { Typography } from '../ui/Typography';
import { DateField } from '../app/DateField';
import { useLeadsStore } from '../../stores/useLeadsStore';
import { useSessionStore } from '../../stores/useSessionStore';
import { useEvent } from '../../hooks/useEvents';
import { useTeam } from '../../hooks/useTeam';
import { useLeadActions } from '../../hooks/useLeadActions';
import { fetchEventFields } from '../../lib/api/eventFields';
import { fetchVoiceNotes, type VoiceNote } from '../../lib/api/voiceNotes';
import { activityLabel, fetchLeadActivity, logLeadActivity, OUTCOME_FROM_LABEL, type LeadActivity } from '../../lib/api/leadActivity';
import type { CustomFieldDef } from '../../stores/useEventFieldsStore';
import { toDateOnly } from '../../lib/dates';

const STATUSES = ['New', 'Contacted', 'Qualified', 'Won', 'Lost'] as const;
const TEMPS = ['Hot', 'Warm', 'Cold'] as const;
const OUTCOMES = ['Connected', 'No answer', 'Not interested', 'Meeting set'] as const;

/** Qualified and Won are refused by the database without a value on the same write. */
const NEEDS_VALUE = new Set<string>(['Qualified', 'Won']);

async function copy(text: string) {
  try {
    await globalThis.navigator?.clipboard?.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <View className="py-[11px] border-b border-hairline">
      <Cap>{label}</Cap>
      <Typography className={`text-[14px] mt-1 ${value ? 'text-navy font-medium' : 'text-placeholder'}`}>
        {value || 'Not captured'}
      </Typography>
    </View>
  );
}

/**
 * Kept out of the route file so it can be rendered on its own.
 * `app/(dash)/leads/[id].tsx` is a three-line wrapper that reads the param —
 * the brackets in that filename make it unimportable from anywhere else.
 */
export function LeadDetail({ leadId }: { leadId: string }) {
  const router = useRouter();

  const leads = useLeadsStore((s) => s.leads);
  const lead = useMemo(() => leads.find((l) => l.id === leadId), [leads, leadId]);

  const user = useSessionStore((s) => s.user);
  const isAdmin = useSessionStore((s) => s.user?.role === 'admin');
  const { data: event } = useEvent(lead?.eventId || undefined);
  const { data: team } = useTeam();

  const [error, setError] = useState<string | null>(null);
  const actions = useLeadActions(lead, { onError: (t, m) => setError(`${t}: ${m}`) });

  const [fieldDefs, setFieldDefs] = useState<CustomFieldDef[]>([]);
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [activity, setActivity] = useState<LeadActivity[]>([]);
  const [copied, setCopied] = useState(false);

  // Status editing. Qualified and Won carry a value, written in the same patch
  // as the status — `leads_qualified_requires_value` and its Won twin reject a
  // status-first write, and the failure would surface much later as a sync
  // error rather than here.
  const [status, setStatus] = useState<string>('New');
  const [dealValue, setDealValue] = useState('');
  const [temperature, setTemperature] = useState<string | undefined>(undefined);

  // Follow-up panel
  const [outcome, setOutcome] = useState<string>('Connected');
  const [followUp, setFollowUp] = useState<Date | null>(null);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    if (!lead) return;
    setStatus(lead.status);
    setTemperature(lead.temperature);
    setDealValue(lead.dealValue ? String(lead.dealValue) : '');
    setNote(lead.note ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead?.id]);

  useEffect(() => {
    if (!lead?.eventId) return;
    let off = false;
    fetchEventFields(lead.eventId).then((d) => !off && setFieldDefs(d)).catch(() => {});
    return () => {
      off = true;
    };
  }, [lead?.eventId]);

  useEffect(() => {
    if (!leadId) return;
    let off = false;
    fetchVoiceNotes(leadId).then((v) => !off && setVoiceNotes(v)).catch(() => {});
    fetchLeadActivity(leadId).then((a) => !off && setActivity(a)).catch(() => {});
    return () => {
      off = true;
    };
  }, [leadId]);

  const answered = useMemo(() => {
    const values = lead?.customFieldValues ?? {};
    return fieldDefs
      .map((d) => ({ def: d, value: values[d.id] }))
      .filter(({ value }) => value !== undefined && value !== '' && value !== false);
  }, [fieldDefs, lead?.customFieldValues]);

  const assignee = team?.find((m) => m.id === lead?.assignedToId);

  if (!lead) {
    return (
      <DashShell title="Lead" breadcrumb={[{ label: 'Leads', href: '/(dash)/leads' }]}>
        <Panel>
          <Empty
            title="Lead not found"
            body="It may not have synced to this browser yet, or it belongs to someone else."
          />
        </Panel>
      </DashShell>
    );
  }

  const valueNeeded = NEEDS_VALUE.has(status);
  const valueAmount = Number(dealValue.replace(/[^0-9]/g, '')) || 0;
  const statusDirty =
    status !== lead.status ||
    temperature !== lead.temperature ||
    (valueNeeded && valueAmount !== (lead.dealValue ?? 0));
  const canSaveStatus = statusDirty && (!valueNeeded || valueAmount > 0);

  function saveStatus() {
    if (!canSaveStatus) return;
    useLeadsStore.getState().editLead(lead!.id, {
      status: status as never,
      temperature: temperature as never,
      // Written with the status, never after it.
      ...(valueNeeded ? { dealValue: valueAmount } : {}),
      ...(status === 'Won' ? { dealClosedAt: new Date().toISOString() } : {}),
    });
    void useLeadsStore.getState().syncDrafts(user?.id);
    setSaved('Status saved.');
  }

  function saveFollowUp() {
    const patch: Record<string, unknown> = {};
    if (note.trim() !== (lead!.note ?? '')) patch.note = note.trim();
    if (followUp) patch.followUpDate = toDateOnly(followUp);
    if (Object.keys(patch).length) {
      useLeadsStore.getState().editLead(lead!.id, patch as never);
      void useLeadsStore.getState().syncDrafts(user?.id);
    }
    if (user) {
      void logLeadActivity({
        leadId: lead!.id,
        actorId: user.id,
        type: 'outcome_logged',
        outcome: OUTCOME_FROM_LABEL[outcome],
        metadata: followUp ? { follow_up_date: toDateOnly(followUp) } : {},
      }).then(() => fetchLeadActivity(lead!.id).then(setActivity));
    }
    setSaved('Follow-up logged.');
  }

  function reassign(memberId: string | null) {
    useLeadsStore.getState().reassignLead(lead!.id, memberId);
    setSaved(memberId ? 'Reassigned.' : 'Assigned back to you.');
  }

  return (
    <DashShell
      title={lead.name || 'Unnamed lead'}
      subtitle={[lead.designation, lead.company].filter(Boolean).join(' at ') || undefined}
      breadcrumb={[{ label: 'Leads', href: '/(dash)/leads' }]}
      actions={
        <>
          {actions.canWhatsApp ? (
            <a
              href={actions.whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none' }}
              onClick={() => actions.noteWhatsAppOpened()}
            >
              <View className="bg-gold rounded-md px-5 py-[11px] shadow-[0_10px_26px_rgba(244,176,0,0.34)]">
                <Typography className="text-[13.5px] font-bold text-navy">WhatsApp</Typography>
              </View>
            </a>
          ) : null}
          <GhostButton
            label={copied ? 'Copied' : 'Copy message'}
            onPress={async () => {
              if (await copy(actions.whatsappText)) {
                setCopied(true);
                globalThis.setTimeout(() => setCopied(false), 2000);
              }
            }}
          />
          <GhostButton label="Save contact" onPress={() => void actions.saveToContacts()} />
        </>
      }
    >
      {error ? (
        <Panel className="px-5 py-4 mb-4">
          <Typography className="text-[13px] font-semibold text-[#C23B3B]">{error}</Typography>
        </Panel>
      ) : null}
      {saved ? (
        <Panel className="px-5 py-4 mb-4">
          <Typography className="text-[13px] font-semibold text-[#1E7A45]">{saved}</Typography>
        </Panel>
      ) : null}

      <View className="flex-row items-center gap-3 mb-4">
        <StatusChip value={lead.status} />
        <TempChip value={lead.temperature} />
        {lead.syncStatus === 'draft' ? (
          <Typography className="text-[12px] text-slate">Not synced yet</Typography>
        ) : null}
        {event ? <Typography className="text-[12.5px] text-slate">Captured at {event.name}</Typography> : null}
      </View>

      <View className="flex-row gap-4 items-start">
        <View className="flex-[1.2] gap-4">
          <Panel className="px-[22px] pb-3">
            <Typography className="text-[17px] font-bold text-navy pt-5">Captured details</Typography>
            <Field label="Phone" value={lead.phone} />
            <Field label="Email" value={lead.email} />
            <Field label="Company" value={lead.company} />
            <Field label="Designation" value={lead.designation} />
            <Field label="Company landline" value={lead.companyLandline} />
            <Field label="Website" value={lead.companyWebsite} />
            <Field label="Company address" value={lead.companyAddress} />
            <Field label="Branch address" value={lead.branchAddress} />
            <View className="py-[11px]">
              <Cap>Consent to follow up</Cap>
              <Typography className="text-[14px] font-medium text-navy mt-1">
                {lead.consentGiven ? 'Given at the stall' : 'Not recorded'}
              </Typography>
            </View>
          </Panel>

          {lead.companySummary ? (
            <Panel className="px-[22px] py-5">
              <Typography className="text-[17px] font-bold text-navy">About the company</Typography>
              <Typography className="text-[13px] text-ink-muted leading-[1.6] mt-2">
                {lead.companySummary}
              </Typography>
            </Panel>
          ) : null}

          {answered.length ? (
            <Panel className="px-[22px] pb-3">
              <Typography className="text-[17px] font-bold text-navy pt-5">
                Answers from this event
              </Typography>
              {answered.map(({ def, value }) => (
                <Field
                  key={def.id}
                  label={def.name}
                  value={typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                />
              ))}
            </Panel>
          ) : null}

          {voiceNotes.length ? (
            <Panel className="px-[22px] py-5">
              <Typography className="text-[17px] font-bold text-navy">Voice note</Typography>
              {voiceNotes.map((v) => (
                <View key={v.id} className="mt-3">
                  {v.summary ? (
                    <Typography className="text-[13px] text-navy leading-[1.6]">{v.summary}</Typography>
                  ) : null}
                  {v.transcript ? (
                    <Typography className="text-[12.5px] text-slate leading-[1.6] mt-2">
                      {v.transcript}
                    </Typography>
                  ) : (
                    <Typography className="text-[12.5px] text-label mt-1">
                      {v.status === 'completed' ? 'No transcript' : 'Still transcribing…'}
                    </Typography>
                  )}
                </View>
              ))}
            </Panel>
          ) : null}
        </View>

        <View className="flex-1 gap-4">
          <Panel className="px-[22px] py-5">
            <Typography className="text-[17px] font-bold text-navy">Status</Typography>
            <View className="flex-row flex-wrap gap-2 mt-3">
              {STATUSES.map((s) => (
                <Pill key={s} label={s} active={status === s} onPress={() => setStatus(s)} />
              ))}
            </View>

            {valueNeeded ? (
              <View className="mt-4">
                <Cap>Deal value (₹)</Cap>
                <RNTextInput
                  value={dealValue}
                  onChangeText={setDealValue}
                  keyboardType="number-pad"
                  placeholder="450000"
                  placeholderTextColor="#97A3B8"
                  className="h-[46px] bg-white rounded-md px-4 mt-2 text-[15px] text-navy border border-hairline"
                />
                <Typography className="text-[11.5px] text-label mt-2 leading-[1.5]">
                  Qualified and Won need a value — the database refuses the status without one.
                </Typography>
              </View>
            ) : null}

            <Cap className="mt-5">Temperature</Cap>
            <View className="flex-row gap-2 mt-2">
              {TEMPS.map((t) => (
                <Pill
                  key={t}
                  label={t}
                  active={temperature === t}
                  onPress={() => setTemperature(temperature === t ? undefined : t)}
                />
              ))}
            </View>

            <View className="mt-5">
              <GoldButton label="Save status" disabled={!canSaveStatus} onPress={saveStatus} />
            </View>
          </Panel>

          <Panel className="px-[22px] py-5">
            <Typography className="text-[17px] font-bold text-navy">Log an outcome</Typography>
            <View className="flex-row flex-wrap gap-2 mt-3">
              {OUTCOMES.map((o) => (
                <Pill key={o} label={o} active={outcome === o} onPress={() => setOutcome(o)} />
              ))}
            </View>

            <View className="mt-4">
              <DateField label="Follow up on" value={followUp} onChange={setFollowUp} />
            </View>

            <Cap className="mt-4">Note</Cap>
            <RNTextInput
              value={note}
              onChangeText={setNote}
              multiline
              placeholder="What was said"
              placeholderTextColor="#97A3B8"
              className="bg-white rounded-md px-4 py-3 mt-2 text-[14px] text-navy border border-hairline"
              style={{ minHeight: 90, textAlignVertical: 'top' }}
            />

            <View className="mt-4">
              <GoldButton label="Save outcome" onPress={saveFollowUp} />
            </View>
          </Panel>

          <Panel className="px-[22px] py-5">
            <Typography className="text-[17px] font-bold text-navy">Assigned to</Typography>
            <Typography className="text-[13.5px] text-navy font-semibold mt-2">
              {assignee ? assignee.name : 'You'}
            </Typography>
            {isAdmin && team?.length ? (
              <View className="flex-row flex-wrap gap-2 mt-3">
                {team
                  .filter((m) => m.status === 'active')
                  .map((m) => (
                    <Pill
                      key={m.id}
                      label={m.name}
                      active={m.id === lead.assignedToId}
                      onPress={() => reassign(m.id === lead.assignedToId ? null : m.id)}
                    />
                  ))}
              </View>
            ) : (
              <Typography className="text-[12px] text-label mt-2">
                Only an admin can move a lead to someone else.
              </Typography>
            )}
          </Panel>

          <Panel className="px-[22px] py-5">
            <Typography className="text-[17px] font-bold text-navy">History</Typography>
            <View className="mt-3">
              {/* Rows from lead_activity where they exist, then the two the
                  lead itself can always tell us. Nothing had ever read this
                  table before, so it is often sparse. */}
              {activity.map((a) => (
                <View key={a.id} className="flex-row gap-3 py-[9px] border-b border-hairline">
                  <View className="w-[7px] h-[7px] rounded-full bg-blue mt-[6px]" />
                  <View className="flex-1">
                    <Typography className="text-[13px] font-semibold text-navy">
                      {activityLabel(a)}
                    </Typography>
                    <Typography className="text-[11.5px] text-label mt-[1px]">
                      {new Date(a.createdAt).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </Typography>
                  </View>
                </View>
              ))}
              <View className="flex-row gap-3 py-[9px]">
                <View className="w-[7px] h-[7px] rounded-full bg-label mt-[6px]" />
                <View className="flex-1">
                  <Typography className="text-[13px] font-semibold text-navy">
                    Captured{event ? ` at ${event.name}` : ''}
                  </Typography>
                  <Typography className="text-[11.5px] text-label mt-[1px]">
                    {lead.time} · {lead.source === 'card_scan' ? 'Card scan' : 'Typed in'}
                  </Typography>
                </View>
              </View>
            </View>
          </Panel>
        </View>
      </View>
    </DashShell>
  );
}
