import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthError, Session } from '@supabase/supabase-js';

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { resetQueryCache } from '../lib/queryClient';
import { PROFILE_SELECT, toSessionUser } from '../lib/mappers/profile';
import { signInWithGoogle as startGoogleSignIn } from '../lib/auth/google';
import { normalizePhone } from '../lib/phone';
import type { AuthResult, SessionState, User } from '../types/session';

const NOT_CONFIGURED: AuthResult = {
  error: 'This build has no Supabase connection. See the console for setup steps.',
};

// ---------------------------------------------------------------------------
// Module-scope singletons.
//
// These live outside the store so Fast Refresh resets them together with it.
// initPromise makes initialize() idempotent; authSubscription stops a reload
// from stacking listeners.
// ---------------------------------------------------------------------------

let initPromise: Promise<void> | null = null;
let authSubscription: { unsubscribe: () => void } | null = null;

/**
 * Auth events are handled through one serial queue.
 *
 * The callback passed to onAuthStateChange must return synchronously — supabase
 * awaits subscribers in order, so a slow handler stalls the next event. But
 * firing bare setTimeouts would let SIGNED_IN and SIGNED_OUT land in the same
 * tick and resolve in either order. A queue gives both: the callback returns
 * immediately, and the work still runs in the order the events arrived.
 */
let authQueue: Promise<void> = Promise.resolve();
function enqueue(work: () => Promise<void>) {
  authQueue = authQueue.then(work).catch((err) => {
    if (__DEV__) console.warn('[session] auth event failed', err);
  });
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(fallback);
      });
  });
}

/**
 * GoTrue message strings are not a stable API — they change between releases.
 * `code` is, so key on it and fall back to the message only for transport
 * errors, which have no code.
 */
function mapAuthError(error: AuthError): string {
  const code = (error as AuthError & { code?: string }).code ?? '';
  const message = error.message ?? '';

  switch (code) {
    case 'invalid_credentials':
      return 'Email or password is incorrect.';
    case 'user_already_exists':
    case 'email_exists':
      return 'That email already has an account — sign in instead.';
    case 'weak_password':
      return 'Use at least 8 characters.';
    case 'email_address_invalid':
      return "That email address doesn't look right.";
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'Too many attempts. Wait a minute and try again.';
    case 'email_not_confirmed':
      return 'Confirm your email address, then sign in.';
    case 'unexpected_failure':
      if (__DEV__) console.error('[session] server-side signup failure', error);
      return 'We could not finish setting up your account. Please try again.';
  }

  // A raise inside handle_new_user() arrives as an AuthRetryableFetchError with
  // status 500, NO code, and this exact message — verified against the live
  // project. Matching on the message is the only option, and without it the
  // user is shown the words "Database error saving new user".
  //
  // By far the likeliest cause is a stale invite token, so the copy points
  // there. The invite screen validates with peek_invite first; this is the
  // backstop for a link that expired between opening it and signing up.
  if (/database error saving new user/i.test(message)) {
    if (__DEV__) console.error('[session] signup trigger raised', error);
    return 'We could not finish setting up your account. If you followed an invite link, ask for a fresh one.';
  }

  if (/network request failed|failed to fetch|networkerror/i.test(message)) {
    return "You're offline. Connect and try again.";
  }
  return message || 'Something went wrong. Please try again.';
}

// ---------------------------------------------------------------------------

type ProfileFetch = { user: User | null; offline: boolean };

