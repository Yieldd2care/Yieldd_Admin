import { router } from 'expo-router';

import { isProPlan, type ProFeatureId } from '../lib/plan';
import { useOrganization } from './useOrganization';
import { useSessionStore } from '../stores/useSessionStore';

/**
 * Is this account on Pro?
 *
 * Every lock reads this rather than assembling the check itself. The check was
 * already written out longhand on the Settings screen, and a second copy
 * written slightly differently is how half the app ends up disagreeing with
 * the other half about what someone has paid for.
 */
export function useIsPro(): boolean {
  const profileTier = useSessionStore((s) => s.user?.planTier);
  const { data: organization } = useOrganization();
  return isProPlan(organization?.planTier, profileTier);
}

/**
 * What a locked control needs: whether to draw the lock, and what to do when
 * it is pressed.
 *
 * `gate` returns true when the tap should go through. So a call site reads:
 *
 *     onPress={() => { if (gate('roi')) router.push(...) }}
 *
 * which keeps the real destination visible in the screen rather than hidden
 * behind a wrapper, and means a screen can be read to find out where a button
 * goes. When the feature is locked it opens the explanation instead and
 * returns false.
 *
 * Note it never blocks silently. A control that is drawn, tapped, and does
 * nothing is the complaint this whole batch exists to fix.
 */
export function useProGate() {
  const isPro = useIsPro();

  const gate = (feature: ProFeatureId): boolean => {
    if (isPro) return true;
    router.push({ pathname: '/(app)/(modals)/pro-feature', params: { feature } });
    return false;
  };

  return { isPro, locked: !isPro, gate };
}
