// The one thing a sign-out must leave behind.
//
// When an admin deactivates someone, the app clears every cache this account
// left on the device and signs out. That teardown is exactly what makes the
// explanation hard to deliver: `user` and `session` are gone, and
// useSessionStore's persisted slice was removed by persist.clearStorage(). So
// without a breadcrumb the revoked rep is shown a sign-in screen and no story
// at all, which is the second half of the bug.
//
// Hence a key of its own, deliberately outside every zustand persist slice.
// lib/localData.ts imports ACCESS_REVOKED_KEY so the exclusion lives in one
// place rather than being restated as a string literal in the sweep.
//
// Every function fails soft. A notice that cannot be written is a worse screen,
// never a broken sign-out — the caches have already gone by the time these run.

import AsyncStorage from '@react-native-async-storage/async-storage';

export const ACCESS_REVOKED_KEY = 'yieldd-access-revoked';

/**
 * What the notice screen needs, captured BEFORE the caches are cleared.
 *
 * Deliberately imports no types from `types/session.ts`: that file imports this
 * one, and keeping the dependency one-way is what stops the two becoming a
 * cycle.
 */
export type AccessRevocation = {
  /** The organisation the rep lost access to. '' when it was never named. */
  company: string;
  /** For the support email, so they do not have to remember which login it was. */
  email: string | null;
  /**
   * Captures that had not reached the server and now never will — RLS refuses
   * the insert for a deactivated member. Counted before the wipe and shown on
   * the screen, because losing someone's work silently is not acceptable.
   */
  pendingLeads: number;
  at: string;
};

export async function writeAccessRevoked(notice: AccessRevocation): Promise<void> {
  try {
    await AsyncStorage.setItem(ACCESS_REVOKED_KEY, JSON.stringify(notice));
  } catch {
    /* The teardown has already happened; the screen is the only casualty. */
  }
}

export async function readAccessRevoked(): Promise<AccessRevocation | null> {
  try {
    const raw = await AsyncStorage.getItem(ACCESS_REVOKED_KEY);
    return raw ? (JSON.parse(raw) as AccessRevocation) : null;
  } catch {
    // Unparseable is the same as absent. A corrupt value must not be able to
    // wedge the app behind a notice nobody can read or dismiss.
    return null;
  }
}

export async function clearAccessRevoked(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ACCESS_REVOKED_KEY);
  } catch {
    /* Dismissal is in-memory too, so the screen goes either way. */
  }
}
