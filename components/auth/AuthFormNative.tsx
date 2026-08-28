import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';

import { Typography } from '../ui/Typography';
import { Button } from '../ui/Button';
import { RadialGlow } from '../ui/RadialGlow';
import { AuthPillInput } from './AuthPillInput';
import { AuthTabs, type AuthMode } from './AuthTabs';
import { GoogleButton } from './GoogleButton';
import { NavyGlowBackdrop } from '../app/NavyGlowBackdrop';
import { MIN_PASSWORD, type AuthFormState } from './useAuthForm';

/**
 * The mobile app's sign-in screen — navy, single column, pill inputs.
 *
 * This is the design signed off in Expo Go and it is unchanged. The website
 * uses AuthFormWeb instead; both are driven by useAuthForm, so they cannot
 * disagree about validation, errors or where you land afterwards.
 */

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

export function AuthFormNative(form: AuthFormState) {
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
              {COPY[form.mode].headline}
            </Typography>
            <Typography className="mt-[6px] text-[13px] leading-[1.5] text-white/[0.55] text-center px-4">
              {COPY[form.mode].subhead}
            </Typography>
          </MotiView>

          <View className="mx-8 mt-7">
            <AuthTabs mode={form.mode} onChange={form.changeMode} />
          </View>

          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 520, delay: 120 }}
            className="px-8 pt-6"
          >
            <GoogleButton
              onPress={form.handleGoogle}
              disabled={form.isSubmitting || form.inviteBlocksGoogle}
              className={form.inviteBlocksGoogle ? 'opacity-40' : ''}
            />
            {form.inviteBlocksGoogle ? (
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
              {form.isCreate ? (
                <>
                  <AuthPillInput
                    placeholder="Priya Sharma"
                    value={form.name}
                    onChangeText={form.setName}
                    autoCapitalize="words"
                  />
                  <AuthPillInput
                    placeholder="Acme Industries Pvt Ltd"
                    value={form.company}
                    onChangeText={form.setCompany}
                    autoCapitalize="words"
                  />
                  <AuthPillInput
                    placeholder="+91 98765 43210"
                    value={form.phone}
                    onChangeText={form.setPhone}
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    textContentType="telephoneNumber"
                  />
                </>
              ) : null}
              <AuthPillInput
                placeholder="you@company.com"
                value={form.email}
                onChangeText={form.setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
              <AuthPillInput
                placeholder={`At least ${MIN_PASSWORD} characters`}
                value={form.password}
                onChangeText={form.setPassword}
                secureTextEntry
                autoComplete="password"
              />
            </View>

            {form.error ? (
              <Typography className="mt-4 text-[12.5px] font-semibold text-[#FF8A8A] text-center leading-[1.45]">
                {form.error}
              </Typography>
            ) : null}

            <Button
              label={
                form.isSubmitting
                  ? form.isCreate
                    ? 'Creating account…'
                    : 'Signing in…'
                  : form.isCreate
                    ? 'Create account'
                    : 'Sign in'
              }
              onPress={form.handleSubmit}
              disabled={!form.canSubmit || form.isSubmitting}
              shape="pill"
              className={`w-full mt-5 ${!form.canSubmit || form.isSubmitting ? 'opacity-50' : ''}`}
            />

            {form.isCreate ? (
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
          {__DEV__ && form.devEmail ? (
            <Pressable onPress={form.fillDevCredentials} className="items-center pb-6">
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
