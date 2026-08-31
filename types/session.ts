import type { Session } from '@supabase/supabase-js';

import type { Enums } from '../lib/db';
import type { OAuthOutcome } from '../lib/auth/google';

// Sourced from the generated database enums rather than hand-written unions, so
// a migration that changes them breaks the build instead of drifting silently.
export type UserRole = Enums<'user_role'>; // 'admin' | 'rep'
export type MemberStatus = Enums<'member_status'>; // 'invited' | 'active' | 'deactivated'
export type PlanTier = Enums<'org_plan_tier'>; // 'free' | 'pro'

export type AccountIntent = 'team' | 'solo';

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
  designation: string | null;
  phone: string | null;
  avatarUrl: string | null;
  /** `profiles.notifications_enabled`. Defaults true, as the column does. */
  notificationsEnabled: boolean;
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
 * True when the account is missing something every account is supposed to have.
 *
 * Only ever true for an account that did not come through the email signup
 * form: a Google sign-in supplies a name and an email and nothing else, and
 * accounts created before the contact number became mandatory.
 */
export function profileNeedsCompletion(user: User | null): boolean {
  return Boolean(user && !user.phone);
}
