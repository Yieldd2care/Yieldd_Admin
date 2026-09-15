import * as Network from 'expo-network';

/**
 * One definition of "online", because there were two.
 *
 * `app/_layout.tsx` and `app/(app)/leads/drafts.tsx` each had their own copy of
 * this expression driving their own four-second poll. Two copies of a rule this
 * subtle is one too many.
 *
 * `isInternetReachable !== false` rather than `=== true` is the load-bearing
 * part. Android reports `undefined` for reachability in the window between
 * associating with a wifi network and having a route through it, and treating
 * that as offline would stop the drain at exactly the moment a rep walks back
 * into signal.
 */
export function onlineFromState(state: {
  isConnected?: boolean | null;
  isInternetReachable?: boolean | null;
}): boolean {
  return Boolean(state.isConnected && state.isInternetReachable !== false);
}

export async function isOnline(): Promise<boolean> {
  try {
    return onlineFromState(await Network.getNetworkStateAsync());
  } catch {
    // Unknown is not the same as offline. Attempting the work and failing gives
    // a real answer; refusing to try on a bad reading gives none.
    return true;
  }
}
