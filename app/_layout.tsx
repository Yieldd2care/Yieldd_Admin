import '../global.css';
import '../lib/nativewind-interop';

import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Network from 'expo-network';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider, onlineManager } from '@tanstack/react-query';
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
import { useLeadsStore } from '../stores/useLeadsStore';

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

  // Connectivity: drives react-query's online state on native, and still
  // flushes the mock draft queue until Phase 2's real outbox replaces it.
  useEffect(() => {
    let wasOffline = false;

    // On web, react-query's own online/offline listeners are instant and
    // correct; replacing them with a 4-second poll would be a downgrade.
    const ownsOnlineManager = Platform.OS !== 'web';

    const checkConnectivity = async () => {
      try {
        const state = await Network.getNetworkStateAsync();
        const isOnline = Boolean(state.isConnected && state.isInternetReachable !== false);

        if (ownsOnlineManager) onlineManager.setOnline(isOnline);

        if (!isOnline) {
          wasOffline = true;
        } else if (wasOffline) {
          wasOffline = false;
          useLeadsStore.getState().syncDrafts();
        }
      } catch {
        // ignore transient check failures
      }
    };

    void checkConnectivity();
    const interval = setInterval(checkConnectivity, 4000);
    return () => clearInterval(interval);
  }, []);

  if (!ready) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(web)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
