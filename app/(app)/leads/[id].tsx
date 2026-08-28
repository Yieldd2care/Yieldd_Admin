import { Alert, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { ScreenHeader } from '../../../components/app/ScreenHeader';
import { CheckIcon, ClockIcon, ContactsIcon, EditIcon, MailIcon, PhoneIcon, PlayIcon, WhatsAppIcon } from '../../../components/ui/icons';
import { STATUS_CLASSES, STATUS_TEXT } from '../../../data/leads';
import { useLeadsStore } from '../../../stores/useLeadsStore';
import { useTeamStore } from '../../../stores/useTeamStore';
import { useSessionStore } from '../../../stores/useSessionStore';

const MINI_WAVE = [6, 10, 8, 16, 9, 20, 12, 7, 14, 10, 18, 8, 11, 16, 7, 13, 19, 9, 10, 15, 6, 12, 17, 8];

export default function LeadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const leads = useLeadsStore((s) => s.leads);
  const lead = leads.find((l) => l.id === id) ?? leads[0];

  const members = useTeamStore((s) => s.members);
  const isAdmin = useSessionStore((s) => s.user?.role === 'admin');

  // An unassigned lead belongs to whoever captured it, which today is always
  // the signed-in user.
  const assignee = lead.assignedToId ? members.find((m) => m.id === lead.assignedToId) : undefined;
  const assignedLabel = !assignee || assignee.isSelf ? 'Assigned to you' : `Assigned to ${assignee.name}`;

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
          <View className="flex-row items-center gap-[5px] bg-surface rounded-full px-3 py-[6px]">
            <ClockIcon size={11} color="#0B132B" strokeWidth={2} />
            <Typography className="text-[11.5px] font-bold text-navy">Follow up tomorrow</Typography>
          </View>
        </View>

        <View className="flex-row gap-[10px] mt-[18px]">
          <ActionButton
            icon={<PhoneIcon size={16} color="#0B132B" strokeWidth={1.75} />}
            label="Call"
            onPress={() => Alert.alert('Call', "Calling isn't wired up yet.")}
          />
          <ActionButton
            icon={<WhatsAppIcon size={16} color="#25D366" strokeWidth={1.75} />}
            label="WhatsApp"
            onPress={() => Alert.alert('WhatsApp', "Messaging isn't wired up yet.")}
          />
          <ActionButton
            icon={<MailIcon size={16} color="#0B132B" strokeWidth={1.75} />}
            label="Email"
            onPress={() => Alert.alert('Email', "Email isn't wired up yet.")}
          />
          <ActionButton
            icon={<ContactsIcon size={16} />}
            label="Contacts"
            onPress={() => Alert.alert('Contacts', "Saving to contacts isn't wired up yet.")}
          />
        </View>

        <View className="bg-white border border-hairline rounded-2xl p-4 mt-[18px]">
          <Typography className="text-[12.5px] font-bold text-navy mb-3">Voice note</Typography>
          <View className="flex-row items-center gap-3">
            <View className="w-[38px] h-[38px] rounded-full bg-navy items-center justify-center">
              <PlayIcon size={13} />
            </View>
            <View className="flex-1 flex-row items-center gap-[2px] h-6">
              {MINI_WAVE.map((h, i) => (
                <View key={i} className={`w-[3px] rounded-[2px] ${h > 12 ? 'bg-gold' : 'bg-surface'}`} style={{ height: h }} />
              ))}
            </View>
            <Typography className="text-[11px] font-bold text-slate">0:14</Typography>
          </View>
          <Pressable onPress={() => Alert.alert('Transcript', "Full transcript view isn't wired up yet.")}>
            <Typography className="text-[12px] font-bold text-blue mt-3">View full transcript</Typography>
          </Pressable>
          <View className="bg-section rounded-[10px] px-[14px] py-3 mt-[10px]">
            <Typography className="text-[12.5px] font-medium text-navy" style={{ lineHeight: 19 }}>
              Evaluating three vendors for the new plant line &mdash; wants a formal quote with lead times by next week.
            </Typography>
          </View>
        </View>

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
              <CheckIcon size={14} color="#2E9C61" strokeWidth={2.5} />
              <Typography className="text-[12.5px] font-bold text-navy">Given</Typography>
            </View>
          </View>

          <Typography className="text-[10px] font-bold tracking-[0.1em] text-blue mt-3 mb-1" style={{ textTransform: 'uppercase' }}>
            Company
          </Typography>
          <FieldRow k="Company" v={lead.company || 'Not captured'} />
          <View className="flex-row justify-between py-[10px]">
            <Typography className="text-[12.5px] text-slate">Product interest</Typography>
            <Typography className="text-[12.5px] font-bold text-navy">Precision castings</Typography>
          </View>
        </View>

        <View className="bg-white border border-hairline rounded-2xl p-4 mt-[18px]">
          <Typography className="text-[12.5px] font-bold text-navy mb-[14px]">Activity</Typography>
          <View className="gap-[14px]">
            <TimelineRow text="Marked Qualified by you" time="Today, 6:48 PM" active />
            <TimelineRow text="Captured by you at IMTEX 2026" time="Today, 4:12 PM" />
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
          onPress={() => router.push('/(app)/(modals)/status-change')}
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
