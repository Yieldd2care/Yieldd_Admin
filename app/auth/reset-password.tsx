import { useEffect, useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';

import { Typography } from '../../components/ui/Typography';
import { Button } from '../../components/ui/Button';
import { AuthPillInput } from '../../components/auth/AuthPillInput';
import { AuthWebShell } from '../../components/auth/AuthWebShell';
import { NavyGlowBackdrop } from '../../components/app/NavyGlowBackdrop';
import { KeyboardSafe } from '../../components/app/KeyboardSafe';
import { CheckIcon } from '../../components/ui/icons';
import { MIN_PASSWORD } from '../../components/auth/useAuthForm';
import {
  hasRecoverySession,
  redeemRecoveryToken,
  setNewPassword,
} from '../../lib/auth/passwordReset';
import { useSessionStore } from '../../stores/useSessionStore';
import { supabase } from '../../lib/supabase';

/**
 * Where the emailed reset link lands.
 *
 * Deliberately at the route root, outside both (auth) and (app) — the same
 * reason app/auth/callback.tsx is. Following a recovery link CREATES A SESSION:
 * `detectSessionInUrl` exchanges the code before this renders. Inside (auth)
 * the signed-in guard would redirect to the app; inside (app) the person would
 * simply be let in, still not knowing their password. Neither is the screen
 * they came for.
 *
 * The store's handleAuthEvent has no PASSWORD_RECOVERY case, so `user` stays
 * null and no guard anywhere reacts. The supabase client still holds the
 * session, which is what authorises updateUser().
 */

/**
 * The three states that carry no input — checking, done and expired. Centred
 * either way; on the website they sit in the same two-column shell as the
 * sign-in page, so following the emailed link does not drop someone onto a
 * different-looking site than the one they asked for the link on.
 */
function StatusLayout({ children }: { children: ReactNode }) {
  if (Platform.OS === 'web') {
    return (
      <AuthWebShell>
        <View className="items-center">{children}</View>
      </AuthWebShell>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-navy" edges={['top', 'bottom']}>
      <StatusBar style="light" />
      <NavyGlowBackdrop />
      <View className="flex-1 items-center justify-center px-8">{children}</View>
    </SafeAreaView>
  );
}

export default function ResetPasswordScreen() {
  // Every state of this screen renders on two surfaces: a white card on the
  // web, navy on a phone. Platform.OS cannot change during a session, so this
  // never flips under a mounted component - the file already branches on it
  // in StatusLayout and at the end.
  const onLight = Platform.OS === 'web';

  // The emailed link carries `?token_hash=…&type=recovery`. See the note on
  // redeemRecoveryToken: this is what lets the link be opened on a device other
  // than the one that asked for the reset.
  const params = useLocalSearchParams<{ token_hash?: string | string[] }>();
  const raw = params.token_hash;
  const tokenHash = (Array.isArray(raw) ? raw[0] : raw) ?? '';

  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    // The OLD link shape (`?code=`). The exchange happens asynchronously as the
    // page loads, so a single check on mount can run before the session exists.
    // Poll briefly instead of telling someone with a perfectly good link that it
    // expired. Kept so links already sitting in an inbox still work.
    const pollForSession = async () => {
      const ok = await hasRecoverySession();
      if (cancelled) return;
      if (ok) {
        setValid(true);
        setChecking(false);
        return;
      }
      attempts += 1;
      if (attempts >= 6) {
        setChecking(false);
        return;
      }
      setTimeout(() => void pollForSession(), 500);
    };

    const start = async () => {
      if (tokenHash) {
        const ok = await redeemRecoveryToken(tokenHash);
        if (cancelled) return;
        if (ok) {
          setValid(true);
          setChecking(false);
          return;
        }
        // A refresh of this page replays a token that is already spent, but the
        // session it created is still here and still good. Without this, using
        // the link and then hitting reload would say "expired" to someone who is
        // one field away from finishing.
        const existing = await hasRecoverySession();
        if (cancelled) return;
        setValid(existing);
        setChecking(false);
        return;
      }

      void pollForSession();
    };

    void start();
    return () => {
      cancelled = true;
    };
  }, [tokenHash]);

  const tooShort = password.length > 0 && password.length < MIN_PASSWORD;
  const mismatch = confirm.length > 0 && password !== confirm;
  const canSave =
    password.length >= MIN_PASSWORD && password === confirm && !saving;

  const submit = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    const outcome = await setNewPassword(password);

    if (!outcome.ok) {
      setSaving(false);
      setError(outcome.message);
      return;
    }

    /*
      Signed out on purpose after a successful change.

      The recovery session would let them straight in, but then the first time
      the new password is actually used is days later, on another device, with
      no way to tell whether it saved. Signing in with it once, now, proves it —
      and it clears any half-initialised state from a session the store never
      tracked.
    */
    await supabase.auth.signOut();
    useSessionStore.setState({ user: null, session: null });
    setSaving(false);
    setDone(true);
  };

  if (checking) {
    return (
      <StatusLayout>
        <Typography className={`text-[14px] ${onLight ? 'text-slate' : 'text-white/[0.62]'}`}>Checking your link…</Typography>
      </StatusLayout>
    );
  }

  if (done) {
    return (
      <StatusLayout>
          <View className="w-[68px] h-[68px] rounded-full bg-gold items-center justify-center">
            <CheckIcon size={30} color="#0B132B" strokeWidth={2.6} />
          </View>
          <Typography className={`mt-6 text-[23px] font-extrabold text-center tracking-[-0.01em] ${onLight ? 'text-navy' : 'text-white'}`}>
            Password changed
          </Typography>
          <Typography
            className={`mt-3 text-[14px] text-center max-w-[300px] ${onLight ? 'text-slate' : 'text-white/[0.62]'}`}
            style={{ lineHeight: 21 }}
          >
            Sign in with your new password. If you were signed in anywhere else, that stays
            signed in.
          </Typography>
          <Button
            label="Sign in"
            onPress={() => router.replace('/(auth)')}
            className="mt-8 w-full max-w-[320px]"
          />
      </StatusLayout>
    );
  }

  if (!valid) {
    return (
      <StatusLayout>
          <Typography className={`text-[21px] font-extrabold text-center tracking-[-0.01em] ${onLight ? 'text-navy' : 'text-white'}`}>
            This link has expired
          </Typography>
          <Typography
            className={`mt-3 text-[14px] text-center max-w-[300px] ${onLight ? 'text-slate' : 'text-white/[0.62]'}`}
            style={{ lineHeight: 21 }}
          >
            Reset links work once and last an hour. Ask for a new one and open it as soon as it
            arrives.
          </Typography>
          <Button
            label="Send a new link"
            onPress={() => router.replace('/(auth)/forgot-password')}
            className="mt-8 w-full max-w-[320px]"
          />
      </StatusLayout>
    );
  }

  const body = (
    <>
        <Typography className={`text-[26px] font-extrabold tracking-[-0.01em] ${onLight ? 'text-navy' : 'text-white'}`}>
          Set a new password
        </Typography>
        <Typography className={`mt-3 text-[14px] ${onLight ? 'text-slate' : 'text-white/[0.62]'}`} style={{ lineHeight: 21 }}>
          At least {MIN_PASSWORD} characters. Choose something you have not used here before.
        </Typography>

        <View className="mt-7 gap-3">
          <AuthPillInput
            className={onLight ? 'border border-hairline' : ''}
            placeholder="New password"
            value={password}
            onChangeText={(v) => {
              if (error) setError(null);
              setPassword(v);
            }}
            secureTextEntry
            autoComplete="new-password"
          />
          <AuthPillInput
            className={onLight ? 'border border-hairline' : ''}
            placeholder="Type it again"
            value={confirm}
            onChangeText={(v) => {
              if (error) setError(null);
              setConfirm(v);
            }}
            secureTextEntry
            autoComplete="new-password"
            onSubmitEditing={() => void submit()}
            returnKeyType="done"
          />
        </View>

        {/* Told while typing rather than on submit — the second field is where
            a typo actually happens, and finding out after a round trip is worse. */}
        {tooShort ? (
          <Typography className={`mt-4 text-[12.5px] font-semibold text-center ${onLight ? 'text-slate' : 'text-white/[0.55]'}`}>
            {MIN_PASSWORD - password.length} more character
            {MIN_PASSWORD - password.length === 1 ? '' : 's'} needed.
          </Typography>
        ) : mismatch ? (
          <Typography className={`mt-4 text-[12.5px] font-semibold text-center ${onLight ? 'text-[#C23B3B]' : 'text-[#FF8A8A]'}`}>
            Those two do not match.
          </Typography>
        ) : null}

        {error ? (
          <Typography className={`mt-4 text-[12.5px] font-semibold text-center leading-[1.45] ${onLight ? 'text-[#C23B3B]' : 'text-[#FF8A8A]'}`}>
            {error}
          </Typography>
        ) : null}

        <Button
          label={saving ? 'Saving…' : 'Save new password'}
          onPress={() => void submit()}
          disabled={!canSave}
          className="mt-6"
        />

        <Pressable onPress={() => router.replace('/(auth)')} className="mt-7 self-center">
          <Typography className={`text-[13.5px] font-semibold ${onLight ? 'text-slate' : 'text-white/[0.75]'}`}>Cancel</Typography>
        </Pressable>
    </>
  );

  // Same reason as forgot-password: this is the middle of the website's own
  // sign-in flow, so it keeps the website's two-column layout instead of
  // stretching two password fields across a 1536px window.
  if (Platform.OS === 'web') {
    return <AuthWebShell>{body}</AuthWebShell>;
  }

  return (
    <SafeAreaView className="flex-1 bg-navy" edges={['top', 'bottom']}>
      <StatusBar style="light" />
      <NavyGlowBackdrop />
      {/*
        Two password fields and a Save button stacked below the middle of the
        screen, so the keyboard covered the lower half with nothing to scroll
        (#69). Only this branch changes — the checking, done and expired states
        above have no input on them.

        Note this route is reached from the emailed link, which opens in a
        BROWSER even on a phone (see the note on forgot-password), so this is
        the one screen in #69 that cannot be checked on a handset today. It
        becomes a real phone screen the moment App Links ship.
      */}
      <KeyboardSafe>
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-8 py-10"
          bounces={false}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {body}
        </ScrollView>
      </KeyboardSafe>
    </SafeAreaView>
  );
}
