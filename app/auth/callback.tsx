import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../../components/ui/Typography';
import { Button } from '../../components/ui/Button';
import { NavyGlowBackdrop } from '../../components/app/NavyGlowBackdrop';
import { useSessionStore } from '../../stores/useSessionStore';
import { nextRouteAfterAuth } from '../../lib/auth/nextRoute';
import { oauthErrorFromLandingUrl } from '../../lib/auth/google';

/**
 * Where Google sends the browser back to.
 *
 * This only ever renders on web. Native captures its own redirect inside
 * openAuthSessionAsync and exchanges the code there, so it never navigates
 * here — but the route still has to exist for the URL to be a real page
 * rather than an unmatched-route screen flashing mid sign-in.
 *
 * The client is built with detectSessionInUrl on web, so by the time
 * initialize() has settled the `?code=` has already been exchanged and the
 * session is in the store. All that is left is to decide where to go.
 *
 * Deliberately at the route root, outside both (auth) and (app): the guard on
 * (auth) redirects anyone signed in, which would race this screen.
 */
export default function AuthCallbackScreen() {
  const isInitializing = useSessionStore((s) => s.isInitializing);
  const user = useSessionStore((s) => s.user);
  const session = useSessionStore((s) => s.session);

  useEffect(() => {
    if (isInitializing || oauthErrorFromLandingUrl) return;

    // No session and no error means the person landed here directly. Sending
    // them to sign-in is the honest outcome.
    router.replace(session && user ? nextRouteAfterAuth(user) : '/(auth)');
  }, [isInitializing, session, user]);

  if (oauthErrorFromLandingUrl) {
    return (
      <SafeAreaView className="flex-1 bg-navy" edges={['top', 'bottom']}>
        <NavyGlowBackdrop />
        <View className="flex-1 justify-center px-8">
          <Typography className="text-[22px] font-extrabold text-white text-center tracking-[-0.01em]">
            Google sign-in didn&rsquo;t finish
          </Typography>
          <Typography className="mt-3 text-[13.5px] leading-[1.55] text-white/[0.60] text-center">
            {oauthErrorFromLandingUrl}
          </Typography>
          <Button
            label="Back to sign in"
            onPress={() => router.replace('/(auth)')}
            shape="pill"
            className="w-full mt-8"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-navy" edges={['top', 'bottom']}>
      <NavyGlowBackdrop />
      <View className="flex-1 items-center justify-center px-8">
        <Typography className="text-[14px] text-white/[0.55] text-center">
          Signing you in&hellip;
        </Typography>
      </View>
    </SafeAreaView>
  );
}
