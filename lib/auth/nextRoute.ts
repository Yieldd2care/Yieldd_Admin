// Where a freshly authenticated person belongs.
//
// Shared by the auth screen and the profile-completion screen so the two can
// never disagree about the order of the onboarding steps.

import { profileNeedsCompletion, type User } from '../../types/session';

export type AuthDestination =
  | '/(app)'
  | '/(app)/onboarding/fork'
  | '/(app)/onboarding/complete-profile';

export function nextRouteAfterAuth(
  user: User | null,
  opts: { joinedViaInvite?: boolean } = {}
): AuthDestination {
  if (!user) return '/(app)';

  // Anything missing gets asked for first — the fork's answer is meaningless
  // for an account that does not yet know its own company name.
  if (profileNeedsCompletion(user)) return '/(app)/onboarding/complete-profile';

  // An invited rep joins an existing organisation and an existing event. There
  // is nothing for them to choose, and the fork writes an org-level setting
  // they have no permission to change.
  if (opts.joinedViaInvite || user.role !== 'admin') return '/(app)';

  return user.onboardingIntent ? '/(app)' : '/(app)/onboarding/fork';
}
