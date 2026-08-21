import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../../components/ui/Typography';
import { Button } from '../../components/ui/Button';
import { TextInput } from '../../components/ui/TextInput';
import { AuthLeftPanel } from '../../components/auth/AuthLeftPanel';
import { AuthTabs, type AuthMode } from '../../components/auth/AuthTabs';
import { GoogleButton } from '../../components/auth/GoogleButton';
import { useSessionStore } from '../../stores/useSessionStore';

const COPY: Record<AuthMode, { heading: string; subheading: string; submitLabel: string; footnote: string }> = {
  signup: {
    heading: 'Create your account',
    subheading: '',
    submitLabel: 'Create account',
    footnote: 'By creating an account you agree to our Terms and Privacy Policy.',
  },
  signin: {
    heading: 'Welcome back',
    subheading: 'Sign in to your leads, events and reports.',
    submitLabel: 'Sign in',
    footnote: 'New to Yieldd? Switch to Create account above.',
  },
};

export default function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>('signup');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const signUp = useSessionStore((s) => s.signUp);
  const signIn = useSessionStore((s) => s.signIn);

  const isSignup = mode === 'signup';
  const copy = COPY[mode];
  const canSubmit = isSignup
    ? name.trim() && company.trim() && email.trim() && password.trim()
    : email.trim() && password.trim();

  const handleSubmit = () => {
    if (!canSubmit) return;
    if (isSignup) {
      signUp({ name, company, email, password });
      router.replace('/(auth)/fork');
    } else {
      signIn({ email, password });
      router.replace('/(app)');
    }
  };

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

              <AuthTabs mode={mode} onChange={setMode} />

              <Typography variant="display-md" className="text-navy mt-6">
                {copy.heading}
              </Typography>
              {copy.subheading ? (
                <Typography variant="body-md" className="text-slate mt-[8px]">
                  {copy.subheading}
                </Typography>
              ) : null}

              <View className="mt-5">
                <GoogleButton />
              </View>

              <View className="flex-row items-center gap-[14px] my-5">
                <View className="flex-1 h-px bg-hairline" />
                <Typography className="text-[11.5px] font-semibold tracking-[0.16em] text-placeholder">
                  OR
                </Typography>
                <View className="flex-1 h-px bg-hairline" />
              </View>

              <View className="gap-3">
                {isSignup ? (
                  <>
                    <TextInput
                      label="Full name"
                      placeholder="Priya Sharma"
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                    />
                    <TextInput
                      label="Company name"
                      placeholder="Acme Industries Pvt Ltd"
                      value={company}
                      onChangeText={setCompany}
                      autoCapitalize="words"
                    />
                  </>
                ) : null}
                <TextInput
                  label="Work email"
                  placeholder="you@company.com"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                />
                <TextInput
                  label="Password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoComplete="password"
                />
              </View>

              {!isSignup ? (
                <Pressable className="self-end mt-3">
                  <Typography className="text-[14px] text-gold">Forgot password?</Typography>
                </Pressable>
              ) : null}

              <Button
                label={copy.submitLabel}
                onPress={handleSubmit}
                disabled={!canSubmit}
                className={`w-full mt-6 ${!canSubmit ? 'opacity-50' : ''}`}
              />

              <Typography className="text-[13.5px] text-label mt-4 text-center">
                {copy.footnote}
              </Typography>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
