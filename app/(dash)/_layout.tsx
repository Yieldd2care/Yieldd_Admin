import { Platform } from 'react-native';
import { Redirect, Stack } from 'expo-router';

import { useSessionStore } from '../../stores/useSessionStore';
import { useLeadsSync } from '../../hooks/useLeadsSync';

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

  // The same sync the phone runs, mounted once for the dashboard too.
  //
  // Leaving it out was why /leads and /follow-ups showed "No leads yet" on an
  // account with 64 of them: both read `useLeadsStore`, and nothing on web ever
  // filled it. Team and the pipeline chart looked fine throughout because they
  // ask the server directly — which is exactly what made the bug look like
  // missing data rather than a missing fetch.
  //
  // Above the early returns, because hooks cannot be called conditionally. It
  // no-ops until there is a signed-in user, so native and signed-out both cost
  // nothing.
  useLeadsSync();

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

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F5F7FB' } }}>
      {/*
        A lead opens over the list, not instead of it.

        This one option is what makes that possible. The web stack renders every
        screen absolutely filled and sets `display: none` on all but the focused
        one — unless the screen above it is presented transparently, which is
        the case this names. React keeps a hidden screen mounted either way, so
        the search box and the page number would survive; the scroll position
        would not, because a browser resets `scrollTop` on a subtree it has
        stopped laying out. The list has to stay laid out, not merely alive.

        `contentStyle` has to be overridden too: the default above paints every
        screen's content #F5F7FB, and an opaque background over the list is the
        whole thing this is trying to avoid.

        `app/(dash)/leads/[id].tsx` decides which presentation to draw. Arriving
        with nothing underneath — a fresh tab on `/leads/<id>` — it renders a
        full page, and a transparent screen with a full page inside it looks
        exactly like a page.
      */}
      <Stack.Screen
        name="leads/[id]"
        options={{ presentation: 'transparentModal', contentStyle: { backgroundColor: 'transparent' } }}
      />
    </Stack>
  );
}
