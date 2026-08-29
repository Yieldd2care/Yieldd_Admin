import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { ScreenHeader } from '../../../components/app/ScreenHeader';
import { CheckIcon, ClockIcon, ContactsIcon, EditIcon, MailIcon, MicIcon, PhoneIcon, WhatsAppIcon } from '../../../components/ui/icons';
import { STATUS_CLASSES, STATUS_TEXT } from '../../../data/leads';
import { useLeadsStore } from '../../../stores/useLeadsStore';
import { useTeam } from '../../../hooks/useTeam';
import { useSessionStore } from '../../../stores/useSessionStore';
import { useEvent } from '../../../hooks/useEvents';
import { fetchEventFields } from '../../../lib/api/eventFields';
import { fetchVoiceNotes, type VoiceNote } from '../../../lib/api/voiceNotes';
import { useEventTemplate } from '../../../hooks/useMessageTemplates';
import { openDialer, openEmail, openWhatsApp, renderTemplate } from '../../../lib/messaging';
import { recordSend } from '../../../lib/api/messageSends';
import { VoiceNoteCard } from '../../../components/app/VoiceNoteCard';
import type { CustomFieldDef } from '../../../stores/useEventFieldsStore';
import { formatDateRange } from '../../../lib/dates';

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
  const { data: event } = useEvent(lead?.eventId || undefined);
  const user = useSessionStore((s) => s.user);
  const { template: whatsappTemplate } = useEventTemplate(lead?.eventId || undefined, 'whatsapp');
  const { template: emailTemplate } = useEventTemplate(lead?.eventId || undefined, 'email');

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

  /**
   * Opens the rep's own WhatsApp with the lead's chat and the event's template
   * already typed. Nothing is sent by the app — the rep presses send — so the
   * record below says the draft was opened, not that it was delivered.
   */
  const sendWhatsApp = async () => {
    const body = whatsappTemplate?.body ?? 'Hi {{name}}, great meeting you at {{event}}.';
    const message = renderTemplate(body, {
      name: lead.name,
      company: lead.company,
      event: event?.name,
      sender: user?.name,
      senderCompany: user?.company,
    });

    const outcome = await openWhatsApp(lead.phone, message);
    if (!outcome.ok) {
      Alert.alert('Cannot open WhatsApp', outcome.message);
      return;
    }
    if (user) {
      void recordSend({
        leadId: lead.id,
        sentBy: user.id,
        channel: 'whatsapp',
        templateUsed: whatsappTemplate?.name,
        templateId: whatsappTemplate?.id,
        status: 'sent',
      });
    }
  };

  const sendEmail = async () => {
    if (!lead.email?.trim()) {
      Alert.alert('No email', 'This lead was captured without an email address.');
      return;
    }
    const body = emailTemplate?.body ?? 'Hi {{name}}, thank you for stopping by our stall.';
    const context = {
      name: lead.name,
      company: lead.company,
      event: event?.name,
      sender: user?.name,
      senderCompany: user?.company,
    };

    const outcome = await openEmail(
      lead.email,
      renderTemplate(emailTemplate?.subject ?? 'Great meeting you at {{event}}', context),
      renderTemplate(body, context)
    );
    if (!outcome.ok) {
      Alert.alert('Cannot open mail', outcome.message);
      return;
    }
    if (user) {
      void recordSend({
        leadId: lead.id,
        sentBy: user.id,
        channel: 'email',
        templateUsed: emailTemplate?.name,
        templateId: emailTemplate?.id,
        status: 'sent',
      });
    }
  };

  const followUp = followUpLabel(lead.followUpDate);
  const answered = fieldDefs.filter((def) => {
    const value = lead.customFieldValues?.[def.id];
    return value !== undefined && value !== '' && value !== false;
  });

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
      <ScreenHeader
        title="Lead detail"
        right={
          <Pressable className="w-[34px] h-[34px] rounded-md bg-surface items-center justify-center">
            <EditIcon />
          </Pressable>
        }
      />

      <ScrollView contentContainerClassName="px-5 pt-[18px] pb-8" showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center gap-3">
          <View className="w-[52px] h-[52px] rounded-2xl bg-gold items-center justify-center">
            <Typography className="text-[19px] font-extrabold text-navy">{lead.initial}</Typography>
          </View>
          <View>
            <Typography className="text-[17px] font-bold text-navy">{lead.name}</Typography>
            <Typography className="text-[12.5px] text-slate mt-[2px]">{lead.company || 'No company'}</Typography>
          </View>
        </View>

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
            onPress={async () => {
              const outcome = await openDialer(lead.phone);
              if (!outcome.ok) Alert.alert('Cannot call', outcome.message);
            }}
          />
          <ActionButton
            icon={<WhatsAppIcon size={16} color="#25D366" strokeWidth={1.75} />}
            label="WhatsApp"
            onPress={() => void sendWhatsApp()}
          />
          <ActionButton
            icon={<MailIcon size={16} color="#0B132B" strokeWidth={1.75} />}
            label="Email"
            onPress={() => void sendEmail()}
          />
          <ActionButton
            icon={<ContactsIcon size={16} />}
            label="Contacts"
            onPress={() => Alert.alert('Contacts', "Saving to your phone's contacts isn't built yet.")}
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
          <FieldRow k="Email" v={lead.email || 'Not captured'} />
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
          Reassigning is an admin action (PENDING.md #6). A rep sees who the
          lead belongs to but cannot move it — including off their own name.
        */}
        <Pressable
          disabled={!isAdmin}
          onPress={() => router.push(`/(app)/(modals)/reassign?leadId=${lead.id}`)}
          className="flex-row items-center justify-between mt-[18px] bg-white border border-hairline rounded-md px-4 py-[14px]"
        >
          <Typography className="text-[13px] font-semibold text-navy">{assignedLabel}</Typography>
          {isAdmin ? (
            <Typography className="text-[12px] font-bold text-gold">Reassign</Typography>
          ) : null}
        </Pressable>
      </ScrollView>

      <View className="bg-white border-t border-hairline flex-row gap-[10px] px-5 pt-[14px] pb-6">
        <Pressable
          onPress={() => router.push(`/(app)/(modals)/status-change?leadId=${lead.id}`)}
          className="flex-1 h-[52px] rounded-md bg-white border border-hairline items-center justify-center"
        >
          <Typography className="text-[14px] font-bold text-navy">Change status</Typography>
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

function ActionButton({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="flex-1 h-14 rounded-md bg-white border border-hairline items-center justify-center gap-1">
      {icon}
      <Typography className="text-[10px] font-bold text-navy">{label}</Typography>
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
