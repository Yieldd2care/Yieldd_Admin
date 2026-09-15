import type { Session } from '@supabase/supabase-js';

import type { Enums } from '../lib/db';
import type { OAuthOutcome } from '../lib/auth/google';
import type { ReferralSourceId } from '../lib/referral';

import { PLACEHOLDER_NAME } from '../lib/placeholders';

// Sourced from the generated database enums rather than hand-written unions, so
// a migration that changes them breaks the build instead of drifting silently.
export type UserRole = Enums<'user_role'>; // 'admin' | 'rep'
export type MemberStatus = Enums<'member_status'>; // 'invited' | 'active' | 'deactivated'
export type PlanTier = Enums<'org_plan_tier'>; // 'free' | 'pro'

/**
 * The fork's answer, and `null` until it is given. Any non-null value means
 * "this org has answered", which is what stops nextRouteAfterAuth() showing
 * the fork again on the next sign-in.
 *
 * `'skipped'` is here because the column accepts it (20260914100000) and this
 * type has to cover what the database can hand back. Nothing writes it today:
 * the fork deliberately has no Skip — see app/(app)/onboarding/fork.tsx.
 */
export type AccountIntent = 'team' | 'solo' | 'skipped';

/**
 * The signed-in person, flattened from `profiles` joined to `organizations`.
 *
 * `id`, `email`, `name`, `company` and `role` keep their existing names on
 * purpose — five screens already read them and renaming would drag otherwise
 * untouched files into this change.
 */
export interface User {
  id: string; // = auth.users.id = profiles.id
  email: string;
  name: string; // profiles.full_name
  company: string; // organizations.name
  role: UserRole;
  status: MemberStatus;
  organizationId: string;
  planTier: PlanTier;
  onboardingIntent: AccountIntent | null;
  /**
   * `organizations.referral_source` — where this org heard about Yieldd (#33b).
   *
   * Deliberately a plain string and not a union, unlike `onboardingIntent`
   * above. Any non-null value means "answered", so narrowing it would mean a
   * value we did not recognise collapsing to null and the question returning
   * forever. See the note in lib/mappers/profile.ts.
   */
  referralSource: string | null;
  designation: string | null;
  phone: string | null;
  avatarUrl: string | null;
  /** `profiles.notifications_enabled`. Defaults true, as the column does. */
  notificationsEnabled: boolean;
  /**
   * Whether this person has finished or skipped the first-run tutorial (#33d).
   *
   * Per person, not per organisation — every invited rep gets their own, and an
   * admin finishing it must not consume it for their whole team. Existing
   * profiles were backfilled as seen, so nobody already using the app is taught
   * it, the demo login included.
   */
  hasSeenTutorial: boolean;
  createdAt: string;
}

/** Every auth action resolves to this rather than throwing, so screens can render the message inline. */
export type AuthResult = { error: string | null };

export interface SessionState {
  user: User | null;
  /**
   * The Supabase session, kept separately from `user`. These come apart in a
   * real and recoverable way: a valid session whose profile fetch failed
   * (offline, or a transient error). Without this field the app cannot tell
   * that case from "signed out" and bounces the user between the app and the
   * sign-in screen forever.
   */
  session: Session | null;

  /** True until the cold-start session check settles. Screens must not redirect while true. */
  isInitializing: boolean;
  /** True while a sign-in/sign-up request is in flight. */
  isSubmitting: boolean;
  /** Set once immediately after a successful sign-up, so onboarding can branch. */
  isNewSignup: boolean;
  /**
   * An invite token captured from a deep link, held until sign-up consumes it.
   * Persisted, because tapping an invite link can cold-start the app. Cleared
   * on use, on failure and on sign-out — leaving it set would attach the next
   * person who signs up on this device to someone else's organisation.
   */
  pendingInviteToken: string | null;

  initialize: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setPendingInviteToken: (token: string | null) => void;
  setAccountIntent: (intent: AccountIntent) => Promise<AuthResult>;
  /**
   * Records the answer to "where did you hear about us?" on the organisation.
   *
   * `detail` is the platform under Social media or AI discovery, and null for
   * every other answer. Writing anything at all is what stops the screen coming
   * back, which is why the Skip link writes `'skipped'` rather than nothing.
   */
  setReferralSource: (source: ReferralSourceId, detail?: string | null) => Promise<AuthResult>;

  signUp: (input: {
    name: string;
    company: string;
    /** Required by the form. Normalised to +<country><number> before it is sent. */
    phone: string;
    email: string;
    password: string;
  }) => Promise<AuthResult>;
  signIn: (input: { email: string; password: string }) => Promise<AuthResult>;
  signInWithGoogle: () => Promise<OAuthOutcome>;
  signOut: () => Promise<void>;

  /**
   * Writes the person's own details through to the database, and only then into
   * local state.
   *
   * `user` is server-derived now, so anything set with a bare `setState` is
   * silently reverted by the next refreshProfile() — which happens on every
   * cold start. Any screen with a Save button has to come through here.
   *
   * `company` renames the organisation and is skipped for a rep, who has no
   * right to rename the one they were invited into. Email is deliberately not
   * settable: the profile guard trigger blocks it, and the address of record
   * lives in auth.users.
   */
  updateProfile: (input: {
    name?: string;
    designation?: string;
    phone?: string;
    company?: string;
    notificationsEnabled?: boolean;
  }) => Promise<AuthResult>;

  /**
   * Fills in what Google sign-in cannot supply: a contact number, and a real
   * company name in place of the placeholder the signup trigger falls back to.
   */
  completeProfile: (input: { phone: string; company?: string }) => Promise<AuthResult>;
}

/**
 * The names handle_new_user() falls back to when signup supplied no metadata,
 * and the helper that keeps the organisation's off every screen.
 *
 * Both are written by the database, never typed by a person, and both are now
 * reached routinely: signing up with an emailed code (#33a) sends nothing but
 * the address, so every new account begins as "New user" at "My workspace".
 *
 * They are replaced on two different screens since #58 (2026-09-15).
 * complete-profile replaces the name — the guard below and
 * lib/auth/emailCode.ts both depend on it doing so. The organisation is renamed
 * later, on the card editor, and nothing forces that to happen at all, which is
 * why realCompanyName() exists: see lib/placeholders.ts.
 *
 * Re-exported rather than declared here so that lib/messageText.ts can reach
 * realCompanyName() without importing this file. scripts/verify-messaging.mjs
 * compiles messageText standalone, and an import chain through here pulls in
 * lib/supabase.ts and breaks it.
 */
export { PLACEHOLDER_NAME, PLACEHOLDER_ORG, realCompanyName } from '../lib/placeholders';

/**
 * True when the account is missing something every account is supposed to have.
 *
 * Two cases now, not one:
 *
 *   - No contact number. A Google sign-in supplies a name and an email and
 *     nothing else, and accounts predate the number being mandatory.
 *   - The placeholder name. An account created by an emailed code arrives as
 *     "New user", because the only thing it was created from was an address.
 *
 * The second is not redundant. Such an account also has a null phone today, so
 * the first test happens to catch it — but that is a coincidence, and it stops
 * being true the moment anything saves a number without a name. Relying on it
 * would leave people named "New user" with no route back to fixing it.
 */
export function profileNeedsCompletion(user: User | null): boolean {
  return Boolean(user && (!user.phone || user.name === PLACEHOLDER_NAME));
}
