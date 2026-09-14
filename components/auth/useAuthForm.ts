import { useState } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';

import { useSessionStore } from '../../stores/useSessionStore';
import { nextRouteAfterAuth } from '../../lib/auth/nextRoute';
import { sendEmailCode, type CodePurpose } from '../../lib/auth/emailCode';
import type { AuthMode } from './AuthTabs';

/**
 * Everything the sign-in screen does, minus how it looks.
 *
 * There are two presentations of this screen and they must never drift apart:
 * the navy single-column one the mobile app uses, and the two-column white one
 * the website has always had. Sharing the logic means a fix to the validation,
 * the error mapping or the post-sign-in routing lands on both at once.
 */

/** Matches password_min_length on the Supabase project. Checked here so the
 *  person is told before a round trip, not after. */
export const MIN_PASSWORD = 8;

export function useAuthForm() {
  const [mode, setMode] = useState<AuthMode>('create');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // No name/company/phone here any more. They are not collected until
  // complete-profile, which is also why the store's signUp() is no longer
  // called from anywhere — it is left in place rather than deleted because it
  // carries duplicate-detection work that belongs to the phone field, and that
  // has to be relocated deliberately rather than dropped. See PENDING #33a.
  const signIn = useSessionStore((s) => s.signIn);
  const signInWithGoogle = useSessionStore((s) => s.signInWithGoogle);
  const isSubmitting = useSessionStore((s) => s.isSubmitting);
  const pendingInviteToken = useSessionStore((s) => s.pendingInviteToken);

  const [sendingCode, setSendingCode] = useState(false);

  const isCreate = mode === 'create';

  // Google hands back a name and an email and nothing else, and there is no way
  // to carry an invite token through the OAuth round trip. Someone holding one
  // would quietly land in a brand new organisation of their own instead of the
  // one that invited them, so the door is closed rather than left ajar.
  const inviteBlocksGoogle = Boolean(pendingInviteToken);

  // Creating an account is one field now (#33a). Name, company, contact number
  // and password all moved to complete-profile, which already asked for two of
  // them — so the first thing a stranger sees is a single box, not five.
  const canSubmit = Boolean(isCreate ? email.trim() : email.trim() && password.trim());

  // Any edit invalidates the last error — leaving it on screen while the user
  // fixes the thing it complained about reads as broken.
  const edit = (setter: (v: string) => void) => (value: string) => {
    if (error) setError(null);
    setter(value);
  };

  const changeMode = (next: AuthMode) => {
    setError(null);
    setMode(next);
  };

  /**
   * Emails a code and moves to the screen that asks for it.
   *
   * `push`, not `replace` — a typo in the address is the likeliest reason to
   * want to come back, and onboarding's "never sit in the back stack" rule does
   * not apply to a screen the person may need to escape.
   *
   * Note the account is created when the code is SENT, not when it is entered.
   * That is GoTrue's behaviour, not a choice here, and it is why the invite
   * token has to be attached at this point — see lib/auth/emailCode.ts.
   */
  const goToCode = async (purpose: CodePurpose) => {
    if (sendingCode) return;
    setSendingCode(true);
    setError(null);

    const result = await sendEmailCode(email, purpose);
    setSendingCode(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    router.push(
      `/verify-code?email=${encodeURIComponent(email.trim().toLowerCase())}&purpose=${purpose}`
    );
  };

  /** Sign in without a password, for an account that has not set one yet. */
  const handleCodeSignIn = async () => {
    if (!email.trim()) {
      setError('Enter your email address first.');
      return;
    }
    await goToCode('signin');
  };

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting || sendingCode) return;
    setError(null);

    if (isCreate) {
      await goToCode('signup');
      return;
    }

    const usedInvite = Boolean(pendingInviteToken);
    const result = await signIn({ email, password });

    if (result.error) {
      setError(result.error);
      return;
    }

    // signUp and signIn both resolve only once the profile is loaded, so the
    // guard on the destination will see a user and let us through.
    router.replace(
      nextRouteAfterAuth(useSessionStore.getState().user, { joinedViaInvite: usedInvite })
    );
  };

  const handleGoogle = async () => {
    if (isSubmitting || inviteBlocksGoogle) return;
    setError(null);

    const outcome = await signInWithGoogle();
    // Dismissing the browser is an ordinary thing to do, not an error.
    if (outcome.cancelled) return;
    if (outcome.error) {
      setError(outcome.error);
      return;
    }

    // On web the page is already on its way to Google and there is nothing to
    // route. On native the session has landed and the profile is loaded.
    if (Platform.OS === 'web') return;
    router.replace(nextRouteAfterAuth(useSessionStore.getState().user));
  };

  /** Dev-only convenience: fills the form, never fakes a session. */
  const devEmail = process.env.EXPO_PUBLIC_DEV_EMAIL;
  const fillDevCredentials = () => {
    if (!devEmail) return;
    setError(null);
    setMode('signin');
    setEmail(devEmail);
    setPassword(process.env.EXPO_PUBLIC_DEV_PASSWORD ?? '');
  };

  return {
    mode,
    isCreate,
    changeMode,
    email,
    setEmail: edit(setEmail),
    password,
    setPassword: edit(setPassword),
    error,
    isSubmitting,
    sendingCode,
    canSubmit,
    inviteBlocksGoogle,
    handleSubmit,
    handleCodeSignIn,
    handleGoogle,
    devEmail,
    fillDevCredentials,
  };
}

export type AuthFormState = ReturnType<typeof useAuthForm>;
