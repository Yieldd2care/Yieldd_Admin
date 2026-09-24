import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { RadialGlow } from '../../../components/ui/RadialGlow';
import { AlertCircleIcon, CheckIcon, EditIcon } from '../../../components/ui/icons';
import { useLeadsStore } from '../../../stores/useLeadsStore';
import { useSessionStore } from '../../../stores/useSessionStore';
import { useCurrentEvent } from '../../../hooks/useEvents';
import { formatRelative } from '../../../lib/dates';

/**
 * The two seconds after a capture.
 *
 * Keyed on `leadId` rather than a name passed through the route, because under
 * the new flow there IS no name at the moment this screen is pushed — the card
 * is read in the sync drain, and the answer can land while this is on screen.
 * Reading the lead out of the store means the headline fills itself in.
 *
 * Four outcomes, not two. The old screen knew about "saved" and "saved as a
 * draft"; a card the reader could not make sense of is a third, and a capture
 * of somebody already at this show is the fourth. The last two both need the
 * rep to do something — so they say so and offer the way to deal with it rather
 * than dissolving after two seconds.
 *
 * The duplicate question can only be asked HERE, and only for a card scan. The
 * scan path has no field for the rep to type a number into, so nothing knows
 * the person is a repeat until the card has been read in the sync drain — which
 * is after the lead has been queued. `processing` waits for the row to land
 * before pushing this screen, and the flag is set just before that insert, so
 * online the answer is already here by the time this mounts. Offline it is not,
 * and that case is covered by the badge on the lead instead.
 */
