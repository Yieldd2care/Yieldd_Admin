import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import * as Network from 'expo-network';
import { onlineManager } from '@tanstack/react-query';

import { isOnline } from '../lib/connectivity';
import { useLeadsStore } from '../stores/useLeadsStore';
import { useSessionStore } from '../stores/useSessionStore';

/**
 * Notices when the phone comes back online, and drains the outbox when it does.
 *
 * This replaces a four-second `setInterval` poll that lived inline in the root
 * layout, plus a second identical copy in the drafts screen. Two reasons it had
 * to change: 21,600 wake-ups an hour on a device whose entire purpose is to be
 * carried around a trade show all day, and up to four seconds of latency on the
 * one event that actually matters.
 *
 * ---------------------------------------------------------------------------
 * Three triggers, and the two slow ones are not redundant
 *
 *   1. `addNetworkStateListener` - the fast path, fires on the transition.
 *
 *   2. A 30-second backstop poll. The listener alone is NOT enough on Android:
 *      it fires the moment the phone associates with hall wifi, which is before
 *      there is a route to anything, and `isInternetReachable` is frequently
 *      `undefined` at that instant. The drain then fails transiently and - with
 *      no further physical network change to react to - nothing would retry
 *      until the rep walked somewhere else. Downgraded from 4s, not deleted.
 *
 *   3. `AppState` going active. A rep who pockets the phone offline and takes
 *      it out on mobile data forty minutes later gets a drain immediately
 *      rather than up to thirty seconds later.
 *
 * ---------------------------------------------------------------------------
 * `wasOffline` is an edge-trigger, kept from the code this replaces.
 *
 * `addNetworkStateListener` fires repeatedly on some Androids for per-interface
 * changes, and the backstop poll fires regardless. Without the flag, every one
 * of those would kick off a full drain and refresh.
 *
 * It also starts `false` on purpose: a cold start that is already online must
 * not drain from here, because `useLeadsSync()` already does exactly that once
 * per sign-in. This hook is only about the transition.
 */
export function useConnectivity() {
  useEffect(() => {
    let wasOffline = false;
    let cancelled = false;

    // On web, react-query's own online/offline listeners are instant and
    // correct; replacing them with a poll would be a downgrade.
    const ownsOnlineManager = Platform.OS !== 'web';

    const check = async () => {
      if (cancelled) return;
      try {
        const online = await isOnline();
        if (cancelled) return;

        if (ownsOnlineManager) onlineManager.setOnline(online);

        if (!online) {
          wasOffline = true;
          return;
        }
        if (!wasOffline) return;

        wasOffline = false;
        const userId = useSessionStore.getState().user?.id;
        if (!userId) return;

        // Push before pull, the same order `useLeadsSync` uses: a refresh that
        // landed before an offline capture had been sent would briefly make it
        // look as though the capture had vanished.
        await useLeadsStore.getState().syncDrafts(userId);
        if (!cancelled) await useLeadsStore.getState().refresh();
      } catch {
        /* A failed check is not a state change. Leave wasOffline alone. */
      }
    };

    void check();

    const subscription = Network.addNetworkStateListener(() => {
      void check();
    });
    const interval = setInterval(check, 30_000);
    const appState = AppState.addEventListener('change', (next) => {
      if (next === 'active') void check();
    });

    return () => {
      cancelled = true;
      subscription.remove();
      clearInterval(interval);
      appState.remove();
    };
  }, []);
}
