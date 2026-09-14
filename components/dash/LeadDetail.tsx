import { useEffect, useMemo, useState } from 'react';
import { Pressable, TextInput as RNTextInput, View } from 'react-native';

import { DashShell } from '../dash/DashShell';
import { Cap, Empty, GhostButton, GoldButton, Panel, Pill, StatusChip, TempChip } from '../dash/primitives';
import { Avatar, Icon, ICON, QuickAction } from '../dash/controls';
import { Typography } from '../ui/Typography';
import { DateField } from '../app/DateField';
import { useLeadsStore } from '../../stores/useLeadsStore';
import { useSessionStore } from '../../stores/useSessionStore';
import { useEvent } from '../../hooks/useEvents';
import { useTeam } from '../../hooks/useTeam';
import { useLeadActions } from '../../hooks/useLeadActions';
import { fetchEventFields } from '../../lib/api/eventFields';
import { fetchVoiceNotes, type VoiceNote } from '../../lib/api/voiceNotes';
import { fetchSendCounts } from '../../lib/api/messageSends';
import { summariseCompany } from '../../lib/api/companySummary';
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

function Field({ label, value, href }: { label: string; value: string | null | undefined; href?: string }) {
  return (
    <View className="py-[10px] border-b border-hairline">
      <Cap>{label}</Cap>
      {value && href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
          <Typography className="text-[14px] mt-1 font-medium text-blue">{value}</Typography>
        </a>
      ) : (
        <Typography className={`text-[14px] mt-1 ${value ? 'text-navy font-medium' : 'text-placeholder'}`}>
          {value || 'Not captured'}
        </Typography>
      )}
    </View>
  );
}

/**
 * A details column with its own enrichment button.
 *
 * Split into Person and Company — Habsy's one structural idea worth taking —
 * because they are enriched separately and from different sources. What the
 * card says about the person comes off the card; what we can say about the
 * company comes off that company's website, costs an API call, and is
 * therefore something the rep asks for rather than something that happens.
 */
function DetailColumn({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View className="flex-1 min-w-0">
      <View className="flex-row items-center justify-between h-[34px]">
        <View className="flex-row items-center gap-[7px]">
          <Icon d={icon} size={13} color="#8A98B0" />
          <Cap>{title}</Cap>
        </View>
        {action}
      </View>
      <View className="mt-1">{children}</View>
    </View>
  );
}

/**
 * Kept out of the route file so it can be rendered on its own.
 * `app/(dash)/leads/[id].tsx` is a three-line wrapper that reads the param —
 * the brackets in that filename make it unimportable from anywhere else.
 */
