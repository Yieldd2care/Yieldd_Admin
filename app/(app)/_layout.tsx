import { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, Stack, usePathname } from 'expo-router';

import { Typography } from '../../components/ui/Typography';
import { Button } from '../../components/ui/Button';
import { NavyGlowBackdrop } from '../../components/app/NavyGlowBackdrop';
import { useSessionStore } from '../../stores/useSessionStore';
import { useLeadsSync } from '../../hooks/useLeadsSync';
import { profileNeedsCompletion } from '../../types/session';

/**
 * Shown when the session is valid but the profile could not be loaded.
 *
 * Redirecting to /(auth) here would loop forever: the session is live, so the
 * sign-in screen's own guard would send the user straight back.
 */
function AccountUnavailable() {
  const [retrying, setRetrying] = useState(false);

  const retry = async () => {
    setRetrying(true);
    await useSessionStore.getState().refreshProfile();
    setRetrying(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-navy" edges={['top', 'bottom']}>
      <NavyGlowBackdrop />
      <View className="flex-1 justify-center px-8">
        <Typography className="text-[22px] font-extrabold text-white text-center tracking-[-0.01em]">
          We couldn&rsquo;t load your account
        </Typography>
        <Typography className="mt-3 text-[13.5px] leading-[1.55] text-white/[0.60] text-center">
          You&rsquo;re signed in, but your profile didn&rsquo;t come through. This is usually a
          patchy connection.
        </Typography>

        <Button
          label={retrying ? 'Trying again…' : 'Try again'}
          onPress={retry}
          disabled={retrying}
          shape="pill"
          className={`w-full mt-8 ${retrying ? 'opacity-50' : ''}`}
        />

        <Typography
          onPress={() => useSessionStore.getState().signOut()}
          className="mt-5 text-[12.5px] font-bold text-gold text-center"
        >
          Sign out
        </Typography>
      </View>
    </SafeAreaView>
  );
}

const COMPLETE_PROFILE = '/onboarding/complete-profile';

export default function AppLayout() {
  const user = useSessionStore((s) => s.user);
  const session = useSessionStore((s) => s.session);
  const isInitializing = useSessionStore((s) => s.isInitializing);
  const pathname = usePathname();

  // Before the guards below, because a hook cannot sit after an early return.
  // It no-ops until there is a signed-in user.
  useLeadsSync();

  // The root layout already holds the splash until this is false, but a guard
  // that redirects on a not-yet-known session is exactly how a logged-in user
  // gets bounced to sign-in on cold start. Belt and braces.
  if (isInitializing) return null;

  if (!user) {
    return session ? <AccountUnavailable /> : <Redirect href="/(auth)" />;
  }

  // A contact number is required of every account. The sign-up form enforces
  // it, but Google sign-in cannot — and force-quitting the app on the
  // completion screen would otherwise be a way straight past it. Guarding here
  // rather than only routing there makes it hold on every cold start too.
  if (profileNeedsCompletion(user) && !pathname.endsWith(COMPLETE_PROFILE)) {
    return <Redirect href="/(app)/onboarding/complete-profile" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
