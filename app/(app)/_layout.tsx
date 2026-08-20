import { Redirect, Stack } from 'expo-router';

import { useSessionStore } from '../../stores/useSessionStore';

export default function AppLayout() {
  const user = useSessionStore((s) => s.user);

  if (!user) {
    return <Redirect href="/(auth)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
