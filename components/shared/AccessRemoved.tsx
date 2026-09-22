import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { Typography } from '../ui/Typography';
import { Button } from '../ui/Button';
import { NavyGlowBackdrop } from '../app/NavyGlowBackdrop';
import { useSessionStore } from '../../stores/useSessionStore';
import { PRO_CONTACT_EMAIL } from '../../lib/plan';
import { openEmail } from '../../lib/messaging';
import type { AccessRevocation } from '../../lib/accessNotice';

/**
 * Shown when an administrator has deactivated this account.
 *
 * Distinct from AccountUnavailable in app/(app)/_layout.tsx, which means "we
 * could not load your profile, probably the connection" and offers a retry.
 * This one is definite: refreshProfile() asked `profiles` directly and was told
 * 'deactivated'. There is no Try again, because trying again cannot change the
 * answer.
 *
 * Rendered as a full-bleed sibling of the navigator from app/_layout.tsx, so
 * there is nothing behind it to swipe back to and nothing gets unmounted. See
 * the comment at the insertion point for why replacing the Stack would be a
 * mistake here.
 *
 * In components/shared/ rather than components/app/ because it shows on the web
 * dashboard too — a revoked rep there was previously redirected to the
 * marketing site with no explanation at all.
 */
export function AccessRemoved({ notice }: { notice: AccessRevocation }) {
  const contact = () =>
    void openEmail(
      PRO_CONTACT_EMAIL,
      'My Yieldd access was removed',
      `My access to Yieldd was removed on ${notice.at}.\n\n` +
        `Account: ${notice.email ?? 'not recorded'}\n` +
        `Company: ${notice.company || 'not recorded'}\n\n` +
        'Please let me know what happened.'
    );

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 50, elevation: 50 }]}>
      <SafeAreaView className="flex-1 bg-navy" edges={['top', 'bottom']}>
        <StatusBar style="light" />
        <NavyGlowBackdrop />
        <View className="flex-1 justify-center px-8">
          <Typography className="text-[12px] font-bold tracking-[0.14em] text-gold text-center">
            ACCESS REMOVED
          </Typography>

          <Typography className="mt-3 text-[22px] font-extrabold text-white text-center tracking-[-0.01em]">
            {notice.company
              ? `Your access to ${notice.company} was removed`
              : 'Your access to this company was removed'}
          </Typography>

          <Typography className="mt-3 text-[13.5px] leading-[1.55] text-white/[0.60] text-center">
            An administrator deactivated this account, so this device has been signed out
            and the leads saved on it have been cleared. Everything you had already sent
            stays with the company.
          </Typography>

          {notice.pendingLeads > 0 ? (
            <Typography className="mt-4 text-[13px] leading-[1.55] text-gold text-center">
              {notice.pendingLeads === 1
                ? '1 capture on this device had not been sent yet, and could not be.'
                : `${notice.pendingLeads} captures on this device had not been sent yet, and could not be.`}
            </Typography>
          ) : null}

          <Button
            label="Contact support"
            onPress={contact}
            shape="pill"
            className="w-full mt-8"
          />

          <Typography
            onPress={() => useSessionStore.getState().dismissAccessNotice()}
            className="mt-5 text-[12.5px] font-bold text-gold text-center"
          >
            Sign in with a different account
          </Typography>
        </View>
      </SafeAreaView>
    </View>
  );
}
