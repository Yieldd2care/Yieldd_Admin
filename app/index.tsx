import { Platform } from 'react-native';
import { Redirect } from 'expo-router';

import { useSessionStore } from '../stores/useSessionStore';

export default function Entry() {
  const user = useSessionStore((s) => s.user);
  const isInitializing = useSessionStore((s) => s.isInitializing);

  // Nothing is known yet, and the splash is still covering these frames.
  // Redirecting now would send a signed-in person to the marketing site or to
  // sign-in, and the redirect is one-way — by the time the session lands this
  // screen has already been replaced. The root layout used to render nothing
  // at all during this window; now that it renders the navigator from the
  // first frame, the waiting has to happen here.
  if (isInitializing) {
    return null;
  }

  // A browser gets the dashboard; a phone keeps the tab bar it always had.
  if (user) {
    return <Redirect href={Platform.OS === 'web' ? '/(dash)' : '/(app)'} />;
  }

  if (Platform.OS === 'web') {
    return <Redirect href="/(web)" />;
  }

  return <Redirect href="/(auth)" />;
}
