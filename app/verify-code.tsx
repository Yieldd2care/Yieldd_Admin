import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';

import { Typography } from '../components/ui/Typography';
import { Button } from '../components/ui/Button';
import { AuthPillInput } from '../components/auth/AuthPillInput';
import { AuthLeftPanel } from '../components/auth/AuthLeftPanel';
import { NavyGlowBackdrop } from '../components/app/NavyGlowBackdrop';
import { KeyboardSafe } from '../components/app/KeyboardSafe';
import { MailIcon } from '../components/ui/icons';
import { useSessionStore } from '../stores/useSessionStore';
import { nextRouteAfterAuth } from '../lib/auth/nextRoute';
import { CODE_LENGTH, sendEmailCode, verifyEmailCode, type CodePurpose } from '../lib/auth/emailCode';

/**
 * "Enter the code we emailed you" (PENDING #33a).
 *
 * DELIBERATELY AT THE ROUTE ROOT, NOT INSIDE (auth). Do not move it.
 *
 * app/(auth)/_layout.tsx redirects anyone signed in straight to the app. This
 * screen signs the person in halfway through its own lifetime — verifyOtp
 * returns a session while the screen is still mounted — so inside that group
 * the guard would fire and tear it away mid-verify, before it could route
 * anywhere sensible. app/invite.tsx sits at the root for exactly this reason
 * and says so in its own header.
 *
 * Reached by push, not replace: a typo in the address is the most likely reason
 * to be on this screen and not want to be, so Back has to work.
 */

const RESEND_SECONDS = 30;

export default function VerifyCodeScreen() {
  const params = useLocalSearchParams<{ email?: string; purpose?: string }>();
  const email = typeof params.email === 'string' ? params.email : '';
  const purpose: CodePurpose = params.purpose === 'signin' ? 'signin' : 'signup';

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);

  // Counts down from the moment the screen opens, because a code was just sent
  // to get here. The project's email allowance is 30 an hour and it is shared
  // by everyone, so an un-throttled Resend is one impatient person away from
  // locking the whole product out of sending mail.
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timer.current = setInterval(() => {
      setCooldown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const canSubmit = code.replace(/\D/g, '').length === CODE_LENGTH;

  const editCode = (value: string) => {
    if (error) setError(null);
    // Strip as we go so a pasted "123 456" still works.
    setCode(value.replace(/\D/g, '').slice(0, CODE_LENGTH));
  };

  const submit = async () => {
    if (!canSubmit || checking) return;
    setChecking(true);
    setError(null);

    const result = await verifyEmailCode(email, code);

    if (result.error) {
      setChecking(false);
      setError(result.error);
      return;
    }

    // verifyEmailCode does not resolve until the profile is loaded, so the
    // guard on the destination will see a user. No setChecking(false) — the
    // next line unmounts this screen.
    router.replace(nextRouteAfterAuth(useSessionStore.getState().user));
  };

  const resend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setError(null);
    const result = await sendEmailCode(email, purpose);
    setResending(false);
    if (result.error) setError(result.error);
    else setCooldown(RESEND_SECONDS);
  };

  const body = (
    <View className="w-full max-w-[420px] self-center">
      <View className="items-center">
        <View className="w-[68px] h-[68px] rounded-full bg-gold items-center justify-center">
          <MailIcon size={28} color="#0B132B" strokeWidth={1.9} />
        </View>
        <Typography className="mt-6 text-[23px] font-extrabold text-white text-center tracking-[-0.01em]">
          Check your email
        </Typography>
        <Typography
          className="mt-3 text-[14px] text-white/[0.62] text-center max-w-[300px]"
          style={{ lineHeight: 21 }}
        >
          We sent a {CODE_LENGTH}-digit code to {email || 'your address'}. It expires in an hour.
        </Typography>
      </View>

      <View className="mt-7">
        <AuthPillInput
          placeholder={'0'.repeat(CODE_LENGTH)}
          value={code}
          onChangeText={editCode}
          keyboardType="number-pad"
          maxLength={CODE_LENGTH}
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          autoFocus
          returnKeyType="go"
          onSubmitEditing={() => void submit()}
          className="text-center tracking-[0.4em] text-[18px] font-bold"
        />
      </View>

      {error ? (
        <Typography className="mt-4 text-[12.5px] font-semibold text-[#FF8A8A] text-center leading-[1.45]">
          {error}
        </Typography>
      ) : null}

      <Button
        label={checking ? 'Checking…' : 'Continue'}
        onPress={() => void submit()}
        disabled={!canSubmit || checking}
        shape="pill"
        className={`w-full mt-6 ${!canSubmit || checking ? 'opacity-50' : ''}`}
      />

      <Pressable
        onPress={() => void resend()}
        disabled={cooldown > 0 || resending}
        accessibilityRole="button"
        accessibilityLabel="Send a new code"
        className="self-center mt-5 px-6 py-2 active:opacity-60"
      >
        <Typography
          className={`text-[12.5px] font-bold text-center ${
            cooldown > 0 ? 'text-white/[0.38]' : 'text-gold'
          }`}
        >
          {resending
            ? 'Sending…'
            : cooldown > 0
              ? `Send a new code in ${cooldown}s`
              : 'Send a new code'}
        </Typography>
      </Pressable>

      <Pressable onPress={() => router.back()} className="self-center mt-2 px-6 py-2 active:opacity-60">
        <Typography className="text-[12.5px] font-semibold text-white/[0.62] text-center">
          Use a different email
        </Typography>
      </Pressable>
    </View>
  );

  // The website's sign-in page is a two-column layout and this screen is on the
  // main signup path, so dropping to a bare narrow column here would break the
  // page in the middle of creating an account. The panel is reused, not copied.
  if (Platform.OS === 'web') {
    return (
      <SafeAreaView className="flex-1 bg-navy" edges={['top', 'bottom']}>
        <StatusBar style="light" />
        <ScrollView
          contentContainerClassName="flex-grow lg:flex-row"
          bounces={false}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AuthLeftPanel />
          <View className="flex-1 items-center justify-center px-6 py-10 lg:px-14">
            <NavyGlowBackdrop />
            {body}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-navy" edges={['top', 'bottom']}>
      <StatusBar style="light" />
      <NavyGlowBackdrop />
      {/* The code field autofocuses, so the keyboard is already up when this
          screen arrives — it needs the wrapper more than most (#69). The
          content container is left exactly as it was: `flex-grow justify-center`
          directly on the container grows to the content's own height, so unlike
          a `flex-1` child it has no unreachable-top problem. */}
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
