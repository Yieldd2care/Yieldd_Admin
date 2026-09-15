// Signing in with a code emailed to you (PENDING #33a).
//
// A standalone module rather than actions on useSessionStore, matching
// lib/auth/passwordReset.ts and lib/auth/google.ts. Two reasons:
//
//   1. It is the shape this codebase already uses for auth side-quests.
//   2. The store is edited by more than one person at a time. Keeping this out
//      of it means the signup rewrite does not collide with unrelated work in
//      the same file.
//
// The import direction matters: google.ts is imported BY the store, so it must
// not import the store back. This module is imported only by screens, so it is
// free to reach into the store — and it has to, because refreshProfile() reads
// `session` off the store rather than taking it as an argument.

import { supabase, isSupabaseConfigured } from '../supabase';
import { useSessionStore } from '../../stores/useSessionStore';
import { PLACEHOLDER_NAME, type AuthResult, type User } from '../../types/session';

const NOT_CONFIGURED: AuthResult = {
  error: 'This build has no Supabase connection. See the console for setup steps.',
};

/**
 * How many digits are in the code.
 *
 * Six is not a preference, it is the floor: Supabase refuses anything outside
 * 6-10 for MAILER_OTP_LENGTH. The user asked for four. The live project is set
 * to 6 to match `otp_length` in supabase/config.toml, which had drifted to 8.
 *
 * Exported so the input's maxLength and the "enter the 6-digit code" wording
 * cannot disagree with each other.
 */
export const CODE_LENGTH = 6;

/**
 * 'signup' creates the account if the address is new; 'signin' refuses.
 *
 * The distinction is the whole reason the sign-in path can offer a code at all
 * without becoming a second, silent way to register.
 */
export type CodePurpose = 'signup' | 'signin';

function mapCodeError(message: string, code: string | undefined): string {
  switch (code) {
    case 'otp_expired':
      return 'That code has expired. Send a new one.';
    case 'otp_disabled':
    case 'signup_disabled':
      return 'Signing in with a code is switched off for this app.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Too many codes requested. Wait a minute and try again.';
    case 'validation_failed':
    case 'email_address_invalid':
      return "That email address doesn't look right.";
    case 'weak_password':
      return 'Use at least 8 characters.';
  }

  // 'Signups not allowed for otp' is what comes back when shouldCreateUser is
  // false and the address has no account. Verified against the live project on
  // 2026-09-14. It has no error code, so the message is all there is to match.
  if (/signups not allowed/i.test(message)) {
    return "There's no account for that email yet. Create one instead.";
  }
  if (/invalid|expired/i.test(message)) {
    return 'That code is wrong or has expired. Check it and try again.';
  }
  if (/network request failed|failed to fetch|networkerror/i.test(message)) {
    return "You're offline. Connect and try again.";
  }
  return message || 'Something went wrong. Please try again.';
}

/**
 * Emails a code.
 *
 * THE INVITE TOKEN HAS TO RIDE ALONG HERE.
 *
 * handle_new_user() reads `invite_token` out of the new user's metadata, and
 * this call is the only place that metadata can be set — the account is created
 * the moment the code is *sent*, not when it is entered. Leave the token out
 * and an invited rep silently lands in a brand new organisation of their own
 * instead of the one that invited them, with no error anywhere.
 */
export async function sendEmailCode(email: string, purpose: CodePurpose): Promise<AuthResult> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;

  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return { error: 'Enter your email address.' };

  const inviteToken = useSessionStore.getState().pendingInviteToken;

  const { error } = await supabase.auth.signInWithOtp({
    email: trimmed,
    options: {
      shouldCreateUser: purpose === 'signup',
      ...(purpose === 'signup' && inviteToken ? { data: { invite_token: inviteToken } } : {}),
    },
  });

  if (error) {
    return { error: mapCodeError(error.message, (error as { code?: string }).code) };
  }
  return { error: null };
}

