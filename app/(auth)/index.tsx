import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../../components/ui/Typography';
import { Button } from '../../components/ui/Button';
import { AuthPillInput } from '../../components/auth/AuthPillInput';
import { AuthTabs, type AuthMode } from '../../components/auth/AuthTabs';
import { GoogleButton } from '../../components/auth/GoogleButton';
import { NavyGlowBackdrop } from '../../components/app/NavyGlowBackdrop';
import { useSessionStore } from '../../stores/useSessionStore';

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
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerClassName="flex-grow"
          bounces={false}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="items-center pt-8 px-8">
            <Image
              source={require('../../assets/brand/yieldd-lockup-transparent.png')}
              style={{ width: 130, height: 43 }}
              resizeMode="contain"
            />
          </View>

          <View className="mx-8 mt-[38px]">
            <AuthTabs mode={mode} onChange={setMode} />
          </View>

          <View className="px-8 pt-6">
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
          </View>

          <View className="flex-row items-center justify-center gap-[10px] py-8 mt-auto">
            <Pressable className="bg-white/[0.08] rounded-full px-4 py-2">
              <Typography className="text-[11.5px] font-semibold text-white/[0.85] underline">
                Privacy Policy
              </Typography>
            </Pressable>
            <View className="w-[3px] h-[3px] rounded-full bg-white/[0.30]" />
            <Pressable className="bg-white/[0.08] rounded-full px-4 py-2">
              <Typography className="text-[11.5px] font-semibold text-white/[0.85] underline">
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
