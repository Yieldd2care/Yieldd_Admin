import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { RadialGlow } from '../../../components/ui/RadialGlow';
import { AlertCircleIcon, CheckIcon, EditIcon } from '../../../components/ui/icons';
import { useLeadsStore } from '../../../stores/useLeadsStore';
import { useCurrentEvent } from '../../../hooks/useEvents';

/**
 * The two seconds after a capture.
 *
 * Keyed on `leadId` rather than a name passed through the route, because under
 * the new flow there IS no name at the moment this screen is pushed — the card
 * is read in the sync drain, and the answer can land while this is on screen.
 * Reading the lead out of the store means the headline fills itself in.
 *
 * Three outcomes, not two. The old screen knew about "saved" and "saved as a
 * draft"; a card the reader could not make sense of is now a third, and it is
 * the one that needs the rep to do something — so it says so and offers the
 * way to fix it rather than dissolving after two seconds.
 */
export default function SaveConfirmationScreen() {
  const { leadId } = useLocalSearchParams<{ leadId?: string }>();
  const { event } = useCurrentEvent();

  // Read the raw list and count outside the selector — filtering inside one
  // returns a fresh array every render and loops.
  const allLeads = useLeadsStore((s) => s.leads);
  const lead = allLeads.find((l) => l.id === leadId);

  const draftSaved = lead ? lead.syncStatus === 'draft' : false;
  const unread = lead?.extractionStatus === 'failed';
  const name = lead?.name?.trim();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const leadCount = allLeads.filter(
    (l) =>
      (!event || l.eventId === event.id) && new Date(l.capturedAt).getTime() >= startOfDay.getTime()
  ).length;

  /**
   * An unread card does not auto-dismiss.
   *
   * Everything else here is a confirmation the rep can ignore, so it gets out
   * of the way on its own. This one is a request — the details have to be typed
   * by someone — and sliding it away after two seconds would be how it never
   * gets done.
   */
  useEffect(() => {
    if (unread) return;
    const t = setTimeout(() => {
      router.replace('/(app)/(tabs)');
    }, 2200);
    return () => clearTimeout(t);
  }, [unread]);

  return (
    <SafeAreaView className="flex-1 bg-navy" edges={['top', 'bottom']}>
      <RadialGlow
        color={unread ? '#8A6100' : '#F4B000'}
        size={480}
        style={{ top: -200, left: '50%', marginLeft: -240, opacity: 0.6 }}
      />

      <View className="flex-1 items-center justify-center px-9">
        <View className="w-[84px] h-[84px] rounded-full bg-gold items-center justify-center shadow-[0_16px_36px_rgba(244,176,0,0.38)]">
          {unread ? (
            <AlertCircleIcon size={34} color="#0B132B" strokeWidth={2.5} />
          ) : (
            <CheckIcon size={34} color="#0B132B" strokeWidth={2.5} />
          )}
        </View>

        <Typography
          className="text-[27px] font-extrabold text-white text-center mt-[26px]"
          style={{ lineHeight: 32 }}
        >
          {unread ? 'Saved — card not read' : name ? `${name} saved` : 'Lead saved'}
        </Typography>

        <Typography className="text-[14px] text-white/[0.60] font-medium mt-2 text-center">
          {unread
            ? 'Everything else was kept'
            : draftSaved
              ? "Saved offline — will sync once you're back online"
              : 'Enriched, tagged, and ready to follow up'}
        </Typography>

        {unread ? (
          <View className="bg-white/[0.06] border border-white/[0.10] rounded-2xl px-6 py-[16px] mt-[34px]">
            <Typography className="text-[12.5px] text-white/[0.75]" style={{ lineHeight: 18 }}>
              The photo, your voice note and the event fields are all saved. Only the name and
              number could not be read off the card — add them when you get a minute.
            </Typography>
          </View>
        ) : draftSaved ? (
          <View className="flex-row items-center gap-[10px] bg-gold/[0.14] border border-gold/[0.35] rounded-2xl px-6 py-[14px] mt-[34px]">
            <View className="w-9 h-9 rounded-full bg-gold/[0.2] items-center justify-center">
              <EditIcon size={16} color="#F4B000" strokeWidth={2} />
            </View>
            <Typography
              className="text-[12.5px] font-semibold text-gold flex-1"
              style={{ lineHeight: 17 }}
            >
              Saved as a draft. It&apos;ll move into your leads automatically once you&apos;re back
              online.
            </Typography>
          </View>
        ) : (
          <View className="flex-row items-center gap-4 bg-white/[0.06] border border-white/[0.10] rounded-2xl px-7 py-[18px] mt-[34px]">
            <Typography className="text-[30px] font-extrabold text-gold tracking-[-0.01em]">
              {leadCount}
            </Typography>
            {/* This used to read "today at IMTEX 2026" — a design placeholder
                that shipped, and printed the same show name at every event. */}
            <Typography className="text-[12.5px] text-white/[0.65]" style={{ lineHeight: 17 }}>
              leads captured{'\n'}
              {event?.name ? `today at ${event.name}` : 'today'}
            </Typography>
          </View>
        )}

        {!unread ? (
          <Typography className="text-[12.5px] font-semibold text-white/[0.50] mt-10">
            Returning to scan&#8230;
          </Typography>
        ) : null}
      </View>

      <Pressable
        onPress={() =>
          router.replace(
            unread && leadId
              ? { pathname: '/(app)/leads/edit', params: { leadId } }
              : '/(app)/(tabs)/leads'
          )
        }
        className="items-center pb-11"
      >
        <Typography className="text-[13.5px] font-bold text-gold">
          {unread ? 'Add the details' : 'View leads'}
        </Typography>
      </Pressable>
    </SafeAreaView>
  );
}