/**
 * Checks the code and, if it is right, signs the person in.
 *
 * `type: 'email'` is not a guess — both 'email' and 'signup' were tried against
 * the live project on 2026-09-14 and 'email' is the one GoTrue accepts for a
 * token issued by signInWithOtp, whether or not the account already existed.
 *
 * The session is written to the store and the profile loaded BEFORE this
 * resolves. onAuthStateChange fires SIGNED_IN too, but that runs through the
 * store's serial queue while the screen navigates the instant this returns —
 * and the destination sits behind a guard that reads `user`. Racing the queue
 * lands the person back on the sign-in screen. This is the same reasoning the
 * Google path already documents at its own getSession/refreshProfile pair.
 */
export async function verifyEmailCode(email: string, code: string): Promise<AuthResult> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;

  const digits = code.replace(/\D/g, '');
  if (digits.length !== CODE_LENGTH) {
    return { error: `Enter the ${CODE_LENGTH}-digit code from the email.` };
  }

  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: digits,
    type: 'email',
  });

  if (error) {
    return { error: mapCodeError(error.message, (error as { code?: string }).code) };
  }
  if (!data.session) {
    return { error: 'That code did not sign you in. Send a new one and try again.' };
  }

  useSessionStore.setState({ session: data.session });
  await useSessionStore.getState().refreshProfile();

  // Consumed either way. Leaving it set would attach the next person who signs
  // up on this device to someone else's organisation — the same reasoning
  // signUp() gives for clearing it on every exit path.
  useSessionStore.getState().setPendingInviteToken(null);

  return { error: null };
}

/**
 * Sets the password on an account that has none yet.
 *
 * Someone who arrives by code has no password at all until this runs, which is
 * why complete-profile asks for one. Until it does, that account can only be
 * reached with another emailed code.
 */
export async function setPassword(password: string): Promise<AuthResult> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: mapCodeError(error.message, (error as { code?: string }).code) };
  }
  return { error: null };
}

/**
 * Whether complete-profile should ask this person to choose a password.
 *
 * It must be true for exactly one group: accounts just created by a code, which
 * genuinely have no password yet. It must be FALSE for a Google account (signed
 * in by Google, would be inventing a password they never type) and FALSE for an
 * older email+password account that reaches complete-profile only because it
 * predates the mandatory contact number.
 *
 * The identity list cannot tell those apart — `email` shows up as an identity
 * for a code account and a password account alike. So it is recorded at the one
 * moment it is actually known: when a code creates the account.
 *
 * So it is derived from the one piece of data that already separates them: the
 * placeholder name. handle_new_user() writes 'New user' only when the account
 * was created with no metadata at all, which is precisely the code path —
 * Google supplies a real name, and the old form collected one. No flag, no
 * storage, and it survives a force-quit because it is a property of the row.
 *
 * An invited rep who joins by code also lands here, correctly: they have no
 * password either.
 *
 * THIS HOLDS ONLY WHILE complete-profile IS THE THING THAT SETS THE NAME.
 *
 * Move the name off that screen and the inference breaks in both directions:
 * the name stays the placeholder after a password is chosen, so this keeps
 * returning true and the person is asked again on every launch; and whichever
 * screen does collect the name flips it to false the moment they type, letting
 * someone who skipped or failed the password step into the app with no password
 * and no screen left that asks — locked out of every other device.
 *
 * #58 proposed exactly that move and was cut back to company-only on
 * 2026-09-15 partly for this reason. If the name ever does move, this needs a
 * real column on `profiles`, written when setPassword() succeeds — and note
 * that column-level GRANTs do not extend to new columns in this project (see
 * supabase/migrations/20260914170000_profile_tutorial_seen.sql).
 *
 * There is no way to do it from the auth user instead; that was measured
 * against the live project on 2026-09-15, not assumed. `encrypted_password`
 * does separate a code account from a password account, but it is never sent to
 * the client, and `app_metadata.provider` reads 'email' for both.
 */
export function needsPasswordSetup(user: User | null): boolean {
  return Boolean(user && user.name === PLACEHOLDER_NAME);
}
