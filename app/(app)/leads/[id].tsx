import { useEffect, useState } from 'react';
import { Alert, Image, Linking, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { ScreenHeader } from '../../../components/app/ScreenHeader';
import { AlertCircleIcon, CheckIcon, ClockIcon, SparkleIcon, ContactsIcon, EditIcon, LockIcon, MailIcon, MicIcon, PhoneIcon, WhatsAppIcon } from '../../../components/ui/icons';
import { STATUS_CLASSES, STATUS_TEXT } from '../../../data/leads';
import { cardNeedsAttention, displayCompany, displayInitial, displayName } from '../../../lib/leadDisplay';
import { useLeadsStore } from '../../../stores/useLeadsStore';
import { useTeam } from '../../../hooks/useTeam';
import { useSessionStore } from '../../../stores/useSessionStore';
import { useEvent } from '../../../hooks/useEvents';
import { fetchEventFields } from '../../../lib/api/eventFields';
import { fetchVoiceNotes, type VoiceNote } from '../../../lib/api/voiceNotes';
import { useLeadActions } from '../../../hooks/useLeadActions';
import { VoiceNoteCard } from '../../../components/app/VoiceNoteCard';
import { ProBadge } from '../../../components/app/ProLock';
import { useProGate } from '../../../hooks/usePlan';
import { useCardImages } from '../../../hooks/useCardImages';
import { scanCardFromUrl } from '../../../lib/api/cardScan';
import { summariseCompany } from '../../../lib/api/companySummary';
import type { CustomFieldDef } from '../../../stores/useEventFieldsStore';
import { formatDateRange } from '../../../lib/dates';
import { captureLocationLine, mapsUrl } from '../../../lib/captureLocation';

/** `Follow up tomorrow`, `Follow up 4 Mar 2026`, `Follow-up overdue`. */
function followUpLabel(date: string | undefined): string | null {
  if (!date) return null;
  const due = new Date(date);
  if (Number.isNaN(due.getTime())) return null;

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(due) - startOfDay(new Date())) / 86400000);

  if (days < 0) return 'Follow-up overdue';
  if (days === 0) return 'Follow up today';
  if (days === 1) return 'Follow up tomorrow';
  return 'Follow up ' + formatDateRange(date, null);
}