export function LeadDetail({ leadId }: { leadId: string }) {
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
  const [sends, setSends] = useState<{ whatsapp: number; email: number }>({ whatsapp: 0, email: 0 });
  const [copied, setCopied] = useState(false);

  // The company summary, asked for rather than fetched on open.
  const [summarising, setSummarising] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

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
    fetchSendCounts(leadId).then((c) => !off && setSends(c)).catch(() => {});
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

  /** Calls logged as outcomes. Counted, not guessed — an untouched lead shows no number at all. */
  const callCount = useMemo(() => activity.filter((a) => a.type === 'outcome_logged').length, [activity]);
  const noteCount = useMemo(() => activity.filter((a) => a.type === 'note_added').length, [activity]);

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

  /**
   * Read the company's own website and write a paragraph about it.
   *
   * A button rather than something that happens on open: it is a network call
   * per lead, and on a list of four hundred that would be four hundred calls
   * nobody asked for.
   */
  async function enrichCompany() {
    if (!lead?.companyWebsite || summarising) return;
    setSummarising(true);
    setSummaryError(null);
    const result = await summariseCompany({
      website: lead.companyWebsite,
      companyName: lead.company || undefined,
      refresh: Boolean(lead.companySummary),
    });
    setSummarising(false);
    if (result.ok) {
      useLeadsStore.getState().editLead(lead.id, { companySummary: result.summary } as never);
      void useLeadsStore.getState().syncDrafts(user?.id);
    } else {
      setSummaryError(result.message);
    }
  }

  const capturedLine = [
    lead.time,
    lead.source === 'card_scan' ? 'Card scan' : 'Typed in',
    event ? event.name : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <DashShell
      title={lead.name || 'Unnamed lead'}
      subtitle={[lead.designation, lead.company].filter(Boolean).join(' at ') || undefined}
      breadcrumb={[{ label: 'Leads', href: '/(dash)/leads' }]}
      actions={
        <GhostButton
          label={copied ? 'Copied' : 'Copy message'}
          onPress={async () => {
            if (await copy(actions.whatsappText)) {
              setCopied(true);
              globalThis.setTimeout(() => setCopied(false), 2000);
            }
          }}
        />
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

      {/* The identity strip, then the actions. Habsy puts a dozen icon buttons
          in one row; these are the five things a rep actually does, each
          carrying how many times it has already been done. */}
      <Panel className="px-[22px] py-[18px]">
        <View className="flex-row items-center gap-[14px]">
          <Avatar name={lead.name} size={52} tone="navy" />
          <View className="flex-1 min-w-0">
            <View className="flex-row items-center gap-[10px]">
              <Typography className="text-[19px] font-extrabold text-navy tracking-tight" numberOfLines={1}>
                {lead.name || 'Unnamed lead'}
              </Typography>
              <StatusChip value={lead.status} />
              <TempChip value={lead.temperature} />
            </View>
            <Typography className="text-[13px] text-slate mt-[2px]" numberOfLines={1}>
              {[lead.designation, lead.company].filter(Boolean).join(' at ') || 'No company captured'}
            </Typography>
            <Typography className="text-[11.5px] text-label mt-[3px]" numberOfLines={1}>
              {capturedLine}
              {lead.syncStatus === 'draft' ? ' · not synced yet' : ''}
            </Typography>
          </View>
        </View>

        <View className="flex-row flex-wrap gap-2 mt-[18px] pt-[16px] border-t border-hairline">
          <QuickAction
            label="WhatsApp"
            icon={ICON.whatsapp}
            count={sends.whatsapp}
            tone="gold"
            href={actions.canWhatsApp ? actions.whatsappHref : undefined}
            disabled={!actions.canWhatsApp}
            onPress={() => {
              actions.noteWhatsAppOpened();
              setSends((s) => ({ ...s, whatsapp: s.whatsapp + 1 }));
            }}
          />
          <QuickAction
            label="Call"
            icon={ICON.phone}
            count={callCount}
            href={lead.phone ? `tel:${lead.phone.replace(/\s/g, '')}` : undefined}
            disabled={!actions.canCall}
          />
          <QuickAction
            label="Email"
            icon={ICON.mail}
            count={sends.email}
            href={lead.email ? `mailto:${lead.email}` : undefined}
            disabled={!actions.canEmail}
            onPress={() => setSends((s) => ({ ...s, email: s.email + 1 }))}
          />
          <QuickAction label="Save contact" icon={ICON.user} onPress={() => void actions.saveToContacts()} />
          {noteCount ? (
            <View className="flex-row items-center gap-[7px] px-[13px] py-[9px]">
              <Icon d={ICON.note} size={14} color="#8A98B0" />
              <Typography className="text-[12.5px] font-medium text-slate">
                {noteCount} {noteCount === 1 ? 'note' : 'notes'}
              </Typography>
            </View>
          ) : null}
        </View>
      </Panel>

      <View className="flex-row gap-4 items-start mt-4">
        <View className="flex-[1.2] gap-4">
          <Panel className="px-[22px] py-5">
            <Typography className="text-[17px] font-bold text-navy">Contact details</Typography>

            <View className="flex-row gap-6 mt-3">
              <DetailColumn title="Person" icon={ICON.user}>
                <Field label="Phone" value={lead.phone} href={lead.phone ? `tel:${lead.phone}` : undefined} />
                <Field label="Email" value={lead.email} href={lead.email ? `mailto:${lead.email}` : undefined} />
                <Field label="Designation" value={lead.designation} />
                <View className="py-[10px]">
                  <Cap>Consent to follow up</Cap>
                  <Typography className="text-[14px] font-medium text-navy mt-1">
                    {lead.consentGiven ? 'Given at the stall' : 'Not recorded'}
                  </Typography>
                </View>
              </DetailColumn>

              <DetailColumn
                title="Company"
                icon={ICON.building}
                action={
                  lead.companyWebsite ? (
                    <Pressable
                      onPress={() => void enrichCompany()}
                      disabled={summarising}
                      className={`flex-row items-center gap-[6px] rounded-sm border border-hairline bg-white px-[10px] py-[5px] ${
                        summarising ? 'opacity-50' : ''
                      }`}
                    >
                      <Icon d={ICON.sparkle} size={12} color="#F4B000" />
                      <Typography className="text-[11.5px] font-bold text-navy">
                        {summarising ? 'Reading…' : lead.companySummary ? 'Refresh' : 'Enrich'}
                      </Typography>
                    </Pressable>
                  ) : null
                }
              >
                <Field label="Company" value={lead.company} />
                <Field
                  label="Website"
                  value={lead.companyWebsite}
                  href={lead.companyWebsite ?? undefined}
                />
                <Field label="Landline" value={lead.companyLandline} />
                <Field label="Address" value={lead.companyAddress} />
                {lead.branchAddress ? <Field label="Branch address" value={lead.branchAddress} /> : null}
              </DetailColumn>
            </View>

            {summaryError ? (
              <Typography className="text-[12.5px] font-semibold text-[#C23B3B] mt-3">{summaryError}</Typography>
            ) : null}

            {lead.companySummary ? (
              <View className="mt-4 pt-4 border-t border-hairline">
                <View className="flex-row items-center gap-[7px]">
                  <Icon d={ICON.sparkle} size={13} color="#F4B000" />
                  <Cap>About the company</Cap>
                </View>
                <Typography className="text-[13px] text-ink-muted leading-[1.6] mt-2">
                  {lead.companySummary}
                </Typography>
                <Typography className="text-[11px] text-label mt-2">
                  Written from the company&apos;s own website. Check anything you are going to quote.
                </Typography>
              </View>
            ) : null}
          </Panel>

          {answered.length ? (
            <Panel className="px-[22px] pb-3">
              <Typography className="text-[17px] font-bold text-navy pt-5">Answers from this event</Typography>
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
                    <Typography className="text-[12.5px] text-slate leading-[1.6] mt-2">{v.transcript}</Typography>
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
            <View className="flex-row items-center gap-[10px] mt-3">
              <Avatar name={assignee ? assignee.name : user?.name} size={30} tone="surface" />
              <Typography className="text-[13.5px] text-navy font-semibold">
                {assignee ? assignee.name : 'You'}
              </Typography>
            </View>
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
                    <Typography className="text-[13px] font-semibold text-navy">{activityLabel(a)}</Typography>
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
