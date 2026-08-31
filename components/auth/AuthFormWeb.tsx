import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../ui/Typography';
import { Button } from '../ui/Button';
import { TextInput } from '../ui/TextInput';
import { AuthLeftPanel } from './AuthLeftPanel';
import { AuthTabsWeb } from './AuthTabsWeb';
import { GoogleButton } from './GoogleButton';
import { MIN_PASSWORD, type AuthFormState } from './useAuthForm';

/**
 * The website's sign-in page: navy marketing panel on the left from `lg` up,
 * white form on the right, capped at 420px so it stays a form rather than
 * stretching across a desktop monitor.
 *
 * This is the layout yieldd.co has always had and it stays that way. The mobile
 * app's navy screen is a different presentation of the same logic — see
 * useAuthForm. Only the wiring underneath changed: real Supabase auth, a
 * required contact number, a working Google button, and inline errors.
 */

const COPY = {
  create: {
    heading: 'Create your account',
    subheading: '',
    submit: 'Create account',
    pending: 'Creating account…',
    footnote: 'By creating an account you agree to our Terms and Privacy Policy.',
  },
  signin: {
    heading: 'Welcome back',
    subheading: 'Sign in to your leads, events and reports.',
    submit: 'Sign in',
    pending: 'Signing in…',
    footnote: 'New to Yieldd? Switch to Create account above.',
  },
} as const;

export function AuthFormWeb(form: AuthFormState) {
  const copy = COPY[form.mode];

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerClassName="flex-grow lg:flex-row"
          bounces={false}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AuthLeftPanel />

          <View className="flex-1 items-center justify-center px-6 py-6 lg:px-14">
            <View className="w-full max-w-[420px] gap-0">
              {/* The panel carries the logo from `lg` up; below that there is
                  no panel, so the form needs its own way back to the site. */}
              <Pressable
                className="flex-row items-center justify-center gap-[10px] mb-6 lg:hidden"
                onPress={() => router.push('/(web)')}
              >
                <Image
                  source={require('../../assets/brand/yieldd-mark-transparent.png')}
                  style={{ width: 30, height: 36 }}
                  resizeMode="contain"
                />
                <Typography className="text-[22px] font-extrabold tracking-[0.02em] text-navy">
                  YIELDD
                </Typography>
              </Pressable>

              <AuthTabsWeb mode={form.mode} onChange={form.changeMode} />

              <Typography variant="display-md" className="text-navy mt-6">
                {copy.heading}
              </Typography>
              {copy.subheading ? (
                <Typography variant="body-md" className="text-slate mt-[8px]">
                  {copy.subheading}
                </Typography>
              ) : null}

              <View className="mt-5">
                <GoogleButton
                  onPress={form.handleGoogle}
                  disabled={form.isSubmitting || form.inviteBlocksGoogle}
                  className={`border border-hairline ${form.inviteBlocksGoogle ? 'opacity-40' : ''}`}
                />
                {form.inviteBlocksGoogle ? (
                  <Typography className="mt-[10px] text-[12.5px] leading-[1.45] text-slate text-center">
                    To accept your invite, create the account with an email and password.
                  </Typography>
                ) : null}
              </View>

              <View className="flex-row items-center gap-[14px] my-5">
                <View className="flex-1 h-px bg-hairline" />
                <Typography className="text-[11.5px] font-semibold tracking-[0.16em] text-placeholder">
                  OR
                </Typography>
                <View className="flex-1 h-px bg-hairline" />
              </View>

              <View className="gap-3">
                {form.isCreate ? (
                  <>
                    <TextInput
                      label="Full name"
                      placeholder="Priya Sharma"
                      value={form.name}
                      onChangeText={form.setName}
                      autoCapitalize="words"
                    />
                    <TextInput
                      label="Company name"
                      placeholder="Acme Industries Pvt Ltd"
                      value={form.company}
                      onChangeText={form.setCompany}
                      autoCapitalize="words"
                    />
                    <TextInput
                      label="Contact number"
                      placeholder="+91 98765 43210"
                      value={form.phone}
                      onChangeText={form.setPhone}
                      keyboardType="phone-pad"
                      autoComplete="tel"
                      textContentType="telephoneNumber"
                    />
                  </>
                ) : null}
                <TextInput
                  label="Work email"
                  placeholder="you@company.com"
                  value={form.email}
                  onChangeText={form.setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                />
                <TextInput
                  label="Password"
                  placeholder={`At least ${MIN_PASSWORD} characters`}
                  value={form.password}
                  onChangeText={form.setPassword}
                  secureTextEntry
                  autoComplete="password"
                />
              </View>

              {/* Sign-in only — nothing has been forgotten on the create tab. */}
              {form.isCreate ? null : (
                <Pressable
                  onPress={() => router.push('/(auth)/forgot-password')}
                  className="self-end mt-3"
                >
                  <Typography className="text-[13px] font-semibold text-blue">
                    Forgot password?
                  </Typography>
                </Pressable>
              )}

              {form.error ? (
                <Typography className="mt-4 text-[13px] font-semibold text-[#C23B3B] leading-[1.45] text-center">
                  {form.error}
                </Typography>
              ) : null}

              <Button
                label={form.isSubmitting ? copy.pending : copy.submit}
                onPress={form.handleSubmit}
                disabled={!form.canSubmit || form.isSubmitting}
                className={`w-full mt-6 ${!form.canSubmit || form.isSubmitting ? 'opacity-50' : ''}`}
              />

              <Typography className="text-[13.5px] text-slate mt-4 text-center">
                {copy.footnote}
              </Typography>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
