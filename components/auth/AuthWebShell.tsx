import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthLeftPanel } from './AuthLeftPanel';
import { NavyGlowBackdrop } from '../app/NavyGlowBackdrop';

/**
 * The website's two-column auth layout, for the screens that are reached from
 * the sign-in page but are not the sign-in page itself.
 *
 * verify-code already carried this block inline, and its reasoning applies word
 * for word to password reset: the website's sign-in page is two columns, so
 * dropping to a bare full-bleed column mid-flow breaks the page in the middle
 * of a task. Reset starts on /(auth) and ends on /(auth), but the two screens
 * in between were left with only their phone layout — which on a 1536px desktop
 * stretched the email field and the Send button across the entire window.
 *
 * `max-w-[420px]` is AuthFormWeb's own form width, so this column lines up with
 * the sign-in card rather than merely being narrower than the window.
 *
 * Web only, and callers return it before their native tree — Platform.OS never
 * changes during a session, so no component is asked to switch layout mid-life.
 * The native layout each caller keeps is unchanged and still correct.
 */
export function AuthWebShell({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView className="flex-1 bg-navy" edges={['top', 'bottom']}>
      <ScrollView
        contentContainerClassName="flex-grow lg:flex-row"
        bounces={false}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AuthLeftPanel />
        <View className="flex-1 items-center justify-center px-6 py-10 lg:px-14">
          <NavyGlowBackdrop />
          <View className="w-full max-w-[420px]">{children}</View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
