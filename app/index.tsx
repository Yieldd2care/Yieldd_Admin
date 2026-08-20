import { Platform } from 'react-native';
import { Redirect } from 'expo-router';

import { useSessionStore } from '../stores/useSessionStore';

export default function Entry() {
  const user = useSessionStore((s) => s.user);

  if (user) {
    return <Redirect href="/(app)" />;
  }

  if (Platform.OS === 'web') {
    return <Redirect href="/(web)" />;
  }

  return <Redirect href="/(auth)" />;
}
