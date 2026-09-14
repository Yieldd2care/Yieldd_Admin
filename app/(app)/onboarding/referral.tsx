import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { Button } from '../../../components/ui/Button';
import { NavyGlowBackdrop } from '../../../components/app/NavyGlowBackdrop';
import { SkipLink } from '../../../components/app/SkipLink';
import { CheckIcon } from '../../../components/ui/icons';
import { CenterColumn } from '../../../components/shared/CenterColumn';
import { useSessionStore } from '../../../stores/useSessionStore';
import { nextRouteAfterAuth } from '../../../lib/auth/nextRoute';
import {
  REFERRAL_SKIPPED,
  REFERRAL_SOURCES,
  detailOptionsFor,
  isCompleteAnswer,
  type ReferralSourceId,
} from '../../../lib/referral';

/**
 * "Where did you hear about us?" — asked once, right after an account is
 * created (PENDING.md #33b).
 *
 * Reached only via nextRouteAfterAuth(), which puts it after complete-profile
 * and before the fork, and never shows it to a rep: an invited rep did not hear
 * about Yieldd from anywhere, they were invited by their admin.
 *
 * READ THIS BEFORE CHANGING THE HIGHLIGHT.
 *
 * A selected card here is the exact pattern AGENTS.md forbids: a class list
 * that gains its first `shadow-*` / `ring-*` / `scale-*` utility *after* the
 * first render. NativeWind can only set a component up as a CSS-variable
 * provider on render one; gaining one later makes react-native-css-interop try
 * to upgrade the component mid-life, and its warning printer walks the props
 * with Object.entries, which trips a throwing getter on React Navigation's
 * default context. What you see is a red screen reading
 *
 *     Couldn't find a navigation context. Have you wrapped your app with
 *     'NavigationContainer'?
 *
 * There is no navigation problem, and chasing that message costs an afternoon.
 *
 * So every difference between selected and unselected below is a plain colour
 * or font-weight swap — no shadow, no ring, no scale, no gradient, no filter.
 * `border-2` is present in both branches and only its colour changes, and
 * `active:opacity-80` sits on the Pressable unconditionally. Adding an
 * `active:`/`hover:` class to a View only when selected trips the same path via
 * a View->Pressable upgrade, so those go on from the start or not at all.
 *
 * The platform chips wrap with flex-wrap rather than sitting in a horizontal
 * ScrollView, which sidesteps the other AGENTS.md rule (a className on a
 * horizontal ScrollView makes descendant text reserve space and paint no
 * glyphs) rather than having to work around it.
 */

function OptionCard({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      className={`rounded-lg px-5 py-4 flex-row items-center justify-between active:opacity-80 border-2 ${
        selected ? 'bg-gold border-gold' : 'bg-white border-transparent'
      }`}
    >
      <Typography
        className={`text-[15.5px] text-navy flex-1 ${selected ? 'font-bold' : 'font-semibold'}`}
      >
        {label}
      </Typography>
      {selected ? <CheckIcon size={18} color="#0B132B" strokeWidth={2.6} /> : null}
    </Pressable>
  );
}

function PlatformChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      className={`rounded-full px-4 py-[9px] border active:opacity-80 ${
        selected ? 'bg-navy border-navy' : 'bg-surface border-hairline'
      }`}
    >
      <Typography
        className={`text-[13px] ${selected ? 'font-bold text-white' : 'font-medium text-navy'}`}
      >
        {label}
      </Typography>
    </Pressable>
  );
}

export default function ReferralScreen() {
  const setReferralSource = useSessionStore((s) => s.setReferralSource);

  const [source, setSource] = useState<ReferralSourceId | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const canSubmit = isCompleteAnswer(source, detail);

  const chooseSource = (id: ReferralSourceId) => {
    if (error) setError(null);
    setSource(id);
    // Switching away from Social media or AI discovery must drop the platform
    // that belonged to the old answer, or "Google / LinkedIn" gets saved.
    setDetail(null);
  };

  const chooseDetail = (platform: string) => {
    if (error) setError(null);
    setDetail(platform);
  };

  /**
   * Unlike the fork, this write is awaited and a failure keeps them here.
   *
   * The fork can fire-and-forget because a rep who cannot write the column
   * should still get where they are going. Here the column IS the record that
   * the question was answered — navigate away on a failed write and
   * nextRouteAfterAuth() simply asks again on the next sign-in. Skip, below, is
   * the way off this screen if the write keeps failing.
   */
  const handleSubmit = async () => {
    if (!canSubmit || saving || !source) return;

    setSaving(true);
    const result = await setReferralSource(source, detail);
    setSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    // Back through the router so the fork is next, rather than hardcoding it.
    router.replace(nextRouteAfterAuth(useSessionStore.getState().user));
  };

  return (
    <SafeAreaView className="flex-1 bg-navy" edges={['top', 'bottom']}>
      <NavyGlowBackdrop />
      <ScrollView
        contentContainerClassName="flex-grow justify-center items-center px-8 py-10"
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <CenterColumn max="max-w-[460px]">
          <Typography className="text-[12px] font-bold tracking-[0.14em] text-gold text-center">
            ONE LAST THING
          </Typography>
          <Typography className="mt-4 text-[24px] leading-[1.25] font-extrabold text-white text-center tracking-[-0.01em]">
            Where did you hear about us?
          </Typography>
          <Typography className="mt-3 text-[13.5px] leading-[1.55] text-white/[0.60] text-center">
            It helps us know where to show up next. We only ask once.
          </Typography>

          <View className="gap-3 mt-8">
            {REFERRAL_SOURCES.map((option) => {
              const selected = source === option.id;
              const platforms = detailOptionsFor(option.id);

              return (
                <View key={option.id}>
                  <OptionCard
                    label={option.label}
                    selected={selected}
                    onPress={() => chooseSource(option.id)}
                  />

                  {selected && platforms ? (
                    <View className="bg-white rounded-lg mt-2 p-4">
                      <Typography className="text-[11.5px] font-bold tracking-[0.10em] text-slate">
                        {option.id === 'ai' ? 'WHICH ONE?' : 'WHICH PLATFORM?'}
                      </Typography>
                      <View className="flex-row flex-wrap gap-2 mt-3">
                        {platforms.map((platform) => (
                          <PlatformChip
                            key={platform}
                            label={platform}
                            selected={detail === platform}
                            onPress={() => chooseDetail(platform)}
                          />
                        ))}
                      </View>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>

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

          {/*
           * The shared Skip, which was built for this screen — see its header
           * for why it replaces rather than pushes. `onSkip` writes 'skipped'
           * because a skip that records nothing leaves the column null, and a
           * null column means this screen comes back on every sign-in.
           *
           * Worth knowing: SkipLink goes to homeRoute() rather than back
           * through nextRouteAfterAuth(), so skipping this question lands on
           * Home and defers the fork to the next sign-in. Accepted rather than
           * forking the shared component over it — answering, which is the
           * path nearly everyone takes, chains to the fork correctly.
           */}
          <SkipLink className="mt-2" onSkip={() => setReferralSource(REFERRAL_SKIPPED)} />
        </CenterColumn>
      </ScrollView>
    </SafeAreaView>
  );
}
