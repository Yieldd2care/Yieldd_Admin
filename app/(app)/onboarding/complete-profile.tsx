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
import { CenterColumn } from '../../../components/shared/CenterColumn';
import { MIN_PASSWORD } from '../../../components/auth/useAuthForm';
import { needsPasswordSetup, setPassword } from '../../../lib/auth/emailCode';
import { PLACEHOLDER_NAME, PLACEHOLDER_ORG } from '../../../types/session';

/**
 * Everything signing up no longer asks for.
 *
 * This used to be the screen that patched up Google sign-ins, which hand over a
 * name and an email and nothing else. Since #33a it is where almost everything
 * is collected: creating an account is one email box, so a new account arrives
 * named "New user" at an organisation called "My workspace" with no number and
 * no password, and this is the screen that replaces all four.
 *
 * Three shapes, decided by where the person came from:
 *
 *   code    — name, company (admins), number, and a password to set. Everything.
 *   Google  — name is already real, so: company (admins) and a number. No
 *             password, ever: they sign in with Google and would be inventing
 *             one they never type.
 *   older   — accounts predating the mandatory contact number. Number only.
 *
 * Reached only via nextRouteAfterAuth(), which sends anyone whose profile is
 * incomplete here before anything else.
 *
 * THIS SCREEN HAS NO SKIP, AND THAT IS DELIBERATE.
 *
 * PENDING.md #33c puts a Skip on every onboarding screen. Neither of the two
 * that exist today takes one — see components/app/SkipLink.tsx for the shared
 * component, which is waiting for the referral screen (#33b) and the tutorial
 * (#33d). For this screen the decision was confirmed 2026-09-14: #4 made the
 * contact number mandatory at account creation on 2026-08-28, because it is
 * the number that goes on the person's digital card, which is the thing the
 * card exists to hand out.
 *
 * Adding a Skip here is also not a one-line change. app/(app)/_layout.tsx
 * redirects back here for as long as profileNeedsCompletion(user) is true, so
 * a Skip that navigates home returns to this screen immediately, forever. A
 * Skip would mean relaxing that guard too — which is exactly the enforcement
 * #4 added so that force-quitting the app is not a way past the number.
 *
 * Sign out, below, is the way off this screen without supplying one.
 */
export default function CompleteProfileScreen() {
  const user = useSessionStore((s) => s.user);
  const updateProfile = useSessionStore((s) => s.updateProfile);

  const isAdmin = user?.role === 'admin';

  // True only for an account created by an emailed code, which has no password
  // yet. A Google account is signed in by Google and must not be made to invent
  // one; an older email+password account already has one. See emailCode.ts.
  const mustSetPassword = needsPasswordSetup(user);

  const [name, setName] = useState(
    user?.name && user.name !== PLACEHOLDER_NAME ? user.name : ''
  );
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [company, setCompany] = useState(
    user?.company && user.company !== PLACEHOLDER_ORG ? user.company : ''
  );
  const [password, setPasswordValue] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const canSubmit = Boolean(
    name.trim() &&
      phone.trim() &&
      (!isAdmin || company.trim()) &&
      (!mustSetPassword || (password.trim() && confirm.trim()))
  );

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

    if (mustSetPassword) {
      if (password.length < MIN_PASSWORD) {
        setError(`Use at least ${MIN_PASSWORD} characters for your password.`);
        return;
      }
      if (password !== confirm) {
        setError('Those two passwords don’t match.');
        return;
      }
    }

    setSaving(true);

    // Password first, deliberately. If the profile saved and this failed, the
    // guard would let them through to the app with no password at all and no
    // screen left that asks for one — locked out of every other device. The
    // other way round, a failure here simply leaves them on this screen.
    if (mustSetPassword) {
      const pw = await setPassword(password);
      if (pw.error) {
        setSaving(false);
        setError(pw.error);
        return;
      }
    }

    const result = await updateProfile({
      name,
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
          contentContainerClassName="flex-grow justify-center items-center px-8 py-10"
          bounces={false}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <CenterColumn>
          <Typography className="text-[12px] font-bold tracking-[0.14em] text-gold text-center">
            ALMOST THERE
          </Typography>
          <Typography className="mt-4 text-[24px] leading-[1.25] font-extrabold text-white text-center tracking-[-0.01em]">
            {user?.name ? `Welcome, ${user.name.split(' ')[0]}.` : 'Welcome.'}
          </Typography>
          <Typography className="mt-3 text-[13.5px] leading-[1.55] text-white/[0.60] text-center">
            {mustSetPassword
              ? isAdmin
                ? 'Your name, your company, a number people can reach you on, and a password for next time.'
                : 'Your name, a number people can reach you on, and a password for next time.'
              : isAdmin
                ? 'A few details Google doesn’t hand over: your company, and a number people can reach you on.'
                : 'One detail Google doesn’t hand over: a number people can reach you on.'}
          </Typography>

          <View className="gap-3 mt-8">
            <AuthPillInput
              placeholder="Priya Sharma"
              value={name}
              onChangeText={edit(setName)}
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
            />
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

          {/* Only for an account that arrived by code and has no password yet.
              A Google account never sees this. */}
          {mustSetPassword ? (
            <>
              <View className="gap-3 mt-6">
                <AuthPillInput
                  placeholder={`Password (at least ${MIN_PASSWORD} characters)`}
                  value={password}
                  onChangeText={edit(setPasswordValue)}
                  secureTextEntry
                  autoComplete="new-password"
                  textContentType="newPassword"
                />
                <AuthPillInput
                  placeholder="Confirm password"
                  value={confirm}
                  onChangeText={edit(setConfirm)}
                  secureTextEntry
                  autoComplete="new-password"
                />
              </View>
              <Typography className="mt-3 text-[11.5px] leading-[1.45] text-white/[0.45] text-center">
                You’ll use this to sign in next time, instead of waiting for a code.
              </Typography>
            </>
          ) : null}

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
          </CenterColumn>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
