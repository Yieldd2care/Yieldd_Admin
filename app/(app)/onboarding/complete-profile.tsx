import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { Button } from '../../../components/ui/Button';
import { AuthPillInput } from '../../../components/auth/AuthPillInput';
import { NavyGlowBackdrop } from '../../../components/app/NavyGlowBackdrop';
import { RadialGlow } from '../../../components/ui/RadialGlow';
import { useSessionStore } from '../../../stores/useSessionStore';
import { nextRouteAfterAuth } from '../../../lib/auth/nextRoute';
import { isValidPhone } from '../../../lib/phone';

/** The name handle_new_user() falls back to when no company was supplied. */
const PLACEHOLDER_ORG = 'My workspace';

/**
 * Fills the gaps Google sign-in leaves behind.
 *
 * The email sign-up form collects a name, a company and a contact number, so
 * an account created there never reaches this screen. Google gives us a name
 * and an email and nothing else — which leaves the person with no number on
 * their card and an organisation literally called "My workspace". Rather than
 * let either of those follow them around, ask once, here.
 *
 * Reached only via nextRouteAfterAuth(), which sends anyone whose profile is
 * missing a contact number here before anything else.
 */
export default function CompleteProfileScreen() {
  const user = useSessionStore((s) => s.user);
  const completeProfile = useSessionStore((s) => s.completeProfile);

  const isAdmin = user?.role === 'admin';
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [company, setCompany] = useState(
    user?.company && user.company !== PLACEHOLDER_ORG ? user.company : ''
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const canSubmit = Boolean(phone.trim() && (!isAdmin || company.trim()));

  const edit = (setter: (v: string) => void) => (value: string) => {
    if (error) setError(null);
    setter(value);
  };

  const handleSubmit = async () => {
    if (!canSubmit || saving) return;

    if (!isValidPhone(phone)) {
      setError('Enter a contact number with at least 10 digits.');
      return;
    }

    setSaving(true);
    const result = await completeProfile({
      phone,
      ...(isAdmin ? { company } : {}),
    });
    setSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.replace(nextRouteAfterAuth(useSessionStore.getState().user));
  };

  return (
    <SafeAreaView className="flex-1 bg-navy" edges={['top', 'bottom']}>
      <NavyGlowBackdrop />
      <RadialGlow color="#F4B000" size={280} style={{ bottom: -190, right: -90 }} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-8 py-10"
          bounces={false}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Typography className="text-[12px] font-bold tracking-[0.14em] text-gold text-center">
            ALMOST THERE
          </Typography>
          <Typography className="mt-4 text-[24px] leading-[1.25] font-extrabold text-white text-center tracking-[-0.01em]">
            {user?.name ? `Welcome, ${user.name.split(' ')[0]}.` : 'Welcome.'}
          </Typography>
          <Typography className="mt-3 text-[13.5px] leading-[1.55] text-white/[0.60] text-center">
            {isAdmin
              ? 'Two details Google doesn’t hand over — your company, and a number people can reach you on.'
              : 'One detail Google doesn’t hand over — a number people can reach you on.'}
          </Typography>

          <View className="gap-3 mt-8">
            {isAdmin ? (
              <AuthPillInput
                placeholder="Acme Industries Pvt Ltd"
                value={company}
                onChangeText={edit(setCompany)}
                autoCapitalize="words"
              />
            ) : null}
            <AuthPillInput
              placeholder="+91 98765 43210"
              value={phone}
              onChangeText={edit(setPhone)}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
            />
          </View>

          <Typography className="mt-3 text-[11.5px] leading-[1.45] text-white/[0.45] text-center">
            This is the number that goes on your digital card.
          </Typography>

          {error ? (
            <Typography className="mt-4 text-[12.5px] font-semibold text-[#FF8A8A] text-center leading-[1.45]">
              {error}
            </Typography>
          ) : null}

          <Button
            label={saving ? 'Saving…' : 'Continue'}
            onPress={handleSubmit}
            disabled={!canSubmit || saving}
            shape="pill"
            className={`w-full mt-6 ${!canSubmit || saving ? 'opacity-50' : ''}`}
          />

          <Typography
            onPress={() => useSessionStore.getState().signOut()}
            className="mt-6 text-[12.5px] font-bold text-gold text-center"
          >
            Sign out
          </Typography>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
