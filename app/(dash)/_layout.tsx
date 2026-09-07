import { Platform } from 'react-native';
import { Redirect, Stack } from 'expo-router';

import { useSessionStore } from '../../stores/useSessionStore';

/**
 * The web dashboard.
 *
 * Two guards, both one-way:
 *   - native never enters here, it belongs in `(app)` with the tab bar;
 *   - a signed-out browser goes to the marketing site.
 *
 * `app/index.tsx` is what routes a signed-in web visitor in.
 */
export default function DashLayout() {
  const user = useSessionStore((s) => s.user);
  const isInitializing = useSessionStore((s) => s.isInitializing);

  if (Platform.OS !== 'web') {
    return <Redirect href="/(app)" />;
  }

  // The session is still landing. Redirecting now would bounce a signed-in
  // person out to the marketing site, and the redirect is one-way.
  if (isInitializing) {
    return null;
  }

  if (!user) {
    return <Redirect href="/(web)" />;
  }

  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F5F7FB' } }} />;
}
