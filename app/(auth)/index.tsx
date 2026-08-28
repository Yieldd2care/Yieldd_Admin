import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MotiView } from 'moti';

import { Typography } from '../../components/ui/Typography';
import { Button } from '../../components/ui/Button';
import { RadialGlow } from '../../components/ui/RadialGlow';
import { AuthPillInput } from '../../components/auth/AuthPillInput';
import { AuthTabs, type AuthMode } from '../../components/auth/AuthTabs';
import { GoogleButton } from '../../components/auth/GoogleButton';
import { NavyGlowBackdrop } from '../../components/app/NavyGlowBackdrop';
import { useSessionStore } from '../../stores/useSessionStore';
import { nextRouteAfterAuth } from '../../lib/auth/nextRoute';
import { isValidPhone } from '../../lib/phone';

const COPY: Record<AuthMode, { headline: string; subhead: string }> = {
  create: {
    headline: 'Your next event starts here.',
    subhead: 'Capture leads in seconds — even with zero signal.',
  },
  signin: {
    headline: 'Welcome back.',
    subhead: 'Pick up right where the show floor left off.',
  },
};

// Matches password_min_length on the Supabase project. Checked here too so the
// user is told before a round-trip, not after.
const MIN_PASSWORD = 8;

export default function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>('create');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const signUp = useSessionStore((s) => s.signUp);
  const signIn = useSessionStore((s) => s.signIn);
  const signInWithGoogle = useSessionStore((s) => s.signInWithGoogle);
  const isSubmitting = useSessionStore((s) => s.isSubmitting);
  const pendingInviteToken = useSessionStore((s) => s.pendingInviteToken);

  const isCreate = mode === 'create';
  // Google hands back a name and an email and nothing else, and there is no way
  // to carry an invite token through the OAuth round trip. Someone holding one
  // would quietly land in a brand new organisation of their own instead of the
  // one that invited them, so the door is closed rather than left ajar.
  const inviteBlocksGoogle = Boolean(pendingInviteToken);
  const canSubmit = Boolean(
    isCreate
      ? name.trim() && company.trim() && phone.trim() && email.trim() && password.trim()
      : email.trim() && password.trim()
  );

  // Any edit invalidates the last error — leaving it on screen while the user
  // fixes the thing it complained about reads as broken.
  const edit = (setter: (v: string) => void) => (value: string) => {
    if (error) setError(null);
    setter(value);
  };

  const changeMode = (next: AuthMode) => {
    setError(null);
    setMode(next);
  };

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;
    setError(null);

    if (isCreate && !isValidPhone(phone)) {
      setError('Enter a contact number with at least 10 digits.');
      return;
    }

    if (isCreate && password.length < MIN_PASSWORD) {
      setError(`Use at least ${MIN_PASSWORD} characters for your password.`);
      return;
    }

    const usedInvite = Boolean(pendingInviteToken);
    const result = isCreate
      ? await signUp({ name, company, phone, email, password })
      : await signIn({ email, password });

    if (result.error) {
      setError(result.error);
      return;
    }

    // signUp and signIn both resolve only once the profile is loaded, so the
    // guard on the destination will see a user and let us through.
    router.replace(
      nextRouteAfterAuth(useSessionStore.getState().user, { joinedViaInvite: usedInvite })
    );
  };

  const handleGoogle = async () => {
    if (isSubmitting || inviteBlocksGoogle) return;
    setError(null);

    const outcome = await signInWithGoogle();
    // Dismissing the browser is an ordinary thing to do, not an error.
    if (outcome.cancelled) return;
    if (outcome.error) {
      setError(outcome.error);
      return;
    }

    // On web the page is already on its way to Google and there is nothing to
    // route. On native the session has landed and the profile is loaded.
    if (Platform.OS === 'web') return;
    router.replace(nextRouteAfterAuth(useSessionStore.getState().user));
  };

  const devEmail = process.env.EXPO_PUBLIC_DEV_EMAIL;
  const devPassword = process.env.EXPO_PUBLIC_DEV_PASSWORD;

  return (
    <SafeAreaView className="flex-1 bg-navy" edges={['top', 'bottom']}>
      <NavyGlowBackdrop />
      <RadialGlow color="#F4B000" size={280} style={{ bottom: -190, right: -90 }} />
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerClassName="flex-grow"
          bounces={false}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <MotiView
            from={{ opacity: 0, translateY: -10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 520 }}
            style={{ alignItems: 'center' }}
            className="pt-8 px-8"
          >
            {/*
              The horizontal lockup, keyed off the dark background baked into
              the source file so it sits on the navy and the gold glow without
              a visible box. Sized to its own 264x79 ratio — the previous asset
              was the near-square stacked lockup inside a wide box, so `contain`
              fitted it to the height and it rendered tiny (PENDING.md #1).
            */}
            <Image
              source={require('../../assets/brand/yieldd-secondary-lockup-transparent.png')}
              style={{ width: 184, height: 55 }}
              resizeMode="contain"
            />
            <Typography className="mt-7 text-[21px] font-extrabold text-white text-center tracking-[-0.01em]">
              {COPY[mode].headline}
            </Typography>
            <Typography className="mt-[6px] text-[13px] leading-[1.5] text-white/[0.55] text-center px-4">
              {COPY[mode].subhead}
            </Typography>
          </MotiView>

          <View className="mx-8 mt-7">
            <AuthTabs mode={mode} onChange={changeMode} />
          </View>

          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 520, delay: 120 }}
            className="px-8 pt-6"
          >
            <GoogleButton
              onPress={handleGoogle}
              disabled={isSubmitting || inviteBlocksGoogle}
              className={inviteBlocksGoogle ? 'opacity-40' : ''}
            />
            {inviteBlocksGoogle ? (
              <Typography className="mt-[10px] text-[11.5px] leading-[1.45] text-white/[0.50] text-center">
                To accept your invite, create the account with an email and password.
              </Typography>
            ) : null}

            <View className="flex-row items-center gap-3 my-[18px]">
              <View className="flex-1 h-px bg-white/[0.14]" />
              <Typography className="text-[10.5px] font-bold tracking-[0.14em] text-white/[0.50]">OR</Typography>
              <View className="flex-1 h-px bg-white/[0.14]" />
            </View>

            <View className="gap-3">
              {isCreate ? (
                <>
                  <AuthPillInput
                    placeholder="Priya Sharma"
                    value={name}
                    onChangeText={edit(setName)}
                    autoCapitalize="words"
                  />
                  <AuthPillInput
                    placeholder="Acme Industries Pvt Ltd"
                    value={company}
                    onChangeText={edit(setCompany)}
                    autoCapitalize="words"
                  />
                  <AuthPillInput
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChangeText={edit(setPhone)}
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    textContentType="telephoneNumber"
                  />
                </>
              ) : null}
              <AuthPillInput
                placeholder="you@company.com"
                value={email}
                onChangeText={edit(setEmail)}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
              <AuthPillInput
                placeholder={`At least ${MIN_PASSWORD} characters`}
                value={password}
                onChangeText={edit(setPassword)}
                secureTextEntry
                autoComplete="password"
              />
            </View>

            {error ? (
              <Typography className="mt-4 text-[12.5px] font-semibold text-[#FF8A8A] text-center leading-[1.45]">
                {error}
              </Typography>
            ) : null}

            <Button
              label={
                isSubmitting
                  ? isCreate
                    ? 'Creating account…'
                    : 'Signing in…'
                  : isCreate
                    ? 'Create account'
                    : 'Sign in'
              }
              onPress={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              shape="pill"
              className={`w-full mt-5 ${!canSubmit || isSubmitting ? 'opacity-50' : ''}`}
            />

            {isCreate ? (
              <View className="flex-row items-center justify-center gap-[6px] mt-4">
                <Typography className="text-[12px] font-semibold text-white/[0.72]">
                  Free to start &mdash; no credit card needed
                </Typography>
              </View>
            ) : null}
          </MotiView>

          <View className="flex-row items-center justify-center gap-[10px] py-8 mt-auto">
            <Pressable>
              <Typography className="text-[11.5px] font-medium text-white/[0.55] underline">
                Privacy Policy
              </Typography>
            </Pressable>
            <View className="w-[3px] h-[3px] rounded-full bg-white/[0.25]" />
            <Pressable>
              <Typography className="text-[11.5px] font-medium text-white/[0.55] underline">
                Terms of Service
              </Typography>
            </Pressable>
          </View>

          {/*
            Dev-only, never in a production build. It fills the form rather than
            bypassing auth: there is no such thing as a signed-in user without a
            Supabase session any more, and faking one would 401 every request.
          */}
          {__DEV__ && devEmail ? (
            <Pressable
              onPress={() => {
                setError(null);
                setMode('signin');
                setEmail(devEmail);
                setPassword(devPassword ?? '');
              }}
              className="items-center pb-6"
            >
              <Typography className="text-[12px] font-semibold text-white/[0.45]">
                Fill dev credentials
              </Typography>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
