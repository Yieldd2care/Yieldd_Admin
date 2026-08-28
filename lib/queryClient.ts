// The app's single QueryClient.
//
// It lives here rather than inside app/_layout.tsx so the session store can
// clear it on sign-out without importing the layout (which would be a cycle).
// Clearing matters: without it, signing out and signing in as someone else
// serves the previous account's cached rows on first render.

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // This app is used on exhibition-hall mobile data. The v5 defaults
      // (retry: 3 with backoff, staleTime: 0) mean every screen refetches on
      // mount and hammers a flaky connection.
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});

/** Called on sign-out so no cached data survives into the next session. */
export function resetQueryCache() {
  queryClient.cancelQueries();
  queryClient.clear();
}
