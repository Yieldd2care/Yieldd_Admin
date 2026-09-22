import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '../ui/Button';
import { TextInput } from '../ui/TextInput';
import { FOCUS } from '../web/primitives/focus';
import { AuthTabsWeb } from './AuthTabsWeb';
import { AuthWebShell } from './AuthWebShell';
import { GoogleButton } from './GoogleButton';
import { MIN_PASSWORD, type AuthFormState } from './useAuthForm';

/**
 * The website's sign-in page.
 *
 * One white card centred on the navy gradient, from AuthWebShell — the same
 * shell forgot-password and reset-password use, so the three screens in a
 * single flow cannot drift apart.
 *
 * This replaces the two-column layout the site had before. The left marketing
 * panel is gone with it: it only appeared from `lg` up, which meant the page
 * was already two different designs depending on the window, and the card
 * carries the brand well enough on its own.
 *
 * Only the presentation changed. Every piece of behaviour still comes from
 * useAuthForm, and the mobile app's own screen (AuthFormNative) is untouched.
 */

const COPY = {
  create: {
    heading: 'Create your account',
    subheading: 'Just your email to start. We’ll send you a code.',
    submit: 'Send me a code',
    pending: 'Sending code…',
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

const BODY = '[font-family:Figtree,system-ui,sans-serif]';

export function AuthFormWeb(form: AuthFormState) {
  const copy = COPY[form.mode];

  return (
    <AuthWebShell>
      <AuthTabsWeb mode={form.mode} onChange={form.changeMode} />

      <Text
        className={`[font-family:Figtree,system-ui,sans-serif] [font-weight:700] text-[24px] leading-[1.2] tracking-[-0.02em] text-navy mt-6`}
      >
        {copy.heading}
      </Text>
      {copy.subheading ? (
        <Text className={`${BODY} text-[14.5px] leading-[1.55] text-slate mt-[8px]`}>
          {copy.subheading}
        </Text>
      ) : null}

      <View className="mt-5">
        <GoogleButton
          onPress={form.handleGoogle}
          disabled={form.isSubmitting || form.inviteBlocksGoogle}
          className={`border border-hairline ${form.inviteBlocksGoogle ? 'opacity-40' : ''}`}
        />
        {form.inviteBlocksGoogle ? (
          <Text className={`${BODY} mt-[10px] text-[12.5px] leading-[1.45] text-slate text-center`}>
            To accept your invite, create the account with an email and password.
          </Text>
        ) : null}
      </View>

      <View className="flex-row items-center gap-[14px] my-5">
        <View className="flex-1 h-px bg-hairline" />
        <Text
          className={`${BODY} [font-weight:600] text-[11.5px] tracking-[0.16em] text-placeholder`}
        >
          OR
        </Text>
        <View className="flex-1 h-px bg-hairline" />
      </View>

      {/* Creating an account is one field (#33a): the rest is asked for on
          complete-profile, after a code proves the address. */}
      <View className="gap-3">
        <TextInput
          label="Work email"
          placeholder="you@company.com"
          value={form.email}
          onChangeText={form.setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          returnKeyType={form.isCreate ? 'go' : 'next'}
          onSubmitEditing={form.submitFromEmail}
        />
        {form.isCreate ? null : (
          <TextInput
            label="Password"
            placeholder={`At least ${MIN_PASSWORD} characters`}
            value={form.password}
            onChangeText={form.setPassword}
            secureTextEntry
            autoComplete="password"
            ref={form.passwordRef}
            returnKeyType="go"
            onSubmitEditing={() => void form.handleSubmit()}
          />
        )}
      </View>

      {/* Sign-in only — nothing has been forgotten on the create tab. */}
      {form.isCreate ? null : (
        <Pressable
          onPress={() => router.push('/(auth)/forgot-password')}
          className={`self-end mt-3 ${FOCUS}`}
          accessibilityRole="link"
        >
          <Text className={`${BODY} [font-weight:600] text-[13px] text-blue`}>
            Forgot password?
          </Text>
        </Pressable>
      )}

      {form.error ? (
        <Text
          className={`${BODY} [font-weight:600] mt-4 text-[13px] leading-[1.45] text-[#C23B3B] text-center`}
        >
          {form.error}
        </Text>
      ) : null}

      <Button
        label={
          form.isCreate
            ? form.sendingCode
              ? copy.pending
              : copy.submit
            : form.isSubmitting
              ? copy.pending
              : copy.submit
        }
        onPress={form.handleSubmit}
        disabled={!form.canSubmit || form.isSubmitting || form.sendingCode}
        shape="pill"
        className={`w-full mt-6 ${
          !form.canSubmit || form.isSubmitting || form.sendingCode ? 'opacity-50' : ''
        }`}
      />

      <Text className={`${BODY} text-[13px] leading-[1.5] text-slate mt-4 text-center`}>
        {copy.footnote}
      </Text>
    </AuthWebShell>
  );
}
