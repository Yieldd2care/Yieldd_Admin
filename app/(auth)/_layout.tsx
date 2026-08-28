import { Redirect, Stack } from 'expo-router';

import { useSessionStore } from '../../stores/useSessionStore';

export default function AuthLayout() {
  const user = useSessionStore((s) => s.user);
  const isInitializing = useSessionStore((s) => s.isInitializing);

  if (isInitializing) return null;

  // A signed-in person has no business on the sign-in screen. This is safe only
  // because the fork screen now lives under (app) — while it sat here, a
  // just-signed-up user was authenticated and would have been bounced off it
  // before they could choose.
  if (user) return <Redirect href="/(app)" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
