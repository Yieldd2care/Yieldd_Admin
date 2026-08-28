import { useState } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';

import { useSessionStore } from '../../stores/useSessionStore';
import { nextRouteAfterAuth } from '../../lib/auth/nextRoute';
import { isValidPhone } from '../../lib/phone';
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
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const signUp = useSessionStore((s) => s.signUp);
  const signIn = useSessionStore((s) => s.signIn);
  const signInWithGoogle = useSessionStore((s) => s.signInWithGoogle);
  const isSubmitting = useSessionStore((s) => s.isSubmitting);
  const pendingInviteToken = useSessionStore((s) => s.pendingInviteToken);

  const isCreate = mode === 'create';

  // Google hands back a name and an email and nothing else, and there is no way
  // to carry an invite token through the OAuth round trip. Someone holding one
  // would quietly land in a brand new organisation of their own instead of the
  // one that invited them, so the door is closed rather than left ajar.
  const inviteBlocksGoogle = Boolean(pendingInviteToken);

  const canSubmit = Boolean(
    isCreate
      ? name.trim() && company.trim() && phone.trim() && email.trim() && password.trim()
      : email.trim() && password.trim()
  );

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

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;
    setError(null);

    if (isCreate && !isValidPhone(phone)) {
      setError('Enter a contact number with at least 10 digits.');
      return;
    }

    if (isCreate && password.length < MIN_PASSWORD) {
      setError(`Use at least ${MIN_PASSWORD} characters for your password.`);
      return;
    }

    const usedInvite = Boolean(pendingInviteToken);
    const result = isCreate
      ? await signUp({ name, company, phone, email, password })
      : await signIn({ email, password });

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
    name,
    setName: edit(setName),
    company,
    setCompany: edit(setCompany),
    phone,
    setPhone: edit(setPhone),
    email,
    setEmail: edit(setEmail),
    password,
    setPassword: edit(setPassword),
    error,
    isSubmitting,
    canSubmit,
    inviteBlocksGoogle,
    handleSubmit,
    handleGoogle,
    devEmail,
    fillDevCredentials,
  };
}

export type AuthFormState = ReturnType<typeof useAuthForm>;
