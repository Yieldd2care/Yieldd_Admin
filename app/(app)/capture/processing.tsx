import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Network from 'expo-network';

import { Typography } from '../../../components/ui/Typography';
import { useLeadsStore } from '../../../stores/useLeadsStore';
import { useSessionStore } from '../../../stores/useSessionStore';
import { onlineFromState } from '../../../lib/connectivity';

/**
 * The short wait between Submit and the lead existing.
 *
 * It watches the outbox; it does no work of its own. `addLead()` has already
 * saved everything to the device and kicked off a drain, so by the time this
 * screen mounts the capture is safe whatever happens next. All that is left to
 * decide is how long to stand here before getting out of the rep's way.
 *
 * ---------------------------------------------------------------------------
 * It must not spin when it cannot succeed
 *
 * "Reading the card…" is a lie with no signal — nothing is being read, and
 * nothing will be until the phone is back on a network. So connectivity is
 * checked and the offline case says what is actually true and leaves quickly.
 * A screen that cannot succeed should never hold someone.
 *
 * ---------------------------------------------------------------------------
 * The nudges at 3s and 6s
 *
 * `syncDrafts` returns immediately if a drain is already running, and the tail
 * recursion that normally covers that is guarded on something having reached
 * the server. Two cards scanned back to back can therefore leave the second one
 * sitting until the next trigger. These two calls are a bounded, local push;
 * they touch nothing the shared loop guard owns.
 */

/** Long enough for a card read on a decent connection, short enough not to trap. */
const HARD_CAP_MS = 6000;
const OFFLINE_DWELL_MS = 1500;

export default function ProcessingScreen() {
  const { leadId } = useLocalSearchParams<{ leadId?: string }>();
  const userId = useSessionStore((s) => s.user?.id);

  const lead = useLeadsStore((s) => s.leads).find((l) => l.id === leadId);
  const isSyncing = useLeadsStore((s) => s.isSyncing);

  const netState = Network.useNetworkState();
  const isOnline = onlineFromState(netState);

  const [gaveUp, setGaveUp] = useState(false);
  const left = useRef(false);

  // One exit, used by every path, so two of them cannot fire at once.
  const leave = useRef((id: string) => {
    if (left.current) return;
    left.current = true;
    router.replace({ pathname: '/(app)/capture/saved', params: { leadId: id } });
  }).current;

  /**
   * A lead that is no longer a draft has reached the server, whether or not its
   * card could be read. Either way there is nothing more to wait for here — the
   * saved screen says which of the two happened.
   */
  useEffect(() => {
    if (!leadId) return;
    if (lead && lead.syncStatus === 'synced') leave(leadId);
  }, [lead, leadId, leave]);

  // Offline: say so, pause just long enough to be read, and go.
  useEffect(() => {
    if (!leadId || isOnline) return;
    const timer = setTimeout(() => leave(leadId), OFFLINE_DWELL_MS);
    return () => clearTimeout(timer);
  }, [isOnline, leadId, leave]);

  // The hard cap, and the two nudges on the way to it.
  useEffect(() => {
    if (!leadId) return;

    const nudge = setTimeout(() => {
      if (!left.current && !useLeadsStore.getState().isSyncing) {
        void useLeadsStore.getState().syncDrafts(userId);
      }
    }, 3000);

    const cap = setTimeout(() => {
      setGaveUp(true);
      leave(leadId);
    }, HARD_CAP_MS);

    return () => {
      clearTimeout(nudge);
      clearTimeout(cap);
    };
  }, [leadId, userId, leave]);

  // A leadId that matches nothing means this screen was reached by a route the
  // capture flow did not create. Nothing to watch, so do not sit here.
  useEffect(() => {
    if (!leadId) router.replace('/(app)/(tabs)');
  }, [leadId]);

  const preview = lead?.localImageUri;

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
      <View className="flex-1 items-center justify-center px-9 gap-6">
        <View
          className="w-[168px] rounded-md overflow-hidden bg-navy"
          style={{ aspectRatio: 8 / 5 }}
        >
          {preview ? (
            <Image source={{ uri: preview }} className="w-full h-full" resizeMode="contain" />
          ) : null}
        </View>

        <View className="items-center gap-3">
          {isOnline && !gaveUp ? <ActivityIndicator size="small" color="#F4B000" /> : null}

          <Typography className="text-[16px] font-extrabold text-navy text-center">
            {isOnline ? 'Reading the card…' : 'Saved to this phone'}
          </Typography>

          <Typography className="text-[13px] text-slate text-center leading-[1.55]">
            {isOnline
              ? 'This takes a few seconds. Please make sure you have an internet connection.'
              : "We'll read the card and send the lead as soon as you're back online. Nothing is lost."}
          </Typography>
        </View>

        {/* Deliberately quiet. The capture is already safe on the device, so a
            slow read is not a problem the rep has to do anything about — and
            saying so loudly would suggest otherwise. */}
        {isSyncing && isOnline ? (
          <Typography className="text-[11.5px] text-placeholder text-center">
            Sending…
          </Typography>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