export default function SaveConfirmationScreen() {
  const { leadId } = useLocalSearchParams<{ leadId?: string }>();
  const { event } = useCurrentEvent();

  // Read the raw list and count outside the selector — filtering inside one
  // returns a fresh array every render and loops.
  const allLeads = useLeadsStore((s) => s.leads);
  const lead = allLeads.find((l) => l.id === leadId);

  const userId = useSessionStore((s) => s.user?.id);

  const draftSaved = lead ? lead.syncStatus === 'draft' : false;
  const unread = lead?.extractionStatus === 'failed';
  const name = lead?.name?.trim();

  /**
   * Whether to stop and ask "keep it or remove it?".
   *
   * `source === 'card_scan'` — a manual duplicate was already answered, at the
   * confirmation before it was written. Asking a second time would be nagging,
   * and leaving it out keeps the manual path's behaviour here identical to what
   * it has always been.
   *
   * `syncStatus === 'synced'` — Remove has nothing to delete until the row
   * exists.
   *
   * `!unread` — a card that could not be read has no trustworthy number, so it
   * should never reach a match at all. In practice it cannot: the check runs
   * inside the branch where the scan succeeded AND produced a phone. But that
   * argument leans on `extract-card`, which deploys separately, and asking a
   * rep to permanently delete a lead on the strength of a match we do not
   * trust is the worst thing this screen could do. So if both ever held at
   * once, unread wins and the lead simply keeps its badge.
   */
  const isDuplicate =
    Boolean(lead?.duplicateOfLeadId) &&
    lead?.source === 'card_scan' &&
    lead?.syncStatus === 'synced' &&
    !unread;

  const [answered, setAnswered] = useState(false);
  const [removeStep, setRemoveStep] = useState<'ask' | 'confirm'>('ask');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const asking = isDuplicate && !answered;
  const holding = unread || asking;

  const match = lead?.duplicateMatch;
  const isSelf = Boolean(match && match.capturedById === userId);
  const alert = unread || asking;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const leadCount = allLeads.filter(
    (l) =>
      (!event || l.eventId === event.id) && new Date(l.capturedAt).getTime() >= startOfDay.getTime()
  ).length;

  /**
   * An unread card does not auto-dismiss, and neither does an unanswered
   * duplicate.
   *
   * Everything else here is a confirmation the rep can ignore, so it gets out
   * of the way on its own. These two are requests — the details have to be
   * typed by someone, the duplicate has to be kept or removed — and sliding
   * them away after two seconds would be how they never get done.
   *
   * Keep is therefore not a special path, it is the REMOVAL of a hold: it flips
   * `answered`, `holding` goes false, this effect re-runs and the ordinary
   * 2200ms dismissal happens exactly as it always has.
   */
  useEffect(() => {
    if (holding) return;
    const t = setTimeout(() => {
      router.replace('/(app)/(tabs)');
    }, 2200);
    return () => clearTimeout(t);
  }, [holding]);

  return (
    <SafeAreaView className="flex-1 bg-navy" edges={['top', 'bottom']}>
      <StatusBar style="light" />
      <RadialGlow
        color={alert ? '#8A6100' : '#F4B000'}
        size={480}
        style={{ top: -200, left: '50%', marginLeft: -240, opacity: 0.6 }}
      />

      <View className="flex-1 items-center justify-center px-9">
        <View className="w-[84px] h-[84px] rounded-full bg-gold items-center justify-center shadow-[0_16px_36px_rgba(244,176,0,0.38)]">
          {alert ? (
            <AlertCircleIcon size={34} color="#0B132B" strokeWidth={2.5} />
          ) : (
            <CheckIcon size={34} color="#0B132B" strokeWidth={2.5} />
          )}
        </View>

        <Typography
          className="text-[27px] font-extrabold text-white text-center mt-[26px]"
          style={{ lineHeight: 32 }}
        >
          {unread
            ? 'Saved, card not read'
            : asking
              ? isSelf
                ? 'You already had this contact'
                : 'Already captured at this show'
              : name
                ? `${name} saved`
                : 'Lead saved'}
        </Typography>

        <Typography className="text-[14px] text-white/[0.60] font-medium mt-2 text-center">
          {unread
            ? 'Everything else was kept'
            : asking
              ? isSelf
                ? `This is your second capture of ${name || 'this contact'}.`
                : match
                  ? `${match.capturedByName} captured ${name || 'them'} ${formatRelative(match.capturedAt)}.`
                  : 'This contact was already captured at this show.'
              : draftSaved
                ? "Saved offline, will sync once you're back online"
                : 'Enriched, tagged, and ready to follow up'}
        </Typography>

        {asking ? (
          /**
           * Inline rather than a modal. This screen is already a full-screen
           * decision surface, it has no keyboard and no ScrollView, and
           * stacking a transient modal over a transient confirmation reads as
           * two things dismissing at once.
           *
           * Remove takes two taps and Keep takes one, deliberately. Keep is the
           * safe answer and should be frictionless; deleting something
           * permanently while a customer is standing in front of you should not
           * be one mis-tap.
           */
          <View className="w-full bg-white/[0.06] border border-white/[0.10] rounded-2xl px-6 py-[18px] mt-[34px]">
            <Typography className="text-[12.5px] text-white/[0.75]" style={{ lineHeight: 18 }}>
              {removeStep === 'ask'
                ? isSelf
                  ? 'Removing deletes this new capture; the earlier one stays.'
                  : 'Keeping it is fine \u2014 two reps can have different conversations. Removing deletes this new capture; the earlier one stays.'
                : 'Remove this lead? This cannot be undone.'}
            </Typography>

            {error ? (
              <Typography
                className="text-[12.5px] font-semibold text-[#FF9B9B] mt-3"
                style={{ lineHeight: 17 }}
              >
                {error}
              </Typography>
            ) : null}

            <View className="flex-row gap-3 mt-4">
              {removeStep === 'ask' ? (
                <>
                  <Pressable
                    onPress={() => setAnswered(true)}
                    className="flex-1 rounded-md py-[13px] items-center bg-gold shadow-[0_10px_26px_rgba(244,176,0,0.34)]"
                  >
                    <Typography className="text-[13px] font-bold text-navy">Keep it</Typography>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setError(null);
                      setRemoveStep('confirm');
                    }}
                    className="flex-1 rounded-md py-[13px] items-center border border-white/[0.22] shadow-[0_10px_26px_rgba(244,176,0,0)]"
                  >
                    <Typography className="text-[13px] font-semibold text-white/[0.85]">
                      Remove this one
                    </Typography>
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable
                    onPress={async () => {
                      if (!leadId || busy) return;
                      setBusy(true);
                      setError(null);
                      const r = await useLeadsStore.getState().removeLead(leadId, userId);
                      setBusy(false);
                      if (!r.ok) {
                        // Never navigate away from a removal that did not
                        // happen. The lead is still in their leads, and the
                        // message says exactly that.
                        setError(r.message ?? 'That lead could not be removed.');
                        setRemoveStep('ask');
                        return;
                      }
                      // The scan tab, where the auto-dismiss goes - not the
                      // leads tab, which would send them hunting for a lead
                      // that is not there.
                      router.replace('/(app)/(tabs)');
                    }}
                    disabled={busy}
                    className={`flex-1 rounded-md py-[13px] items-center bg-[#C23B3B] shadow-[0_10px_26px_rgba(244,176,0,0)] ${
                      busy ? 'opacity-40' : ''
                    }`}
                  >
                    <Typography className="text-[13px] font-bold text-white">
                      {busy ? 'Removing\u2026' : 'Yes, remove'}
                    </Typography>
                  </Pressable>
                  <Pressable
                    onPress={() => setAnswered(true)}
                    className="flex-1 rounded-md py-[13px] items-center bg-gold shadow-[0_10px_26px_rgba(244,176,0,0.34)]"
                  >
                    <Typography className="text-[13px] font-bold text-navy">Keep it</Typography>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        ) : unread ? (
          <View className="bg-white/[0.06] border border-white/[0.10] rounded-2xl px-6 py-[16px] mt-[34px]">
            <Typography className="text-[12.5px] text-white/[0.75]" style={{ lineHeight: 18 }}>
              The photo, your voice note and the event fields are all saved. Only the name and
              number could not be read off the card. Add them when you get a minute.
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

        {!holding ? (
          <Typography className="text-[12.5px] font-semibold text-white/[0.50] mt-10">
            Returning to scan&#8230;
          </Typography>
        ) : null}
      </View>

      {/* Hidden while the duplicate question is up: no third way out that
          leaves it unanswered. Hardware back still works and is equivalent to
          Keep, which is the safe default. */}
      {asking ? null : (
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
      )}
    </SafeAreaView>
  );
}
