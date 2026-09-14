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
  | '/(app)/onboarding/referral'
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

  // Where they heard about us, before the fork rather than after it (#33b).
  //
  // The fork navigates with its own hardcoded router.replace — home for team,
  // the card editor for solo — and never comes back through this function. So
  // a referral step placed after it would simply never be reached on the run
  // that matters, the one right after signing up.
  //
  // Any non-null value means "this org has answered", which is what stops the
  // screen reappearing on the next sign-in. That includes 'skipped' and the
  // 'predates' the migration backfilled onto every organisation that existed
  // before the question did.
  if (!user.referralSource) return '/(app)/onboarding/referral';

  return user.onboardingIntent ? home() : '/(app)/onboarding/fork';
}
