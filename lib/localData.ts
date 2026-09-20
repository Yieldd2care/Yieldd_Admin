// Everything one account left on this device, removed in one call.
//
// There was no such place before, and that was the gap: signOut() cleared
// `yieldd-session` and the query cache and stopped there, so seven other
// persisted stores and the whole `captures/` directory survived every sign-out.
// The next person to sign in on a shared handset inherited the previous
// organisation's leads. Revoking a rep needs the same teardown for a sharper
// reason — the copy in their pocket has to go — so it is written once here and
// called from the single sign-out path rather than sprinkled at call sites.
//
// This module imports all seven stores, which is why useSessionStore reaches it
// through a dynamic import(): useLeadsStore -> hooks/useEvents ->
// useSessionStore is a real cycle, and a static import here would close it
// through a module still mid-evaluation at boot.

import AsyncStorage from '@react-native-async-storage/async-storage';

import { useLeadsStore } from '../stores/useLeadsStore';
import { useCaptureDraftStore } from '../stores/useCaptureDraftStore';
import { useCurrentEventStore } from '../stores/useCurrentEventStore';
import { useEventDraftStore } from '../stores/useEventDraftStore';
import { useEventFieldsStore } from '../stores/useEventFieldsStore';
import { useEventSelectionStore } from '../stores/useEventSelectionStore';
import { useCompanyStore } from '../stores/useCompanyStore';
import { discardAllCaptureFiles } from './captureFiles';
import { ACCESS_REVOKED_KEY } from './accessNotice';

/**
 * Captures the server has never seen, counted before anything is cleared.
 *
 * The same predicate the sync drain uses in stores/useLeadsStore.ts: a lead
 * still `draft` has not been accepted, and one carrying a `pendingPatch` has
 * edits that have not landed. A deactivated rep cannot send either — RLS
 * refuses the insert — so this number is what the wipe is about to cost, and
 * the notice screen states it rather than letting the work vanish quietly.
 */
export function countUnsyncedLeads(): number {
  return useLeadsStore
    .getState()
    .leads.filter(
      (lead) =>
        lead.syncStatus === 'draft' ||
        Boolean(lead.pendingPatch && Object.keys(lead.pendingPatch).length)
    ).length;
}

/**
 * Three passes, in this order and no other.
 *
 *  1. IN MEMORY. A mounted screen renders from live zustand state, not from
 *     disk. Clearing only AsyncStorage would leave a revoked rep looking at the
 *     lead list until they relaunched the app, which is most of the bug still
 *     in place.
 *
 *  2. ON DISK. After (1) rather than before, and the ordering is not arbitrary:
 *     each reset above makes `persist` queue a write, so sweeping first would
 *     simply let the keys reappear. Sweeping second, a write that lands behind
 *     the sweep re-creates an EMPTIED key, never a populated one.
 *
 *  3. THE FILES. See discardAllCaptureFiles().
 *
 * Idempotent throughout, because the SIGNED_OUT auth event arrives through the
 * serial queue and runs the whole teardown a second time: the resets are
 * no-ops on empty state, multiRemove is skipped on an empty list, and the
 * capture root is already gone.
 */
export async function clearLocalData(): Promise<void> {
  // 1 -----------------------------------------------------------------------
  try {
    useLeadsStore.getState().clear();
    useCaptureDraftStore.getState().reset();
    useEventDraftStore.getState().reset();
    useCurrentEventStore.getState().selectEvent(null);
    useEventFieldsStore.getState().setFields([]);
    useEventSelectionStore.getState().selectEvents(null);
    // No reset action of its own, so it is set back to its initial state here.
    useCompanyStore.setState({ customCategories: [], selectedCategory: null });
  } catch (err) {
    if (__DEV__) console.warn('[localData] in-memory reset failed', err);
  }

  // 2 -----------------------------------------------------------------------
  // A prefix sweep rather than a hand-kept list, deliberately. Eight keys exist
  // today and there is no stores/index.ts to notice a ninth, so a list here
  // would rot silently the first time someone adds a store.
  //
  // Supabase's own token lives under `sb-<ref>-auth-token` and is untouched:
  // supabase.auth.signOut() owns that one. ACCESS_REVOKED_KEY is the single
  // deliberate exception — see lib/accessNotice.ts for why it has to survive
  // the very sign-out that writes it.
  try {
    const keys = await AsyncStorage.getAllKeys();
    const doomed = keys.filter((key) => key.startsWith('yieldd-') && key !== ACCESS_REVOKED_KEY);
    if (doomed.length > 0) await AsyncStorage.multiRemove(doomed);
  } catch (err) {
    if (__DEV__) console.warn('[localData] storage sweep failed', err);
  }

  // 3 -----------------------------------------------------------------------
  discardAllCaptureFiles();
}
