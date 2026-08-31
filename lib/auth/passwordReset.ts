import { Platform } from 'react-native';

import { supabase, isSupabaseConfigured } from '../supabase';

/**
 * Password reset, in two halves: ask for the email, then set the new password
 * from the link it sends.
 *
 * WHY THE LINK ALWAYS GOES TO THE WEB, even for someone on their phone:
 * a `yieldd://` recovery link needs a real build — it cannot resolve inside
 * Expo Go, where the scheme changes with the LAN address (the same constraint
 * PENDING #8c records for Google sign-in). Someone locked out of the app is the
 * last person who should be told "this requires a different build of the app".
 * The browser page works on every device today: they set the password there and
 * sign in to the app with it.
 */

/** Where the emailed link lands. Must be on the Supabase redirect allow list. */
export function passwordResetRedirectUrl(): string {
  if (Platform.OS === 'web') {
    // Whatever origin is serving the app — localhost in dev, yieldd.co in
    // production — so one build works in both.
    return `${window.location.origin}/auth/reset-password`;
  }
  // Native deliberately points at the website rather than Linking.createURL:
  // see the note above.
  return 'https://yieldd.co/auth/reset-password';
}

export type ResetOutcome = { ok: true } | { ok: false; message: string };

/**
 * Sends the recovery email.
 *
 * Deliberately reports success even when the address has no account. Supabase
 * behaves this way and the UI must not undo it: a form that says "no such user"
 * is a free membership check for anyone who wants to know which of their
 * competitors' staff use this product.
 */
export async function requestPasswordReset(email: string): Promise<ResetOutcome> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: 'This build has no Supabase configuration.' };
  }

  const trimmed = email.trim();
  if (!trimmed) return { ok: false, message: 'Enter the email address on your account.' };

  const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
    redirectTo: passwordResetRedirectUrl(),
  });

  if (error) {
    if (__DEV__) console.warn('[passwordReset] request', error);
    // Rate limiting is the one failure worth naming — it is the person's own
    // repeated tapping, and telling them to wait is more useful than "failed".
    if (error.status === 429) {
      return { ok: false, message: 'Too many requests. Wait a minute and try again.' };
    }
    return { ok: false, message: "Couldn't send that email. Check your connection and try again." };
  }

  return { ok: true };
}

/**
 * Sets the new password, using the session the recovery link established.
 *
 * `detectSessionInUrl` has already exchanged the code by the time the screen
 * renders on web, so there is a real session here — that is what authorises the
 * change. No old password is asked for, because the emailed link IS the proof.
 */
export async function setNewPassword(password: string): Promise<ResetOutcome> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: 'This build has no Supabase configuration.' };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    if (__DEV__) console.warn('[passwordReset] update', error);
    if (error.code === 'same_password') {
      return { ok: false, message: 'That is already your password. Choose a different one.' };
    }
    if (error.code === 'weak_password') {
      return { ok: false, message: 'That password is too easy to guess. Try a longer one.' };
    }
    // A recovery session is short-lived; an expired one lands here.
    if (error.status === 401 || error.code === 'session_not_found') {
      return {
        ok: false,
        message: 'This reset link has expired. Ask for a new one and use it within the hour.',
      };
    }
    return { ok: false, message: "Couldn't save the new password. Try again." };
  }

  return { ok: true };
}

/**
 * Is there a usable recovery session?
 *
 * Called by the reset screen before showing the form, so an expired or
 * already-used link says so up front rather than after someone has typed a
 * password twice.
 */
export async function hasRecoverySession(): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { data } = await supabase.auth.getSession();
  return Boolean(data.session);
}
