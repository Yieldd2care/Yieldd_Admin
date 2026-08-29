import { useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput as RNTextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { DateField } from '../../../components/app/DateField';
import { ChevronLeftIcon } from '../../../components/ui/icons';
import { useLeadsStore } from '../../../stores/useLeadsStore';
import { useSessionStore } from '../../../stores/useSessionStore';
import { useCurrentEvent } from '../../../hooks/useEvents';
import { toDateOnly } from '../../../lib/dates';
import type { LeadTemperature } from '../../../data/leads';

/**
 * The end-of-day pass over everyone captured today.
 *
 * The point of the screen is that four seconds at the stall is not enough to
 * record why a conversation mattered — so this is where the note gets written,
 * while the day is still fresh. It walks the leads captured today that have
 * not been through it yet.
 *
 * `reviewed_at` is what makes it resumable. A rep who gets through nine of
 * fourteen and closes the app comes back to the remaining five, rather than
 * starting again — which is the difference between a habit and a chore
 * abandoned halfway.
 */

const DATES = ['Tomorrow', 'In 3 days', 'Next week', 'Custom'] as const;
type DateChoice = (typeof DATES)[number];

function dateFromChoice(choice: DateChoice, custom: Date | null): Date | null {
  if (choice === 'Custom') return custom;
  const days = choice === 'Tomorrow' ? 1 : choice === 'In 3 days' ? 3 : 7;
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function startOfToday(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

export default function EveningReviewScreen() {
  const allLeads = useLeadsStore((s) => s.leads);
  const userId = useSessionStore((s) => s.user?.id);
  const { event } = useCurrentEvent();

  const today = startOfToday();
  const capturedToday = useMemo(
    () =>
      allLeads.filter(
        (l) =>
          new Date(l.capturedAt).getTime() >= today &&
          (!event || !l.eventId || l.eventId === event.id)
      ),
    [allLeads, today, event]
  );

  // The queue is fixed when the screen opens. Recomputing it as each lead is
  // marked reviewed would make the list shrink under the rep's hands and the
  // "9 of 14" counter jump around.
  const [queue] = useState(() =>
    allLeads
      .filter(
        (l) =>
          new Date(l.capturedAt).getTime() >= startOfToday() && !l.reviewedAt
      )
      .map((l) => l.id)
  );

  const [index, setIndex] = useState(0);
  const [note, setNote] = useState('');
  const [temperature, setTemperature] = useState<LeadTemperature | null>(null);
  const [dateChoice, setDateChoice] = useState<DateChoice | null>(null);
  const [customDate, setCustomDate] = useState<Date | null>(null);

  const leadId = queue[index];
  const lead = allLeads.find((l) => l.id === leadId);
  const total = queue.length;
  const needsNoteCount = capturedToday.filter((l) => l.needsNote).length;

  const resetForm = () => {
    setNote('');
    setTemperature(null);
    setDateChoice(null);
    setCustomDate(null);
  };

  const advance = () => {
    resetForm();
    setIndex((i) => i + 1);
  };

  const save = () => {
    if (!lead) return advance();

    const followUp = dateChoice ? dateFromChoice(dateChoice, customDate) : null;

    useLeadsStore.getState().editLead(lead.id, {
      ...(note.trim() ? { note } : {}),
      ...(temperature ? { temperature } : {}),
      ...(followUp ? { followUpDate: toDateOnly(followUp) } : {}),
      // Marked reviewed whether or not anything was typed — "I have looked at
      // this one" is exactly what the flag records, and without it the lead
      // comes back tomorrow night.
      reviewedAt: new Date().toISOString(),
    });
    void useLeadsStore.getState().syncDrafts(userId);
    advance();
  };

  const skip = () => {
    // Skip leaves reviewed_at alone, so it is offered again next time. That is
    // the difference between "not now" and "nothing to add".
    advance();
  };

  if (!total) {
    return (
      <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
        <View className="flex-1 items-center justify-center px-9">
          <Typography className="text-[19px] font-extrabold text-navy text-center">
            Nothing to review
          </Typography>
          <Typography className="text-[13.5px] text-slate text-center mt-3 leading-[1.55] max-w-[280px]">
            {capturedToday.length
              ? "You've been through everyone captured today."
              : 'Leads captured today show up here so you can add what you talked about while it is fresh.'}
          </Typography>
          <Pressable onPress={() => router.back()} className="bg-gold rounded-full px-7 py-3 mt-7">
            <Typography className="text-[14.5px] font-bold text-navy">Done</Typography>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (index >= total || !lead) {
    const reviewed = total - (total - index);
    return (
      <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
        <View className="flex-1 items-center justify-center px-9">
          <Typography className="text-[22px] font-extrabold text-navy text-center">
            That&rsquo;s the day done
          </Typography>
          <Typography className="text-[13.5px] text-slate text-center mt-3 leading-[1.55] max-w-[290px]">
            {reviewed} lead{reviewed === 1 ? '' : 's'} reviewed. Anything you skipped will be waiting
            here next time.
          </Typography>
          <Pressable
            onPress={() => router.replace('/(app)/(tabs)/leads')}
            className="bg-gold rounded-full px-7 py-3 mt-7"
          >
            <Typography className="text-[14.5px] font-bold text-navy">Back to leads</Typography>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between px-5 pt-[18px] pb-4">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            className="w-[34px] h-[34px] rounded-md bg-surface items-center justify-center"
          >
            <ChevronLeftIcon />
          </Pressable>
          <Typography className="text-[19px] font-bold text-navy">Evening review</Typography>
        </View>
        <Pressable onPress={() => router.back()}>
          <Typography className="text-[13px] font-bold text-slate">Exit</Typography>
        </Pressable>
      </View>

      <View className="flex-row items-center gap-[14px] bg-white border-b border-hairline px-5 pt-[14px] pb-[18px]">
        <Stat num={String(capturedToday.length)} label="captured today" />
        <View className="w-px h-8 bg-hairline" />
        <Stat num={String(needsNoteCount)} label="need a note" gold />
        <View className="w-px h-8 bg-hairline" />
        <Stat num={`${total - index} of ${total}`} label="remaining" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pt-[22px] pb-6"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="bg-white border border-hairline rounded-[18px] p-5">
          <View className="flex-row items-center gap-3">
            <View className="w-11 h-11 rounded-xl bg-gold items-center justify-center">
              <Typography className="text-[16px] font-extrabold text-navy">{lead.initial}</Typography>
            </View>
            <View className="flex-1">
              <Typography className="text-[16px] font-bold text-navy">{lead.name}</Typography>
              <Typography className="text-[11.5px] text-slate mt-[2px]">
                {[lead.designation, lead.company].filter(Boolean).join(' · ') || 'No company captured'}
              </Typography>
            </View>
            <Typography className="text-[11.5px] text-slate">{lead.time}</Typography>
          </View>

          <Typography className="text-[12px] font-bold tracking-[0.04em] text-slate mt-5 mb-2" style={{ textTransform: 'uppercase' }}>
            What did you talk about?
          </Typography>
          <RNTextInput
            value={note}
            onChangeText={setNote}
            multiline
            placeholder={lead.note ? 'Replace the existing note…' : 'Add a note…'}
            placeholderTextColor="#97A3B8"
            className="border border-hairline rounded-md p-[14px] text-[13.5px] text-navy bg-section"
            style={{ minHeight: 76, textAlignVertical: 'top' }}
          />
          {lead.note ? (
            <Typography className="text-[11.5px] text-slate mt-2 leading-[1.45]">
              Currently: {lead.note}
            </Typography>
          ) : null}

          <Typography className="text-[12px] font-bold tracking-[0.04em] text-slate mt-5 mb-2" style={{ textTransform: 'uppercase' }}>
            Mark as
          </Typography>
          <View className="flex-row gap-2">
            {(['Hot', 'Warm', 'Cold'] as LeadTemperature[]).map((t) => (
              <Pressable
                key={t}
                onPress={() => setTemperature((current) => (current === t ? null : t))}
                className={`flex-1 h-11 rounded-md items-center justify-center border ${temperature === t ? 'bg-gold border-gold' : 'border-hairline'}`}
              >
                <Typography className={`text-[13px] font-bold ${temperature === t ? 'text-navy' : 'text-slate'}`}>
                  {t}
                </Typography>
              </Pressable>
            ))}
          </View>

          <Typography className="text-[12px] font-bold tracking-[0.04em] text-slate mt-5 mb-2" style={{ textTransform: 'uppercase' }}>
            Follow up
          </Typography>
          <View className="flex-row flex-wrap gap-2">
            {DATES.map((d) => (
              <Pressable
                key={d}
                onPress={() => setDateChoice((current) => (current === d ? null : d))}
                className={`rounded-full px-[14px] py-[9px] ${dateChoice === d ? 'bg-navy' : 'bg-surface'}`}
              >
                <Typography className={`text-[12.5px] font-semibold ${dateChoice === d ? 'text-white' : 'text-navy'}`}>
                  {d}
                </Typography>
              </Pressable>
            ))}
          </View>

          {dateChoice === 'Custom' ? (
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

          <View className="flex-row gap-[10px] pt-[22px]">
            <Pressable
              onPress={skip}
              className="flex-1 h-[50px] rounded-md bg-white border border-hairline items-center justify-center"
            >
              <Typography className="text-[14px] font-bold text-navy">Skip</Typography>
            </Pressable>
            <Pressable
              onPress={save}
              className="flex-[2] h-[50px] rounded-md bg-gold items-center justify-center shadow-[0_8px_20px_rgba(244,176,0,0.28)]"
            >
              <Typography className="text-[14.5px] font-bold text-navy">
                {index === total - 1 ? 'Save and finish' : 'Save and next'}
              </Typography>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ num, label, gold }: { num: string; label: string; gold?: boolean }) {
  return (
    <View className="flex-1">
      <Typography className={`text-[22px] font-extrabold tracking-[-0.01em] ${gold ? 'text-gold' : 'text-navy'}`}>
        {num}
      </Typography>
      <Typography className="text-[11.5px] text-slate mt-[1px]">{label}</Typography>
    </View>
  );
}
