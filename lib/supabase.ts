// Supabase client singleton.
//
// This module must be the only place createClient is called. It is imported
// transitively by app/_layout.tsx, which also renders the public marketing site
// at app/(web)/ — so anything that throws here takes down yieldd.co, not just
// auth. Hence the soft-fail below rather than a module-scope throw.

// MUST stay the first import. React Native 0.81 ships its own `URL`, but it is
// a regex approximation: it appends a trailing slash to any URL without one and
// is not WHATWG compliant. supabase-js constructs URLs while building requests,
// so the polyfill's side effect has to run before createClient is even imported.
// ES module evaluation is depth-first, so importing it here is sufficient.
import 'react-native-url-polyfill/auto';

import { AppState, Platform, type AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../types/database';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * False when the build had no Supabase credentials compiled into it. The app
 * still boots — the marketing site renders, and the auth screen shows a clear
 * message instead of a white screen.
 *
 * Metro inlines EXPO_PUBLIC_* at build time, so this is decided when the bundle
 * is built, not at runtime: locally from `.env` (restart with `expo start -c`
 * after changing it), on Vercel from the project's Environment Variables.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

if (!isSupabaseConfigured) {
  console.error(
    '[supabase] Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY.\n' +
      '  local  -> add them to .env at the repo root, then restart Metro with `npx expo start -c`\n' +
      '  vercel -> Project Settings > Environment Variables (visibility must be Config, not Secret —\n' +
      '            EXPO_PUBLIC_ values are compiled into the client bundle and cannot be secret)'
  );
}

// Fast Refresh replaces modules but keeps globals. Without this, every reload
// builds another GoTrueClient over the same storage key — two auto-refreshers
// racing one refresh token, which with rotation enabled (10s reuse window on
// this project) signs you out mid-development.
const GLOBAL_KEY = '__yieldd_supabase_client__';
type GlobalWithClient = typeof globalThis & {
  [GLOBAL_KEY]?: SupabaseClient<Database>;
};
const globalRef = globalThis as GlobalWithClient;

export const supabase: SupabaseClient<Database> =
  globalRef[GLOBAL_KEY] ??
  createClient<Database>(
    url ?? 'https://unconfigured.supabase.co',
    anonKey ?? 'unconfigured',
    {
      auth: {
        // AsyncStorage, not SecureStore: SecureStore caps values at ~2KB on
        // iOS and a Supabase session (access JWT + refresh token + user object)
        // routinely exceeds that, failing silently. This is a recorded accepted
        // risk — refresh tokens sit in plaintext storage, mitigated by the
        // 1-hour access-token expiry and refresh-token rotation.
        storage: AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        // PKCE, not the library default of `implicit`. Google sign-in comes
        // back through a redirect, and the implicit flow puts the access and
        // refresh tokens in the URL *fragment* — which is not delivered
        // reliably to a native deep-link handler and ends up in browser
        // history on web. PKCE returns a single-use `?code=` instead.
        //
        // Safe for the existing email flow: mailer_autoconfirm is on, so
        // signUp returns a session directly and never sends a link that a
        // flow type could change.
        flowType: 'pkce',
        // Web comes back to a real URL carrying `?code=`, so the client is
        // allowed to pick it up. Native does not — openAuthSessionAsync hands
        // the URL back to us and the code is exchanged explicitly, so leaving
        // this off keeps the client from parsing every deep link it sees.
        detectSessionInUrl: Platform.OS === 'web',
      },
    }
  );

globalRef[GLOBAL_KEY] = supabase;

/**
 * Pause token refresh while the app is backgrounded and resume on foreground.
 *
 * Called from the root layout's effect rather than at module scope so the
 * listener is actually removed on unmount, and so importing this module stays
 * free of side effects beyond constructing the client.
 */
export function startAuthAutoRefresh(): () => void {
  if (Platform.OS === 'web') return () => {};

  const handle = (state: AppStateStatus) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  };

  handle(AppState.currentState);
  const sub = AppState.addEventListener('change', handle);

  return () => {
    sub.remove();
    supabase.auth.stopAutoRefresh();
  };
}