async function fetchProfile(userId: string): Promise<ProfileFetch> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_SELECT)
      .eq('id', userId)
      .single();

    if (error || !data) {
      if (__DEV__ && error) console.warn('[session] profile fetch failed', error.message);
      // Distinguishing transport failure from "no such row" decides whether we
      // keep a working offline session or tear it down.
      const offline = /network|fetch|timeout/i.test(error?.message ?? '');
      return { user: null, offline };
    }
    return { user: toSessionUser(data as never), offline: false };
  } catch (err) {
    if (__DEV__) console.warn('[session] profile fetch threw', err);
    return { user: null, offline: true };
  }
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      isInitializing: true,
      isSubmitting: false,
      isNewSignup: false,
      pendingInviteToken: null,

      // ---------------------------------------------------------------- init
      initialize: async () => {
        if (initPromise) return initPromise;

        initPromise = (async () => {
          try {
            // skipHydration is on, so this is deterministic — there is no
            // window where `user` is transiently null because the persisted
            // state has not landed yet.
            await useSessionStore.persist.rehydrate();

            if (!isSupabaseConfigured) {
              set({ user: null, session: null });
              return;
            }

            // getSession reads local storage, but can attempt a refresh when
            // the access token has expired. Cap it so a dead network cannot
            // hold the splash screen open forever.
            const { data } = await withTimeout(
              supabase.auth.getSession(),
              8000,
              { data: { session: null }, error: null } as Awaited<
                ReturnType<typeof supabase.auth.getSession>
              >
            );

            const session = data.session ?? null;

            if (!session) {
              set({ user: null, session: null });
            } else {
              const cached = get().user;
              set({
                session,
                // The cache is only ever trusted when it belongs to THIS
                // session. That keeps an offline cold start working while
                // making a stale or foreign cached profile impossible.
                user: cached && cached.id === session.user.id ? cached : null,
              });
              // Refresh in the background — an offline start keeps the cache.
              void get().refreshProfile();
            }
          } finally {
            // Always flips, even if something above threw. Without this a
            // single failure leaves the app rendering nothing, permanently.
            set({ isInitializing: false });

            // Subscribe last, so the initial state is already settled.
            authSubscription?.unsubscribe();
            if (isSupabaseConfigured) {
              const { data: sub } = supabase.auth.onAuthStateChange((event, nextSession) => {
                enqueue(() => handleAuthEvent(event, nextSession));
              });
              authSubscription = sub.subscription;
            }
          }
        })();

        try {
          await initPromise;
        } catch (err) {
          // Allow a later retry rather than caching the rejection forever.
          initPromise = null;
          throw err;
        }
      },

      // ------------------------------------------------------------- profile
      refreshProfile: async () => {
        const session = get().session;
        if (!session || !isSupabaseConfigured) return;

        let result = await fetchProfile(session.user.id);

        if (!result.user && !result.offline) {
          // handle_new_user() commits inside the auth.users insert, but GoTrue
          // and PostgREST are separate services — one retry costs nothing and
          // removes a confusing "profile not found" on the very first signup.
          await new Promise((r) => setTimeout(r, 400));
          result = await fetchProfile(session.user.id);
        }

        if (result.user) {
          set({ user: result.user });
          return;
        }

        if (result.offline) {
          // Keep whatever cached profile we have — this is the exhibition-hall
          // case, and a working session must survive it.
          return;
        }

        // Reachable server, valid session, but no profile row: genuinely
        // broken. Better to sign out than to sit half-authenticated.
        if (!get().user) {
          if (__DEV__) console.warn('[session] session valid but profile missing; signing out');
          await get().signOut();
        }
      },

      // -------------------------------------------------------------- signup
      signUp: async ({ name, company, phone, email, password }) => {
        if (!isSupabaseConfigured) return NOT_CONFIGURED;

        set({ isSubmitting: true });
        const inviteToken = get().pendingInviteToken;

        // Normalised here rather than in the screen so every path that creates
        // an account stores the number in the same shape. handle_new_user()
        // reads exactly these four keys.
        const normalizedPhone = normalizePhone(phone);

        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: {
              full_name: name.trim(),
              company_name: company.trim(),
              ...(normalizedPhone ? { phone: normalizedPhone } : {}),
              ...(inviteToken ? { invite_token: inviteToken } : {}),
            },
          },
        });

        if (error) {
          // Cleared on failure too — a bad token must not linger and silently
          // attach the next signup on this device to someone else's org.
          set({ isSubmitting: false, pendingInviteToken: null });
          return { error: mapAuthError(error) };
        }

        if (!data.session) {
          // Possible if email confirmation is ever turned back on.
          set({ isSubmitting: false, pendingInviteToken: null });
          return { error: 'Check your inbox to confirm your email, then sign in.' };
        }

        set({ session: data.session });

        // Must not resolve before `user` is set. The screen navigates the
        // moment this returns, and the destination sits behind a guard that
        // reads `user` — returning early lands on the sign-in screen instead.
        await get().refreshProfile();

        set({ isSubmitting: false, isNewSignup: true, pendingInviteToken: null });
        return { error: null };
      },

      // -------------------------------------------------------------- signin
      signIn: async ({ email, password }) => {
        if (!isSupabaseConfigured) return NOT_CONFIGURED;

        set({ isSubmitting: true });

        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (error) {
          set({ isSubmitting: false });
          return { error: mapAuthError(error) };
        }

        set({ session: data.session });
        await get().refreshProfile();
        set({ isSubmitting: false, isNewSignup: false });
        return { error: null };
      },

      // -------------------------------------------------------------- google
      signInWithGoogle: async () => {
        if (!isSupabaseConfigured) return NOT_CONFIGURED;

        set({ isSubmitting: true });
        const outcome = await startGoogleSignIn();

        if (outcome.error || outcome.cancelled) {
          set({ isSubmitting: false });
          return outcome;
        }

        // Web has already navigated away at this point; native has a session.
        // onAuthStateChange fires SIGNED_IN either way, but that runs through
        // the serial queue and the screen navigates the instant this resolves —
        // so load the profile here too rather than racing the queue.
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          set({ session: data.session });
          await get().refreshProfile();
        }

        set({ isSubmitting: false });
        return outcome;
      },

      // ------------------------------------------------------ profile writes
      updateProfile: async ({ name, designation, phone, company }) => {
        if (!isSupabaseConfigured) return NOT_CONFIGURED;

        const user = get().user;
        if (!user) return { error: 'Not signed in.' };

        const columns: { full_name?: string; designation?: string; phone?: string } = {};
        const next: Partial<User> = {};

        const trimmedName = name?.trim();
        if (trimmedName && trimmedName !== user.name) {
          columns.full_name = trimmedName;
          next.name = trimmedName;
        }

        // Cleared deliberately when emptied — designation is optional, and
        // there has to be a way to remove a wrong one.
        if (designation !== undefined) {
          const trimmed = designation.trim();
          if (trimmed !== (user.designation ?? '')) {
            columns.designation = trimmed;
            next.designation = trimmed || null;
          }
        }

        if (phone !== undefined) {
          const normalized = normalizePhone(phone);
          if (normalized && normalized !== user.phone) {
            columns.phone = normalized;
            next.phone = normalized;
          }
        }

        if (Object.keys(columns).length > 0) {
          const { error } = await supabase.from('profiles').update(columns).eq('id', user.id);
          if (error) return { error: error.message };
        }

        const nextCompany = company?.trim();
        // A rep cannot rename the organisation they were invited into. Not an
        // error worth failing the whole save on — everything else they changed
        // is theirs and has already been written.
        if (nextCompany && nextCompany !== user.company && user.role === 'admin') {
          // org_admin_update matches zero rows rather than erroring for a
          // non-admin, so count rows instead of trusting `error`.
          const { data, error: orgError } = await supabase
            .from('organizations')
            .update({ name: nextCompany })
            .eq('id', user.organizationId)
            .select('id');

          if (orgError) return { error: orgError.message };
          if (!data || data.length === 0) return { error: 'Only an admin can change this.' };
          next.company = nextCompany;
        }

        if (Object.keys(next).length > 0) set({ user: { ...user, ...next } });
        return { error: null };
      },

      // --------------------------------------------------- profile completion
      completeProfile: async ({ phone, company }) => {
        if (!normalizePhone(phone)) return { error: 'Enter a contact number.' };
        return get().updateProfile({ phone, company });
      },

      // ------------------------------------------------------------- signout
      signOut: async () => {
        // Clear locally regardless of what the network says. supabase-js can
        // report a transport error having already dropped the local session;
        // bailing on that error leaves the app "signed in" with no session,
        // every request 401ing, and the button looking broken.
        try {
          await supabase.auth.signOut();
        } catch {
          /* ignore — local state is cleared either way */
        }

        set({ user: null, session: null, isNewSignup: false, pendingInviteToken: null });
        resetQueryCache();
        void useSessionStore.persist.clearStorage();
      },

      // --------------------------------------------------------------- misc
      setPendingInviteToken: (token) => set({ pendingInviteToken: token }),

      setAccountIntent: async (intent) => {
        const user = get().user;
        if (!user) return { error: 'Not signed in.' };

        // org_admin_update requires is_admin(). A rep's update would match zero
        // rows and return no error at all, so count the rows rather than
        // trusting a null error.
        const { data, error } = await supabase
          .from('organizations')
          .update({ onboarding_intent: intent })
          .eq('id', user.organizationId)
          .select('id');

        if (error) return { error: error.message };
        if (!data || data.length === 0) {
          return { error: 'Only an admin can change this.' };
        }

        set({ user: { ...user, onboardingIntent: intent } });
        return { error: null };
      },
    }),
    {
      name: 'yieldd-session',
      storage: createJSONStorage(() => AsyncStorage),
      // Only a cache of the profile, so an offline cold start still knows who
      // it is. Never the session itself — supabase owns that, under its own key.
      partialize: (state) => ({
        user: state.user,
        pendingInviteToken: state.pendingInviteToken,
      }),
      // Hydration is driven explicitly from initialize(), which removes the
      // race where the first frames render before persisted state lands.
      skipHydration: true,
      version: 2,
      // v1 held a fabricated mock user ("Priya Sharma", usr_* ids). Drop it.
      migrate: () => ({ user: null, pendingInviteToken: null }),
    }
  )
);

/** Runs serialized, off the auth callback's own tick. */
async function handleAuthEvent(event: string, session: Session | null) {
  const store = useSessionStore.getState();

  switch (event) {
    case 'INITIAL_SESSION':
      // initialize() already read this via getSession(). Handling it here too
      // would mean two profile fetches on every cold start.
      return;

    case 'TOKEN_REFRESHED':
      // Fires roughly hourly. The profile has not changed; refetching it here
      // would put a network request on a timer forever.
      useSessionStore.setState({ session });
      return;

    case 'SIGNED_IN':
    case 'USER_UPDATED': {
      useSessionStore.setState({ session });
      if (session && session.user.id !== store.user?.id) {
        await useSessionStore.getState().refreshProfile();
      }
      return;
    }

    case 'SIGNED_OUT': {
      // Can arrive unprompted — refresh-token rotation is on with a 10s reuse
      // window, so a second device or a duplicated client can invalidate this
      // one. Without handling it the app keeps rendering signed-in screens
      // against a dead session.
      useSessionStore.setState({
        user: null,
        session: null,
        isNewSignup: false,
        pendingInviteToken: null,
      });
      resetQueryCache();
      void useSessionStore.persist.clearStorage();
      return;
    }
  }
}
