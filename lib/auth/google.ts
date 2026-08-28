// Google sign-in.
//
// Two genuinely different mechanics behind one function:
//
//   web    — a full-page redirect to Google and back. The client is configured
//            with detectSessionInUrl on web, so it picks the `?code=` up itself
//            and this function never returns; the page navigates away.
//   native — an in-app browser tab (SFAuthenticationSession / Custom Tabs).
//            The redirect is captured by openAuthSessionAsync and handed back
//            to us as a string, so the code is exchanged explicitly here.
//
// Both use PKCE (set on the client), so the code is worthless to anything that
// does not hold the verifier this device generated.

import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import Constants, { ExecutionEnvironment } from 'expo-constants';

import { supabase } from '../supabase';

export type OAuthOutcome = { error: string | null; cancelled?: boolean };

/**
 * The error Google or Supabase put in the URL when a sign-in fails — an
 * unenabled provider, a redirect that is not on the allow list, a consent
 * screen the person declined.
 *
 * Read at module scope, deliberately. On web the client is built with
 * detectSessionInUrl, which strips the query string once it has looked at it,
 * and it does that before the callback screen ever mounts. This module is
 * evaluated in the same synchronous pass as lib/supabase, so it always sees
 * the original URL.
 */
export const oauthErrorFromLandingUrl: string | null = (() => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const raw =
    search.get('error_description') ??
    search.get('error') ??
    hash.get('error_description') ??
    hash.get('error');
  // URLSearchParams already turns `+` back into a space, so what comes out is
  // the human sentence Supabase wrote, not the encoded form.
  return raw ? mapOAuthError(raw) : null;
})();

/**
 * Expo Go hands out a redirect of the shape `exp://192.168.1.7:8081/--/…` —
 * a LAN address that changes with the network and therefore cannot be put on
 * Supabase's redirect allow list. Rather than let that fail as an opaque
 * "requested path is invalid", say so plainly.
 */
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/**
 * Is the Google provider actually switched on for this project?
 *
 * Worth a round trip before starting the flow. On web, signInWithOAuth does
 * not check — it navigates straight to /auth/v1/authorize, and if the provider
 * is off, GoTrue answers with a raw JSON error body and never redirects back.
 * The person is left staring at `{"code":400,...}` with no way home. Asking
 * first turns that into a sentence on the sign-in screen.
 *
 * Cached for the session: the answer only changes when the project's auth
 * config is edited, which is not something that happens mid-session.
 */
let googleEnabled: boolean | null = null;

async function isGoogleEnabled(): Promise<boolean> {
  if (googleEnabled !== null) return googleEnabled;

  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;

  try {
    const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } });
    if (!res.ok) return true; // Can't tell — let the real attempt decide.
    const body = (await res.json()) as { external?: Record<string, boolean> };
    googleEnabled = Boolean(body.external?.google);
    return googleEnabled;
  } catch {
    // Offline or blocked. Don't block the attempt on a check that failed for
    // an unrelated reason.
    return true;
  }
}

/** Where Google is told to send the user back to. Must be on the allow list. */
export function googleRedirectUrl(): string {
  if (Platform.OS === 'web') {
    // Back to wherever the app is being served from — localhost in dev,
    // yieldd.co in production — so one build works in both.
    return `${window.location.origin}/auth/callback`;
  }
  // yieldd://auth/callback once the app is a real build.
  return Linking.createURL('auth/callback');
}

export async function signInWithGoogle(): Promise<OAuthOutcome> {
  if (isExpoGo) {
    return {
      error:
        'Google sign-in needs the installed Yieldd app — it cannot work inside Expo Go. Use your email and password here.',
    };
  }

  if (!(await isGoogleEnabled())) {
    return { error: 'Google sign-in is not switched on for this app yet.' };
  }

  const redirectTo = googleRedirectUrl();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      // Web is allowed to navigate away by itself; native must not, because
      // there is no page to navigate.
      skipBrowserRedirect: Platform.OS !== 'web',
      queryParams: {
        // Without this Google silently reuses the last account on the device,
        // which makes "wrong account, let me switch" impossible.
        prompt: 'select_account',
      },
    },
  });

  if (error) return { error: mapOAuthError(error.message) };

  if (Platform.OS === 'web') {
    // The page is already navigating. Resolving here would let the caller
    // render a "done" state over a page that is about to be replaced.
    return { error: null };
  }

  if (!data?.url) return { error: 'Could not start Google sign-in. Try again.' };

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
    // Reuse the system browser's cookies so someone already signed in to
    // Google on this phone is not made to type their password again.
    preferEphemeralSession: false,
  });

  if (result.type !== 'success') {
    // 'cancel' (user dismissed) and 'dismiss' (app backgrounded) are both
    // ordinary. Neither is an error worth putting on screen.
    return { error: null, cancelled: true };
  }

  const code = new URL(result.url).searchParams.get('code');
  if (!code) {
    const description = new URL(result.url).searchParams.get('error_description');
    return { error: description ? mapOAuthError(description) : 'Google sign-in did not complete.' };
  }

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) return { error: mapOAuthError(exchangeError.message) };

  return { error: null };
}

function mapOAuthError(message: string): string {
  if (/provider is not enabled|unsupported provider/i.test(message)) {
    return 'Google sign-in is not switched on for this app yet.';
  }
  if (/redirect|requested path is invalid/i.test(message)) {
    return 'Google sign-in is not configured for this build yet.';
  }
  if (/network|fetch/i.test(message)) {
    return "You're offline. Connect and try again.";
  }
  return message || 'Google sign-in failed. Try again.';
}
