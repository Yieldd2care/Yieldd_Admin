import { useState } from 'react';
import { Pressable, TextInput as RNTextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { SheetShell } from '../../../components/app/SheetShell';
import { DateField } from '../../../components/app/DateField';
import { CheckIcon, PhoneIcon } from '../../../components/ui/icons';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { useLeadsStore } from '../../../stores/useLeadsStore';
import { useSessionStore } from '../../../stores/useSessionStore';
import { logLeadActivity, OUTCOME_FROM_LABEL } from '../../../lib/api/leadActivity';
import { toDateOnly } from '../../../lib/dates';

type Outcome = 'Connected' | 'No answer' | 'Not interested' | 'Meeting set';
const OUTCOMES: Outcome[] = ['Connected', 'No answer', 'Not interested', 'Meeting set'];
const DATES = ['Tomorrow', 'In 3 days', 'Next week', 'Custom'] as const;

/** Turns a chip into an actual calendar day. */
function dateFromChoice(choice: (typeof DATES)[number], custom: Date | null): Date | null {
  if (choice === 'Custom') return custom;
  const days = choice === 'Tomorrow' ? 1 : choice === 'In 3 days' ? 3 : 7;
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function OutcomeIcon({ outcome, active }: { outcome: Outcome; active: boolean }) {
  const color = active ? '#0B132B' : '#5A6B87';
  if (outcome === 'Connected') return <PhoneIcon size={16} color={color} strokeWidth={2} />;
  if (outcome === 'No answer')
    return (
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45 12.7 12.7 0 002.81.53 2 2 0 011.72 2v3.5a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.06 4.18 2 2 0 014.11 2h3.5a2 2 0 012 1.72c.11.86.31 1.9.53 2.81a2 2 0 01-.45 2.11z" />
        <Line x1="23" y1="1" x2="1" y2="23" />
      </Svg>
    );
  if (outcome === 'Not interested')
    return (
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Circle cx="12" cy="12" r="10" />
        <Path d="M15 9l-6 6M9 9l6 6" />
      </Svg>
    );
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="4" width="18" height="18" rx="2" />
      <Path d="M16 2v4M8 2v4M3 10h18" />
      <Circle cx="12" cy="15" r="2" />
    </Svg>
  );
}

export default function LogOutcomeModal() {
  const { leadId } = useLocalSearchParams<{ leadId?: string }>();
  const leads = useLeadsStore((s) => s.leads);
  const lead = leads.find((l) => l.id === leadId);
  const user = useSessionStore((s) => s.user);

  const [outcome, setOutcome] = useState<Outcome>('Connected');
  // Starts from whatever note the lead already carries, not from an invented
  // sentence about reviewing a quote by Friday.
  const [note, setNote] = useState(lead?.note ?? '');
  // Nothing preselected: a chip that is already active writes a follow-up date
  // the rep never chose, and then the follow-up list is full of dates nobody set.
  const [date, setDate] = useState<(typeof DATES)[number] | null>(null);
  const [customDate, setCustomDate] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const save = async () => {
    if (isSaving) return;
    setIsSaving(true);

    const next = date ? dateFromChoice(date, customDate) : null;

    if (leadId) {
      useLeadsStore.getState().editLead(leadId, {
        ...(note.trim() !== (lead?.note ?? '') ? { note } : {}),
        ...(next ? { followUpDate: toDateOnly(next) } : {}),
      });
      void useLeadsStore.getState().syncDrafts(user?.id);

      // History is best-effort. The lead's own fields are what the app reads,
      // so a lost entry must never cost the rep the outcome they just logged.
      if (user) {
        void logLeadActivity({
          leadId,
          actorId: user.id,
          type: 'outcome_logged',
          outcome: OUTCOME_FROM_LABEL[outcome],
          metadata: next ? { follow_up_date: toDateOnly(next) } : {},
        });
      }
    }

    router.back();
  };

  return (
    <SheetShell>
      <Typography className="text-[19px] font-bold text-navy">Log outcome</Typography>
      <Typography className="text-[12.5px] text-slate mt-[5px]">
        {lead ? [lead.name, lead.company].filter(Boolean).join(' · ') : 'This lead'}
      </Typography>

      <View className="gap-[10px] mt-5">
        {OUTCOMES.map((o) => {
          const active = outcome === o;
          return (
            <Pressable
              key={o}
              onPress={() => setOutcome(o)}
              className={`flex-row items-center gap-3 border-[1.5px] rounded-md px-4 py-[14px] ${active ? 'border-gold bg-gold/[0.06]' : 'border-hairline'}`}
            >
              <View className={`w-9 h-9 rounded-[10px] items-center justify-center ${active ? 'bg-gold' : 'bg-surface'}`}>
                <OutcomeIcon outcome={o} active={active} />
              </View>
              <Typography className="text-[13.5px] font-bold text-navy flex-1">{o}</Typography>
              {active ? <CheckIcon size={18} color="#F4B000" strokeWidth={2.5} /> : null}
            </Pressable>
          );
        })}
      </View>

      <Typography className="text-[10px] font-bold tracking-[0.12em] text-slate mt-[22px] mb-[10px]" style={{ textTransform: 'uppercase' }}>
        Note (optional)
      </Typography>
      <RNTextInput
        value={note}
        onChangeText={setNote}
        multiline
        className="border border-hairline rounded-md p-[14px] text-[13.5px] text-navy"
        style={{ minHeight: 64, textAlignVertical: 'top' }}
      />

      <Typography className="text-[10px] font-bold tracking-[0.12em] text-slate mt-[14px] mb-[10px]" style={{ textTransform: 'uppercase' }}>
        Next follow-up
      </Typography>
      <View className="flex-row flex-wrap gap-2">
        {DATES.map((d) => (
          <Pressable
            key={d}
            onPress={() => setDate(date === d ? null : d)}
            className={`rounded-full px-[14px] py-[9px] ${date === d ? 'bg-navy' : 'bg-surface'}`}
          >
            <Typography className={`text-[12.5px] font-semibold ${date === d ? 'text-white' : 'text-navy'}`}>{d}</Typography>
          </Pressable>
        ))}
      </View>

      {date === 'Custom' ? (
        <View className="mt-3">
          <DateField
            label="Follow-up date"
            value={customDate}
            placeholder="Pick a day"
            minDate={new Date()}
            onChange={setCustomDate}
          />
        </View>
      ) : null}

      <Pressable
        onPress={save}
        disabled={isSaving}
        className={`h-[54px] rounded-md bg-gold items-center justify-center mt-6 ${isSaving ? 'opacity-60' : ''}`}
      >
        <Typography className="text-[16px] font-bold text-navy">
          {isSaving ? 'Saving…' : 'Save'}
        </Typography>
      </Pressable>
    </SheetShell>
  );
}