export default function LeadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const leads = useLeadsStore((s) => s.leads);
  const lead = leads.find((l) => l.id === id);

  const { data: members } = useTeam();
  const isAdmin = useSessionStore((s) => s.user?.role === 'admin');
  const { locked, gate } = useProGate();

  /**
   * One lead, so the batch helper is handed a one-item list. Worth the small
   * awkwardness to keep a single path through signing: the list screen and
   * this screen then cache under the same key, so arriving here from a list
   * that has already drawn the thumbnail costs no request at all.
   */
  const cardImageUri = useCardImages(lead ? [lead] : []);
  const cardUri = lead ? cardImageUri(lead) : null;
  const extraUri = lead ? cardImageUri(lead, 'extra') : null;

  const [rereading, setRereading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);

  /**
   * Reads the company's own website and summarises what is actually on it.
   *
   * Lives on this screen rather than the edit form, deliberately. It is not a
   * field anyone types - it is something the app fetches and the rep reads
   * before a call - so it belongs where the lead is read, not where it is
   * corrected. Saved straight through `saveLeadEdits`, which means it survives
   * without the edit form having to know the field exists at all.
   *
   * Nothing is invented. With no website there is nothing to read, so the rep
   * is told exactly that rather than handed a confident paragraph about a
   * company nobody looked up.
   */
  const generateCompanySummary = async () => {
    if (!lead || summaryLoading) return;

    if (!lead.companyWebsite?.trim()) {
      Alert.alert(
        'No company website',
        'This lead has no company website, so there is nothing to read. Add one with the edit button, then try again.'
      );
      return;
    }

    setSummaryLoading(true);
    // Only a regenerate asks for a fresh read; the first press is happy with
    // whatever the team has already fetched for this domain.
    const result = await summariseCompany({
      website: lead.companyWebsite,
      companyName: lead.company,
      refresh: Boolean(lead.companySummary),
    });
    setSummaryLoading(false);

    if (!result.ok) {
      Alert.alert("Couldn't summarise", result.message);
      return;
    }
    useLeadsStore.getState().saveLeadEdits(lead.id, { companySummary: result.summary });
  };

  /**
   * Read the card again, from the copy in the bucket.
   *
   * The local photo is gone by now - the sync drain uploads it and deletes the
   * durable copy once nothing points at it - so this signs the object and sends
   * that instead. Front only: the back of the card is never uploaded, so a
   * retry has strictly less to work with than the first attempt did.
   *
   * Only ever fills blanks. If the rep has already typed a name in, that wins.
   */
  const rereadCard = async () => {
    if (!lead || rereading) return;
    const url = cardUri;
    if (!url) {
      Alert.alert('No card photo', 'There is no photo on this lead to read.');
      return;
    }

    setRereading(true);
    const result = await scanCardFromUrl(url);
    setRereading(false);

    if (!result.ok) {
      Alert.alert("Couldn't read the card", result.message);
      return;
    }
    if (!result.read) {
      Alert.alert(
        'Still nothing readable',
        'The photo does not have anything the reader can make out. Type the details in instead.'
      );
      return;
    }

    const f = result.fields;
    const fill = (current: string | undefined, next: string | null) =>
      current?.trim() ? undefined : (next ?? undefined);

    // The list form. Same rule - offer nothing where the lead already has
    // something - and never a merge of the two, which would resurrect a
    // number the rep had deleted.
    const fillList = (current: string[] | undefined, next: string[]) =>
      current && current.length > 0 ? undefined : (next.length > 0 ? next : undefined);

    const patch = {
      name: fill(lead.name, f.fullName),
      company: fill(lead.company, f.company),
      phone: fill(lead.phone, f.phone),
      email: fill(lead.email, f.email),
      designation: fill(lead.designation, f.designation),
      extraPhones: fillList(lead.extraPhones, f.extraPhones),
      extraEmails: fillList(lead.extraEmails, f.extraEmails),
      extraDesignations: fillList(lead.extraDesignations, f.extraDesignations),
      companyLandline: fill(lead.companyLandline, f.companyLandline),
      companyWebsite: fill(lead.companyWebsite, f.companyWebsite),
      companyAddress: fill(lead.companyAddress, f.companyAddress),
      branchAddress: fill(lead.branchAddress, f.branchAddress),
      extractionStatus: 'completed' as const,
    };
    // Drop the keys that had nothing to offer, so the patch writes only what
    // actually moved - the rule lib/leadEdit.ts exists to enforce.
    const trimmed = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined)
    );
    useLeadsStore.getState().saveLeadEdits(lead.id, trimmed);
  };
  const { data: event } = useEvent(lead?.eventId || undefined);

  // The same four actions the lead rows on the home and Leads screens use.
  // They lived here as local handlers while those rows had nothing but a
  // "not wired up yet" alert; sharing them is what stops the two drifting.
  const { call, whatsapp, email, saveToContacts, savedToContacts } = useLeadActions(lead);

  // The labels for this lead's answers live on the event, not the lead —
  // `custom_field_values` is keyed by field id, so without the definitions the
  // values are just a list of UUIDs.
  const [fieldDefs, setFieldDefs] = useState<CustomFieldDef[]>([]);
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  useEffect(() => {
    if (!lead?.eventId) return;
    let cancelled = false;
    fetchEventFields(lead.eventId)
      .then((defs) => {
        if (!cancelled) setFieldDefs(defs);
      })
      .catch(() => {
        /* Without them the answers are simply not shown, which beats UUIDs. */
      });
    return () => {
      cancelled = true;
    };
  }, [lead?.eventId]);

  /**
   * The recordings on this lead.
   *
   * Re-checked every few seconds only while one is still being transcribed —
   * the job takes a handful of seconds and there is nothing to push the result
   * to the device, so the screen looks again until it settles. Once every note
   * is finished the polling stops, rather than running for as long as the
   * screen is open.
   */
  const leadId = lead?.id;
  const [voicePoll, setVoicePoll] = useState(0);
  useEffect(() => {
    if (!leadId) return;
    let cancelled = false;
    fetchVoiceNotes(leadId)
      .then((notes) => {
        if (cancelled) return;
        setVoiceNotes(notes);
        const settling = notes.some(
          (n) => n.status === 'pending' || n.status === 'processing'
        );
        if (settling) {
          const timer = setTimeout(() => setVoicePoll((n) => n + 1), 4000);
          return () => clearTimeout(timer);
        }
      })
      .catch(() => {
        /* Offline: the rest of the lead still renders. */
      });
    return () => {
      cancelled = true;
    };
  }, [leadId, voicePoll]);

  // A lead can genuinely be missing now — a stale link, or one deleted on
  // another device. Falling back to `leads[0]` showed a different person's
  // details under the requested lead's address.
  if (!lead) {
    return (
      <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
        <ScreenHeader title="Lead detail" />
        <View className="flex-1 items-center justify-center px-8">
          <Typography className="text-[15px] font-bold text-navy text-center">
            This lead isn&rsquo;t here
          </Typography>
          <Typography className="text-[13px] text-slate text-center mt-2 leading-[1.5]">
            It may have been deleted, or it belongs to an event you are no longer on.
          </Typography>
          <Pressable onPress={() => router.replace('/(app)/(tabs)/leads')} className="mt-6">
            <Typography className="text-[13.5px] font-bold text-gold">Back to leads</Typography>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // An unassigned lead belongs to whoever captured it, which today is always
  // the signed-in user.
  const assignee = lead.assignedToId ? members?.find((m) => m.id === lead.assignedToId) : undefined;
  const assignedLabel = !assignee || assignee.isSelf ? 'Assigned to you' : `Assigned to ${assignee.name}`;

  const followUp = followUpLabel(lead.followUpDate);

  /**
   * The one line this screen shows about where the lead was captured: the
   * address when there is one, the coordinates when the geocode failed, and
   * null when there is no fix at all - which hides the whole block.
   */
  const whereCaptured = captureLocationLine(lead);

  const openInMaps = () => {
    if (lead.captureLatitude === undefined || lead.captureLongitude === undefined) return;
    void Linking.openURL(
      mapsUrl(lead.captureLatitude, lead.captureLongitude, whereCaptured ?? undefined, Platform.OS === 'ios')
    ).catch(() => {
      Alert.alert("Couldn't open Maps", 'No map app on this phone could open that place.');
    });
  };

  const answered = fieldDefs.filter((def) => {
    const value = lead.customFieldValues?.[def.id];
    return value !== undefined && value !== '' && value !== false;
  });

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
      <ScreenHeader
        title="Lead detail"
        right={
          // Was a Pressable with no onPress — drawn, tappable, and doing
          // nothing since the screen was built. It opens the edit form now.
          <Pressable
            onPress={() => router.push({ pathname: '/(app)/leads/edit', params: { leadId: lead.id } })}
            accessibilityRole="button"
            accessibilityLabel="Edit this lead"
            className="w-[34px] h-[34px] rounded-md bg-surface items-center justify-center"
          >
            <EditIcon />
          </Pressable>
        }
      />

      <ScrollView contentContainerClassName="px-5 pt-[18px] pb-8" showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center gap-3">
          <View className="w-[52px] h-[52px] rounded-2xl bg-gold items-center justify-center">
            <Typography className="text-[19px] font-extrabold text-navy">{displayInitial(lead)}</Typography>
          </View>
          <View>
            <Typography className="text-[17px] font-bold text-navy">{displayName(lead)}</Typography>
            <Typography className="text-[12.5px] text-slate mt-[2px]">{displayCompany(lead)}</Typography>
          </View>
        </View>

        {/*
          The card itself, in its own shape rather than cropped into the
          avatar. It was captured, uploaded and then never shown anywhere —
          the rep had no way to check what the reader had read from, which is
          the whole point of keeping the photo.

          8:5 is roughly a business card, and `contain` means an odd crop shows
          letterboxed instead of losing the edges where a phone number sits.
        */}
        {cardUri ? (
          <View className="mt-4 rounded-2xl overflow-hidden bg-surface" style={{ aspectRatio: 8 / 5 }}>
            <Image
              key={cardUri}
              source={{ uri: cardUri }}
              className="w-full h-full"
              resizeMode="contain"
            />
          </View>
        ) : null}

        {/* The product photo the rep attached at capture, if there was one.
            Below the card rather than beside it: this one is a reminder, the
            card is the record. */}
        {extraUri ? (
          <View className="mt-3">
            <Typography
              className="text-[10px] font-bold tracking-[0.12em] text-slate mb-2"
              style={{ textTransform: 'uppercase' }}
            >
              Photo
            </Typography>
            <View className="rounded-2xl overflow-hidden bg-surface" style={{ aspectRatio: 4 / 3 }}>
              <Image
                key={extraUri}
                source={{ uri: extraUri }}
                className="w-full h-full"
                resizeMode="cover"
              />
            </View>
          </View>
        ) : null}

        {/* The card was photographed but could not be read. Everything else the
            rep captured is here; only the name and number are missing, and the
            photo above is what they type them from. */}
        {cardNeedsAttention(lead) ? (
          <View className="bg-gold/[0.08] border border-gold/[0.30] rounded-2xl p-4 mt-4">
            <View className="flex-row items-center gap-2">
              <AlertCircleIcon size={14} color="#8A6100" strokeWidth={2} />
              <Typography className="text-[12.5px] font-bold text-navy">
                Card not read
              </Typography>
            </View>
            <Typography className="text-[12.5px] text-slate mt-2 leading-[1.5]">
              {lead.extractionError ??
                'The card could not be read automatically. Type the details in from the photo above.'}
            </Typography>
            <View className="flex-row gap-[10px] mt-3">
              <Pressable
                onPress={() => void rereadCard()}
                disabled={rereading}
                className={`h-10 px-4 rounded-full bg-white border border-hairline items-center justify-center ${
                  rereading ? 'opacity-60' : ''
                }`}
              >
                <Typography className="text-[12.5px] font-bold text-navy">
                  {rereading ? 'Reading\u2026' : 'Read the card again'}
                </Typography>
              </Pressable>
              <Pressable
                onPress={() =>
                  router.push({ pathname: '/(app)/leads/edit', params: { leadId: lead.id } })
                }
                className="h-10 px-4 rounded-full bg-gold items-center justify-center"
              >
                <Typography className="text-[12.5px] font-bold text-navy">
                  Add the details
                </Typography>
              </Pressable>
            </View>
          </View>
        ) : null}

        <View className="flex-row items-center gap-[10px] mt-4">
          <View className={`rounded-full px-3 py-[6px] ${STATUS_CLASSES[lead.status]}`}>
            <Typography className={`text-[11.5px] font-bold ${STATUS_TEXT[lead.status]}`}>{lead.status}</Typography>
          </View>
          {followUp ? (
            <View className="flex-row items-center gap-[5px] bg-surface rounded-full px-3 py-[6px]">
              <ClockIcon size={11} color="#0B132B" strokeWidth={2} />
              <Typography className="text-[11.5px] font-bold text-navy">{followUp}</Typography>
            </View>
          ) : null}
          {lead.syncStatus === 'draft' ? (
            <View className="rounded-full px-3 py-[6px] bg-gold/[0.16]">
              <Typography className="text-[11.5px] font-bold text-[#8A6100]">Not synced yet</Typography>
            </View>
          ) : null}
        </View>

        <View className="flex-row gap-[10px] mt-[18px]">
          <ActionButton
            icon={<PhoneIcon size={16} color="#0B132B" strokeWidth={1.75} />}
            label="Call"
            onPress={() => void call()}
          />
          <ActionButton
            icon={<WhatsAppIcon size={16} color="#25D366" strokeWidth={1.75} />}
            label="WhatsApp"
            onPress={() => void whatsapp()}
          />
          <ActionButton
            icon={<MailIcon size={16} color="#0B132B" strokeWidth={1.75} />}
            label="Email"
            onPress={() => void email()}
          />
          <ActionButton
            icon={<ContactsIcon size={16} color={savedToContacts ? '#2E9C61' : undefined} />}
            label={savedToContacts ? 'Saved' : 'Contacts'}
            active={savedToContacts}
            onPress={() => void saveToContacts()}
          />
        </View>

        {voiceNotes.map((note) => (
          <VoiceNoteCard key={note.id} note={note} />
        ))}

        {/* Recorded but not yet sent — the lead reached the server before the
            audio did, which is the normal order when a capture happens offline. */}
        {lead.localVoiceUri && !voiceNotes.length ? (
          <View className="bg-white border border-hairline rounded-2xl p-4 mt-[18px]">
            <View className="flex-row items-center gap-2">
              <MicIcon size={14} color="#0B132B" strokeWidth={2} />
              <Typography className="text-[12.5px] font-bold text-navy">Voice note</Typography>
            </View>
            <Typography className="text-[12.5px] text-slate mt-2 leading-[1.5]">
              Recorded on this device. It uploads, and gets its transcript, once you are back
              online.
            </Typography>
          </View>
        ) : null}

        {lead.voiceError ? (
          <View className="bg-white border border-hairline rounded-2xl p-4 mt-[18px]">
            <View className="flex-row items-center gap-2">
              <MicIcon size={14} color="#8A98B0" strokeWidth={2} />
              <Typography className="text-[12.5px] font-bold text-navy">
                Voice note not attached
              </Typography>
            </View>
            <Typography className="text-[12.5px] text-slate mt-2 leading-[1.5]">
              {lead.voiceError}
            </Typography>
          </View>
        ) : null}

        <View className="bg-white border border-hairline rounded-2xl p-4 mt-[18px]">
          <View className="flex-row items-center justify-between mb-[10px]">
            <Typography className="text-[12.5px] font-bold text-navy">Company summary</Typography>
            <View className="flex-row items-center gap-1 bg-blue/[0.10] rounded-full px-2 py-[3px]">
              <SparkleIcon size={10} color="#1D3F8A" />
              <Typography className="text-[9.5px] font-bold text-blue">AI</Typography>
            </View>
          </View>

          {lead.companySummary?.trim() ? (
            <>
              <Typography className="text-[13px] leading-[1.5] text-navy">
                {lead.companySummary}
              </Typography>
              <Pressable
                onPress={() => void generateCompanySummary()}
                disabled={summaryLoading}
                className="mt-2"
              >
                <Typography className="text-[12px] font-bold text-gold">
                  {summaryLoading ? 'Fetching\u2026' : 'Regenerate'}
                </Typography>
              </Pressable>
            </>
          ) : (
            <Pressable
              onPress={() => void generateCompanySummary()}
              disabled={summaryLoading}
              className={`h-11 rounded-md border border-dashed border-hairline items-center justify-center flex-row gap-2 ${
                summaryLoading ? 'opacity-60' : ''
              }`}
            >
              {summaryLoading ? (
                <Typography className="text-[13px] font-semibold text-slate">
                  Fetching company info&#8230;
                </Typography>
              ) : (
                <>
                  <SparkleIcon size={14} color="#0B132B" />
                  <Typography className="text-[13px] font-semibold text-navy">
                    Get AI company summary
                  </Typography>
                </>
              )}
            </Pressable>
          )}
        </View>

        {lead.note?.trim() ? (
          <View className="bg-white border border-hairline rounded-2xl p-4 mt-[18px]">
            <Typography className="text-[12.5px] font-bold text-navy mb-2">Note</Typography>
            <Typography className="text-[12.5px] font-medium text-navy" style={{ lineHeight: 19 }}>
              {lead.note}
            </Typography>
          </View>
        ) : null}

        <View className="bg-white border border-hairline rounded-2xl p-4 mt-[18px]">
          <Typography className="text-[12.5px] font-bold text-navy mb-2">Captured details</Typography>

          <Typography className="text-[10px] font-bold tracking-[0.1em] text-blue mt-1 mb-1" style={{ textTransform: 'uppercase' }}>
            Personal
          </Typography>
          <FieldRow k="Name" v={lead.name} />
          <FieldRow k="Phone" v={lead.phone || 'Not captured'} />
          {/* Numbered rather than repeated under one heading, so two rows
              never read as the same fact stated twice. */}
          {(lead.extraPhones ?? []).map((number, i) => (
            <FieldRow key={`phone-${i}`} k={`Phone ${i + 2}`} v={number} />
          ))}
          <FieldRow k="Email" v={lead.email || 'Not captured'} />
          {(lead.extraEmails ?? []).map((address, i) => (
            <FieldRow key={`email-${i}`} k={`Email ${i + 2}`} v={address} />
          ))}
          <View className="flex-row justify-between py-[10px] border-b border-section">
            <Typography className="text-[12.5px] text-slate">Consent</Typography>
            <View className="flex-row items-center gap-[8px]">
              {lead.consentGiven ? <CheckIcon size={14} color="#2E9C61" strokeWidth={2.5} /> : null}
              <Typography className="text-[12.5px] font-bold text-navy">
                {lead.consentGiven ? 'Given' : 'Not given'}
              </Typography>
            </View>
          </View>

          <Typography className="text-[10px] font-bold tracking-[0.1em] text-blue mt-3 mb-1" style={{ textTransform: 'uppercase' }}>
            Company
          </Typography>
          <FieldRow k="Company" v={lead.company || 'Not captured'} />
          {lead.designation ? <FieldRow k="Designation" v={lead.designation} /> : null}
          {(lead.extraDesignations ?? []).map((title, i) => (
            <FieldRow key={`title-${i}`} k={`Designation ${i + 2}`} v={title} />
          ))}
          {lead.companyWebsite ? <FieldRow k="Website" v={lead.companyWebsite} /> : null}
          {lead.companyLandline ? <FieldRow k="Landline" v={lead.companyLandline} /> : null}
          {lead.companyAddress ? <FieldRow k="Address" v={lead.companyAddress} /> : null}

          {answered.length ? (
            <>
              <Typography className="text-[10px] font-bold tracking-[0.1em] text-blue mt-3 mb-1" style={{ textTransform: 'uppercase' }}>
                This event
              </Typography>
              {answered.map((def) => {
                const value = lead.customFieldValues?.[def.id];
                return (
                  <FieldRow
                    key={def.id}
                    k={def.name}
                    v={typeof value === 'boolean' ? 'Yes' : String(value)}
                  />
                );
              })}
            </>
          ) : null}
        </View>

        <View className="bg-white border border-hairline rounded-2xl p-4 mt-[18px]">
          <Typography className="text-[12.5px] font-bold text-navy mb-[14px]">Activity</Typography>
          {/* Derived from the lead itself. The full history lives in
              `lead_activity`, which nothing writes to yet — inventing entries
              here would be worse than showing only the two facts we know. */}
          <View className="gap-[14px]">
            {lead.status !== 'New' ? (
              <TimelineRow text={'Marked ' + lead.status} time="" active />
            ) : null}
            <TimelineRow
              text={'Captured' + (event ? ' at ' + event.name : '')}
              time={lead.time}
            />
          </View>
        </View>

        {/*
          Where the rep was standing when they captured this - PENDING.md 43.

          THE WHOLE BLOCK IS ABSENT when there is no location, rather than
          present and empty. A capture never waits for a GPS fix, so a lead
          without one is ordinary rather than incomplete, and so is every lead
          captured before this feature existed - nothing is ever backfilled. A
          row reading "Not captured" on all of them would turn a normal lead
          into a reproach.

          `captureLocationLine` also covers the middle case: a fix arrived and
          the geocode failed on its own, so the coordinates are shown instead of
          the address. That is a normal lead too and looks like one.
        */}
        {whereCaptured ? (
          <View className="bg-white border border-hairline rounded-2xl p-4 mt-[18px]">
            <Typography className="text-[12.5px] font-bold text-navy mb-2">
              Where this was captured
            </Typography>
            <Typography className="text-[12.5px] font-medium text-navy" style={{ lineHeight: 19 }}>
              {whereCaptured}
            </Typography>
            {/*
              The phone's own map app, which costs nothing and needs no library,
              no key and no billing. That is the whole reason this screen shows
              an address and not an embedded map.
            */}
            <Pressable onPress={openInMaps} className="mt-2" hitSlop={6}>
              <Typography className="text-[12px] font-bold text-gold">Open in Maps</Typography>
            </Pressable>
          </View>
        ) : null}

        {/*
          Reassigning is an admin action (PENDING.md #6). A rep sees who the
          lead belongs to but cannot move it — including off their own name.
        */}
        <Pressable
          disabled={!isAdmin}
          onPress={() => {
            if (gate('reassign')) router.push(`/(app)/(modals)/reassign?leadId=${lead.id}`);
          }}
          className="flex-row items-center justify-between mt-[18px] bg-white border border-hairline rounded-md px-4 py-[14px]"
        >
          <Typography className="text-[13px] font-semibold text-navy">{assignedLabel}</Typography>
          {/*
            The lock replaces the "Reassign" affordance rather than joining it.
            On Free there is only one person in the organisation, so the row is
            still worth showing — it says who holds the lead — but nothing on it
            should read as an action that will work.
          */}
          {!isAdmin ? null : locked ? (
            <ProBadge />
          ) : (
            <Typography className="text-[12px] font-bold text-gold">Reassign</Typography>
          )}
        </Pressable>
      </ScrollView>

      <View className="bg-white border-t border-hairline flex-row gap-[10px] px-5 pt-[14px] pb-6">
        {/*
          Status stays in the footer at full size on Free. It is one of the two
          things this screen is for, and shrinking or moving it would make the
          plan rearrange the furniture rather than just mark what is paid.
        */}
        <Pressable
          onPress={() => {
            if (gate('lead-status')) router.push(`/(app)/(modals)/status-change?leadId=${lead.id}`);
          }}
          className="flex-1 h-[52px] rounded-md bg-white border border-hairline items-center justify-center flex-row gap-[6px]"
        >
          {locked ? <LockIcon size={13} color="#5A6B85" strokeWidth={2.2} /> : null}
          <Typography className={`text-[14px] font-bold text-navy ${locked ? 'opacity-60' : ''}`}>
            Change status
          </Typography>
        </Pressable>
        <Pressable
          onPress={() => router.push('/(app)/(modals)/log-outcome')}
          className="flex-1 h-[52px] rounded-md bg-gold items-center justify-center"
        >
          <Typography className="text-[14px] font-bold text-navy">Log outcome</Typography>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  /** Done-state treatment, reusing the voice-note button's green from capture. */
  active?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 h-14 rounded-md border items-center justify-center gap-1 ${
        active ? 'border-success bg-success/[0.08]' : 'bg-white border-hairline'
      }`}
    >
      {icon}
      <Typography className={`text-[10px] font-bold ${active ? 'text-[#2E9C61]' : 'text-navy'}`}>
        {label}
      </Typography>
    </Pressable>
  );
}

function FieldRow({ k, v }: { k: string; v: string }) {
  return (
    <View className="flex-row justify-between py-[10px] border-b border-section">
      <Typography className="text-[12.5px] text-slate">{k}</Typography>
      <Typography className="text-[12.5px] font-bold text-navy">{v}</Typography>
    </View>
  );
}

function TimelineRow({ text, time, active }: { text: string; time: string; active?: boolean }) {
  return (
    <View className="flex-row gap-[10px]">
      <View className={`w-[7px] h-[7px] rounded-full mt-[5px] ${active ? 'bg-gold' : 'bg-hairline'}`} />
      <View>
        <Typography className="text-[12.5px] font-medium text-navy" style={{ lineHeight: 17.5 }}>
          {text}
        </Typography>
        <Typography className="text-[11px] text-slate mt-[1px]">{time}</Typography>
      </View>
    </View>
  );
}
