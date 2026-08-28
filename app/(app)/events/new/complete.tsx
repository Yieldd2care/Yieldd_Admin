import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../../../../components/ui/Typography';
import { Button } from '../../../../components/ui/Button';
import { NavyGlowBackdrop } from '../../../../components/app/NavyGlowBackdrop';
import { CheckIcon, WifiIcon } from '../../../../components/ui/icons';
import {
  draftTotalCost,
  formatDateRange,
  useEventDraftStore,
} from '../../../../stores/useEventDraftStore';
import { useEvent } from '../../../../hooks/useEvents';
import { fetchEventInvites } from '../../../../lib/api/invites';

export default function EventSetupCompleteScreen() {
  // Read one field at a time rather than deriving inside a selector — a
  // selector that builds a new array or object returns a fresh reference on
  // every render and loops.
  const draftName = useEventDraftStore((s) => s.name);
  const draftCity = useEventDraftStore((s) => s.city);
  const startDate = useEventDraftStore((s) => s.startDate);
  const endDate = useEventDraftStore((s) => s.endDate);
  const costs = useEventDraftStore((s) => s.costs);
  const invitedReps = useEventDraftStore((s) => s.invitedReps);
  const eventId = useEventDraftStore((s) => s.eventId);

  // The saved row is the truth; the draft is the fallback for the moment
  // before it arrives, and for a wizard that never reached the database.
  const { data: saved } = useEvent(eventId ?? undefined);

  const [inviteCount, setInviteCount] = useState<number | null>(null);
  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    fetchEventInvites(eventId)
      .then((rows) => {
        if (!cancelled) setInviteCount(rows.filter((i) => i.status !== 'revoked').length);
      })
      .catch(() => {
        /* Falls back to what the wizard recorded. */
      });
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const name = saved?.name || draftName;
  const city = saved?.city || draftCity;
  const totalCost = saved ? saved.totalCost : draftTotalCost(costs);
  const dates = saved
    ? formatDateRange(saved.startDate, saved.endDate)
    : formatDateRange(startDate, endDate);
  const repCount = inviteCount ?? invitedReps.length;

  // Every row shows what was actually submitted (PENDING.md #3). A step that
  // was skipped says so plainly rather than borrowing an example value —
  // "₹0" would read as a real answer, and "not added yet" is the truth.
  const summary = [
    { label: 'EVENT', value: [name, city].filter(Boolean).join(' · ') || 'Not named yet' },
    { label: 'DATES', value: dates || 'Not set' },
    {
      label: 'TEAM',
      value:
        repCount === 0
          ? 'No reps invited yet'
          : `${repCount} rep${repCount === 1 ? '' : 's'} invited`,
    },
    {
      label: 'EVENT COST',
      value: totalCost > 0 ? `₹${totalCost.toLocaleString('en-IN')}` : 'Not added yet',
    },
  ];

  const goHome = () => {
    // The draft has served its purpose. Leaving it behind would pre-fill the
    // next event with this one's answers.
    useEventDraftStore.getState().reset();
    router.replace('/(app)');
  };

  return (
    <SafeAreaView className="flex-1 bg-navy" edges={['top', 'bottom']}>
      <NavyGlowBackdrop />
      <ScrollView contentContainerClassName="items-center px-8 pt-[76px]" showsVerticalScrollIndicator={false}>
        <View className="w-[76px] h-[76px] rounded-full bg-gold items-center justify-center">
          <CheckIcon />
        </View>
        <Typography className="mt-6 text-[25px] font-extrabold tracking-[-0.01em] text-white text-center leading-[1.28]">
          {name ? `You're set up for\n${name}` : "You're all set up"}
        </Typography>
        <Typography className="mt-[10px] text-[14px] text-white/[0.62] text-center leading-[1.5] max-w-[270px]">
          Your team can start scanning the moment they sign in &mdash; nothing here needs a network.
        </Typography>

        <View className="w-full bg-white/[0.05] border border-white/[0.12] rounded-lg mt-8 overflow-hidden">
          {summary.map((row, i) => (
            <View
              key={row.label}
              className={`flex-row items-center justify-between gap-4 px-[18px] py-[14px] ${
                i < summary.length - 1 ? 'border-b border-white/[0.08]' : ''
              }`}
            >
              <Typography className="text-[12.5px] text-white/[0.55]">{row.label}</Typography>
              <Typography className="text-[13.5px] font-bold text-white flex-1 text-right">
                {row.value}
              </Typography>
            </View>
          ))}
        </View>

        <View className="flex-row items-center gap-2 mt-5">
          <WifiIcon size={14} color="#F4B000" />
          <Typography className="text-[12.5px] font-semibold text-gold">Works fully offline from here on</Typography>
        </View>
      </ScrollView>

      <View className="items-center gap-[14px] px-8 pb-8 pt-4">
        <Button label="Go to home" shape="pill" onPress={goHome} className="w-full" />
        <Pressable onPress={() => router.push('/(app)/events/new/invite')}>
          <Typography className="text-[13px] font-semibold text-white/[0.75]">Invite more reps</Typography>
        </Pressable>
        <Pressable onPress={() => router.push('/(app)/events/new')}>
          <Typography className="text-[13px] font-semibold text-white/[0.75]">Edit event details</Typography>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
