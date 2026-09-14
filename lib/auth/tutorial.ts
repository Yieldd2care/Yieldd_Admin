// Remembering that the first-run tutorial has been shown (PENDING #33d).
//
// A standalone module for the same reason lib/auth/emailCode.ts is one: it is
// imported by a screen, never by the store, so it is free to reach into the
// store without a cycle — and it keeps this change out of a file another
// session is editing.

import { supabase, isSupabaseConfigured } from '../supabase';
import { useSessionStore } from '../../stores/useSessionStore';

/**
 * Records that this person is done with the tutorial, whether they read every
 * step or skipped it on the first.
 *
 * OPTIMISTIC ON PURPOSE. The local flag is set before the write is awaited, so
 * the tutorial disappears the instant it is dismissed rather than after a round
 * trip — on a show floor with one bar of signal that difference is the whole
 * feel of the thing.
 *
 * A failed write is deliberately swallowed rather than surfaced. There is no
 * useful thing to say: "we could not remember that you closed the tutorial" is
 * noise, and the cost of the failure is that it appears once more on the next
 * cold start, by which point there is a connection and it will save then.
 * refreshProfile() is what would overwrite the optimistic flag, and it only
 * runs on a cold start or a sign-in.
 *
 * Not guarded on role: a rep sees the tutorial too, and writes their own row.
 * `profiles_self_update` allows exactly that and nothing wider.
 */
export async function markTutorialSeen(): Promise<void> {
  const user = useSessionStore.getState().user;
  if (!user || user.hasSeenTutorial) return;

  useSessionStore.setState({ user: { ...user, hasSeenTutorial: true } });

  if (!isSupabaseConfigured) return;

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ tutorial_seen_at: new Date().toISOString() })
      .eq('id', user.id);

    // 42501 here would mean the column-level grant in 20260914170000 never
    // landed. Worth a word in dev, where someone can act on it; never on
    // screen, where it would interrupt the one moment this feature exists to
    // keep smooth.
    if (error && __DEV__) {
      console.warn('[tutorial] could not record that it was seen', error.code, error.message);
    }
  } catch (err) {
    if (__DEV__) console.warn('[tutorial] write threw', err);
  }
}
