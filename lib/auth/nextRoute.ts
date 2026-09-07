// Where a freshly authenticated person belongs.
//
// Shared by the auth screen and the profile-completion screen so the two can
// never disagree about the order of the onboarding steps.

import { Platform } from 'react-native';

import { profileNeedsCompletion, type User } from '../../types/session';

export type AuthDestination =
  | '/(app)'
  | '/(dash)'
  | '/(app)/onboarding/fork'
  | '/(app)/onboarding/complete-profile';

/**
 * Once onboarding is done, a browser goes to the dashboard and a phone goes to
 * the tab bar. The onboarding steps themselves stay in `(app)` on both — they
 * are single-column screens that already read fine in a browser, and splitting
 * them would mean maintaining the same three forms twice.
 */
export const homeRoute = (): AuthDestination => (Platform.OS === 'web' ? '/(dash)' : '/(app)');

const home = homeRoute;

export function nextRouteAfterAuth(
  user: User | null,
  opts: { joinedViaInvite?: boolean } = {}
): AuthDestination {
  if (!user) return home();

  // Anything missing gets asked for first — the fork's answer is meaningless
  // for an account that does not yet know its own company name.
  if (profileNeedsCompletion(user)) return '/(app)/onboarding/complete-profile';

  // An invited rep joins an existing organisation and an existing event. There
  // is nothing for them to choose, and the fork writes an org-level setting
  // they have no permission to change.
  if (opts.joinedViaInvite || user.role !== 'admin') return home();

  return user.onboardingIntent ? home() : '/(app)/onboarding/fork';
}
