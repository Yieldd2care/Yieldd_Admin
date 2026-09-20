import '../global.css';
import '../lib/nativewind-interop';

import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';

import { queryClient } from '../lib/queryClient';
import { startAuthAutoRefresh } from '../lib/supabase';
import { useSessionStore } from '../stores/useSessionStore';
import { useConnectivity } from '../hooks/useConnectivity';
import { useLeadsStore } from '../stores/useLeadsStore';
import { AccessRemoved } from '../components/shared/AccessRemoved';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  // Separate single-field selectors on purpose. zustand v5 uses
  // useSyncExternalStore with no shallow compare, so returning a fresh object
  // from one selector throws "getSnapshot should be cached" under React 19.
  const isInitializing = useSessionStore((s) => s.isInitializing);

  // A reference held in the store, never a freshly built object, so the rule
  // above is not broken by reading it here.
  const accessRevoked = useSessionStore((s) => s.accessRevoked);

  // Restore the session once, on mount. initialize() is idempotent.
  useEffect(() => {
    void useSessionStore.getState().initialize();
  }, []);

  // Pause token refresh while backgrounded; the returned cleanup removes the
  // listener, which a module-scope registration could never do.
  useEffect(() => startAuthAutoRefresh(), []);

  const ready = fontsLoaded && !isInitializing;

  // Splash stays up until BOTH fonts and the session check are done —
  // otherwise it hides and the user watches a blank screen while Supabase
  // is still being asked who they are.
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // Connectivity: drives react-query's online state on native, and drains the
  // lead outbox the moment a connection comes back. See the hook for why it is
  // a listener plus a slow backstop rather than the 4-second poll this was.
  useConnectivity();

  // The navigator renders from the very first frame and is never taken away
  // again. Returning null while waiting was a real hazard: anything that
  // flipped `ready` back — a Fast Refresh re-evaluating the session store is
  // enough — unmounted the entire navigation tree underneath whatever was
  // mid-render, and React Navigation threw "Couldn't find a navigation
  // context" at it. Only a screen that re-renders continuously would ever be
  // caught in that window, which is why it looked like a voice-recording bug.
  //
  // Nothing is lost by rendering: the splash above stays up until `ready`, and
  // app/index.tsx holds its redirect until the session is known.
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(web)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
        </Stack>
        {/*
          An overlay, and deliberately neither of the two obvious alternatives.

          Not a route: a pushed screen is one you can swipe back from, and this
          must not be dismissible by a gesture. Rendering it here means nothing
          is on a stack to go back to.

          Not `return <AccessRemoved/>` in place of the Stack either, which is
          the idiom one level down in app/(app)/_layout.tsx. Up HERE that would
          unmount the whole navigation tree — exactly the hazard the comment
          above was written for — and revocation fires from a background
          refreshProfile() that can land while the rep is mid-capture. As a
          sibling, the navigator never moves.

          One insertion point covers native and web, every group, and deep
          links. Underneath it `user` is null, so (app) redirects to /(auth) and
          (dash) to /(web); dismissing therefore lands the rep exactly where a
          signed-out person belongs on each platform, with no extra navigation
          to write.
        */}
        {accessRevoked ? <AccessRemoved notice={accessRevoked} /> : null}
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
