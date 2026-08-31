import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../../components/ui/Typography';
import { Button } from '../../components/ui/Button';
import { AuthPillInput } from '../../components/auth/AuthPillInput';
import { NavyGlowBackdrop } from '../../components/app/NavyGlowBackdrop';
import { CheckIcon } from '../../components/ui/icons';
import { MIN_PASSWORD } from '../../components/auth/useAuthForm';
import { hasRecoverySession, setNewPassword } from '../../lib/auth/passwordReset';
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
export default function ResetPasswordScreen() {
  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The code exchange happens asynchronously as the page loads, so a single
  // check on mount can run before the session exists. Poll briefly instead of
  // telling someone with a perfectly good link that it expired.
  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    const check = async () => {
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
      setTimeout(() => void check(), 500);
    };

    void check();
    return () => {
      cancelled = true;
    };
  }, []);

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
      <SafeAreaView className="flex-1 bg-navy" edges={['top', 'bottom']}>
        <NavyGlowBackdrop />
        <View className="flex-1 items-center justify-center px-8">
          <Typography className="text-[14px] text-white/[0.62]">Checking your link…</Typography>
        </View>
      </SafeAreaView>
    );
  }

  if (done) {
    return (
      <SafeAreaView className="flex-1 bg-navy" edges={['top', 'bottom']}>
        <NavyGlowBackdrop />
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-[68px] h-[68px] rounded-full bg-gold items-center justify-center">
            <CheckIcon size={30} color="#0B132B" strokeWidth={2.6} />
          </View>
          <Typography className="mt-6 text-[23px] font-extrabold text-white text-center tracking-[-0.01em]">
            Password changed
          </Typography>
          <Typography
            className="mt-3 text-[14px] text-white/[0.62] text-center max-w-[300px]"
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
        </View>
      </SafeAreaView>
    );
  }

  if (!valid) {
    return (
      <SafeAreaView className="flex-1 bg-navy" edges={['top', 'bottom']}>
        <NavyGlowBackdrop />
        <View className="flex-1 items-center justify-center px-8">
          <Typography className="text-[21px] font-extrabold text-white text-center tracking-[-0.01em]">
            This link has expired
          </Typography>
          <Typography
            className="mt-3 text-[14px] text-white/[0.62] text-center max-w-[300px]"
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
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-navy" edges={['top', 'bottom']}>
      <NavyGlowBackdrop />
      <View className="flex-1 px-8 justify-center">
        <Typography className="text-[26px] font-extrabold text-white tracking-[-0.01em]">
          Set a new password
        </Typography>
        <Typography className="mt-3 text-[14px] text-white/[0.62]" style={{ lineHeight: 21 }}>
          At least {MIN_PASSWORD} characters. Choose something you have not used here before.
        </Typography>

        <View className="mt-7 gap-3">
          <AuthPillInput
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
          <Typography className="mt-4 text-[12.5px] font-semibold text-white/[0.55] text-center">
            {MIN_PASSWORD - password.length} more character
            {MIN_PASSWORD - password.length === 1 ? '' : 's'} needed.
          </Typography>
        ) : mismatch ? (
          <Typography className="mt-4 text-[12.5px] font-semibold text-[#FF8A8A] text-center">
            Those two do not match.
          </Typography>
        ) : null}

        {error ? (
          <Typography className="mt-4 text-[12.5px] font-semibold text-[#FF8A8A] text-center leading-[1.45]">
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
          <Typography className="text-[13.5px] font-semibold text-white/[0.75]">Cancel</Typography>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
