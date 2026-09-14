// profiles + organizations row -> the app's User.
//
// This is the seam that keeps column names out of the screens. It is also
// where the two vocabularies are reconciled: the database says `full_name`,
// the UI says `name`.

import type { AccountIntent, User } from '../../types/session';

/** The exact column list refreshProfile() selects. Keep the two in step. */
export const PROFILE_SELECT =
  'id, full_name, email, role, status, designation, phone, avatar_url, notifications_enabled, ' +
  'created_at, organization_id, ' +
  'organizations!inner(name, plan_tier, onboarding_intent, referral_source)';

type OrganizationJoin = {
  name: string;
  plan_tier: 'free' | 'pro';
  onboarding_intent: string | null;
  referral_source: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'rep';
  status: 'invited' | 'active' | 'deactivated';
  designation: string | null;
  phone: string | null;
  avatar_url: string | null;
  notifications_enabled: boolean | null;
  created_at: string;
  organization_id: string;
  // PostgREST returns an embedded one-to-one as an object, but supabase-js has
  // inferred it as an array in some versions. Accept both rather than casting.
  organizations: OrganizationJoin | OrganizationJoin[] | null;
};

function firstOrg(value: ProfileRow['organizations']): OrganizationJoin | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

// Anything unrecognised collapses to null, which sends an admin back to the
// fork — the safe direction for a value we do not understand. 'skipped' has to
// be listed here explicitly: leave it out and a skip written to the column maps
// back to null on the next profile load, and the fork returns anyway.
const INTENTS: readonly string[] = ['team', 'solo', 'skipped'] satisfies AccountIntent[];

function toIntent(value: string | null): AccountIntent | null {
  return value !== null && INTENTS.includes(value) ? (value as AccountIntent) : null;
}

export function toSessionUser(row: ProfileRow): User {
  const org = firstOrg(row.organizations);

  return {
    id: row.id,
    email: row.email,
    name: row.full_name,
    company: org?.name ?? '',
    role: row.role,
    status: row.status,
    organizationId: row.organization_id,
    planTier: org?.plan_tier ?? 'free',
    onboardingIntent: toIntent(org?.onboarding_intent ?? null),
    // Passed through raw, with NO equivalent of toIntent() above, and that is
    // the point rather than an omission. Collapsing an unrecognised value to
    // null here would mean an org that has answered reads as one that has not,
    // and nextRouteAfterAuth() would ask the same question on every single
    // sign-in. Nothing branches on the value, so an unknown one is harmless.
    referralSource: org?.referral_source ?? null,
    designation: row.designation,
    phone: row.phone,
    avatarUrl: row.avatar_url,
    notificationsEnabled: row.notifications_enabled ?? true,
    createdAt: row.created_at,
  };
}
