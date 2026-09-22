import type { ReactNode } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';

import { ConcentricRings } from '../web/primitives/ConcentricRings';
import { DotGrid } from '../web/primitives/DotGrid';
import { FOCUS } from '../web/primitives/focus';
import { GrainOverlay } from '../web/primitives/GrainOverlay';

/**
 * The website's auth layout: one white card floating on the navy gradient.
 *
 * This replaces the two-column split. The reference design has no auth screen
 * at all — no password field anywhere in it — so there was nothing to copy.
 * What it does have is a form card: white, 22px radius, deep shadow,
 * overlapping a gradient panel. That is the pattern borrowed here, which keeps
 * the auth pages recognisably part of the same site as the landing page rather
 * than a separate thing bolted on.
 *
 * It is now the shell for ALL three web auth screens — sign in, forgot
 * password, reset password. Previously AuthFormWeb built its own page and only
 * the other two shared this, so the three could drift. They cannot now.
 *
 * Web only. Callers return it before their native tree, and Platform.OS never
 * changes during a session, so no component is asked to switch layout mid-life.
 */

const LOCKUP = require('../../assets/brand/transparenet secondary logo.png');
const LOCKUP_ASPECT = 2172 / 724;
const LOCKUP_HEIGHT = 34;

export function AuthWebShell({ children }: { children: ReactNode }) {
  return (
    <View className="flex-1 bg-navy">
      {/* First in the DOM so it is first in the tab order; an explicit z-index
          keeps it painted above the scroller. Click-through, so the empty
          space beside the logo does not swallow taps. */}
      <View pointerEvents="box-none" className="absolute top-0 left-0 right-0 z-50">
        <View className="w-full items-center px-4 md:px-8 pt-[22px]">
          <View className="w-full max-w-[1200px] flex-row">
            <Pressable
              onPress={() => router.push('/(web)')}
              className={FOCUS}
              accessibilityRole="link"
              accessibilityLabel="Yieldd home"
            >
              <Image
                source={LOCKUP}
                style={{ height: LOCKUP_HEIGHT, width: LOCKUP_HEIGHT * LOCKUP_ASPECT }}
                resizeMode="contain"
              />
            </Pressable>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerClassName="flex-grow"
          bounces={false}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 items-center justify-center px-5 pt-[104px] pb-16">
            {/* The backdrop, in its own clipped layer so the grain blends
                against the gradient rather than the page. */}
            <View
              pointerEvents="none"
              className="absolute inset-0 overflow-hidden [background-image:linear-gradient(170deg,#0B132B_0%,#101C3E_52%,#0B132B_100%)]"
            >
              <ConcentricRings sizes={[1100, 820, 560]} originY={0.34} />
              <DotGrid opacity={0.08} />
              <View className="absolute inset-0 [background-image:radial-gradient(62%_46%_at_50%_2%,rgba(255,255,255,0.11),transparent_70%)]" />
              <GrainOverlay opacity={0.24} />
            </View>

            <View className="w-full max-w-[460px] rounded-[22px] bg-white px-6 py-8 md:px-[34px] md:py-[34px] shadow-[0_34px_74px_rgba(4,12,30,0.40)]">
              {children}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
