import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../../components/ui/Typography';
import { Button } from '../../components/ui/Button';
import { AuthPillInput } from '../../components/auth/AuthPillInput';
import { NavyGlowBackdrop } from '../../components/app/NavyGlowBackdrop';
import { MailIcon } from '../../components/ui/icons';
import { requestPasswordReset } from '../../lib/auth/passwordReset';

/**
 * "Send me a reset link."
 *
 * Lives inside (auth) because only a signed-out person needs it — the guard
 * there sends anyone already signed in to the app, which is right. The screen
 * they land on FROM the email is a different route (app/auth/reset-password),
 * outside the guards, because the recovery link creates a session.
 *
 * The confirmation is deliberately identical whether or not the address has an
 * account. Saying "no account with that email" would turn this box into a free
 * membership check for anyone curious which of their competitors' staff use
 * Yieldd.
 */
export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (sending || !email.trim()) return;
    setSending(true);
    setError(null);
    const outcome = await requestPasswordReset(email);
    setSending(false);
    if (outcome.ok) setSent(true);
    else setError(outcome.message);
  };

  return (
    <SafeAreaView className="flex-1 bg-navy" edges={['top', 'bottom']}>
      <NavyGlowBackdrop />

      <View className="flex-1 px-8 justify-center">
        {sent ? (
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
              If there is an account for {email.trim()}, a link to set a new password is on its
              way. It works once, and expires in an hour.
            </Typography>
            <Typography
              className="mt-4 text-[12.5px] text-white/[0.45] text-center max-w-[300px]"
              style={{ lineHeight: 18 }}
            >
              Nothing after a few minutes? Check spam, then try again.
            </Typography>

            <Pressable onPress={() => router.replace('/(auth)')} className="mt-8">
              <Typography className="text-[13.5px] font-bold text-gold">Back to sign in</Typography>
            </Pressable>
          </View>
        ) : (
          <>
            <Typography className="text-[26px] font-extrabold text-white tracking-[-0.01em]">
              Reset your password
            </Typography>
            <Typography
              className="mt-3 text-[14px] text-white/[0.62]"
              style={{ lineHeight: 21 }}
            >
              Enter the email you sign in with and we&rsquo;ll send a link to set a new password.
            </Typography>

            <View className="mt-7">
              <AuthPillInput
                placeholder="you@company.com"
                value={email}
                onChangeText={(v) => {
                  if (error) setError(null);
                  setEmail(v);
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                onSubmitEditing={() => void submit()}
                returnKeyType="send"
              />
            </View>

            {error ? (
              <Typography className="mt-4 text-[12.5px] font-semibold text-[#FF8A8A] text-center leading-[1.45]">
                {error}
              </Typography>
            ) : null}

            <Button
              label={sending ? 'Sending…' : 'Send reset link'}
              onPress={() => void submit()}
              disabled={sending || !email.trim()}
              className="mt-6"
            />

            {/*
              The link always opens in a browser, even on a phone. Said plainly
              here so it is not a surprise — a `yieldd://` link cannot resolve
              in Expo Go, and someone locked out is the last person to tell
              "install a different build first".
            */}
            <Typography
              className="mt-4 text-[12px] text-white/[0.42] text-center"
              style={{ lineHeight: 17 }}
            >
              The link opens in your browser. Set the password there, then sign in here.
            </Typography>

            <Pressable onPress={() => router.back()} className="mt-7 self-center">
              <Typography className="text-[13.5px] font-semibold text-white/[0.75]">
                Back to sign in
              </Typography>
            </Pressable>
          </>
        )}
      </View>
      {Platform.OS === 'web' ? null : <View className="h-4" />}
    </SafeAreaView>
  );
}
