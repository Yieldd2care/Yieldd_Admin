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

export default function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>('create');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const signUp = useSessionStore((s) => s.signUp);
  const signIn = useSessionStore((s) => s.signIn);

  const isCreate = mode === 'create';
  const canSubmit = isCreate
    ? name.trim() && company.trim() && email.trim() && password.trim()
    : email.trim() && password.trim();

  const handleSubmit = () => {
    if (!canSubmit) return;
    if (isCreate) {
      signUp({ name, company, email, password });
      router.replace('/(auth)/fork');
    } else {
      signIn({ email, password });
      router.replace('/(app)');
    }
  };

  const handleDevBypass = () => {
    signIn({ email: 'dev@yieldd.co', password: '' });
    router.replace('/(app)');
  };

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
            <Image
              source={require('../../assets/brand/yieldd-lockup-transparent.png')}
              style={{ width: 130, height: 43 }}
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
            <AuthTabs mode={mode} onChange={setMode} />
          </View>

          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 520, delay: 120 }}
            className="px-8 pt-6"
          >
            <GoogleButton />

            <View className="flex-row items-center gap-3 my-[18px]">
              <View className="flex-1 h-px bg-white/[0.14]" />
              <Typography className="text-[10.5px] font-bold tracking-[0.14em] text-white/[0.50]">OR</Typography>
              <View className="flex-1 h-px bg-white/[0.14]" />
            </View>

            <View className="gap-3">
              {isCreate ? (
                <>
                  <AuthPillInput placeholder="Priya Sharma" value={name} onChangeText={setName} autoCapitalize="words" />
                  <AuthPillInput
                    placeholder="Acme Industries Pvt Ltd"
                    value={company}
                    onChangeText={setCompany}
                    autoCapitalize="words"
                  />
                </>
              ) : null}
              <AuthPillInput
                placeholder="you@company.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
              <AuthPillInput
                placeholder="At least 8 characters"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
              />
            </View>

            {!isCreate ? (
              <Pressable className="self-end mt-3">
                <Typography className="text-[12.5px] font-bold text-gold">Forgot password?</Typography>
              </Pressable>
            ) : null}

            <Button
              label={isCreate ? 'Create account' : 'Sign in'}
              onPress={handleSubmit}
              disabled={!canSubmit}
              shape="pill"
              className={`w-full mt-5 ${!canSubmit ? 'opacity-50' : ''}`}
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

          {__DEV__ ? (
            <Pressable onPress={handleDevBypass} className="items-center pb-6">
              <Typography className="text-[12px] font-semibold text-white/[0.45]">
                Continue without an account (dev)
              </Typography>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
