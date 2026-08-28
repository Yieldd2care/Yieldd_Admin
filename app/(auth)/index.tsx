import { Platform } from 'react-native';

import { AuthFormWeb } from '../../components/auth/AuthFormWeb';
import { AuthFormNative } from '../../components/auth/AuthFormNative';
import { useAuthForm } from '../../components/auth/useAuthForm';

/**
 * Sign in / create account.
 *
 * Two presentations, one behaviour:
 *
 *   web    — the two-column layout yieldd.co has always had: navy marketing
 *            panel on the left from `lg` up, white form on the right capped at
 *            420px. The mobile screen stretched across a desktop monitor put
 *            full-width input pills edge to edge and read as broken.
 *   native — the navy single-column screen signed off in Expo Go.
 *
 * All the logic — validation, error mapping, Google, where you land afterwards
 * — lives in useAuthForm, so the two can never drift apart.
 */
export default function AuthScreen() {
  const form = useAuthForm();
  return Platform.OS === 'web' ? <AuthFormWeb {...form} /> : <AuthFormNative {...form} />;
}
