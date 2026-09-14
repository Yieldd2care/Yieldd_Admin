import { useState } from 'react';
import { Pressable } from 'react-native';
import { router } from 'expo-router';

import { Typography } from '../ui/Typography';
import { homeRoute } from '../../lib/auth/nextRoute';

/**
 * The Skip affordance for onboarding screens (PENDING.md #33c).
 *
 * NOT USED BY ANY SCREEN YET, and that is not an oversight. Both onboarding
 * screens that exist today were looked at on 2026-09-14 and neither takes a
 * Skip: the contact number is mandatory (#4), and the fork is a two-tap
 * question with no sensible third answer. This exists for the referral screen
 * (#33b) and the first-run tutorial (#33d), which are genuinely optional, so
 * that neither of them invents its own.
 *
 * Shared rather than copied so those two inherit the same words, the same
 * position and — more importantly — the same two rules that are easy to get
 * wrong:
 *
 * 1. `replace`, never `push`. Onboarding must not sit in the back stack
 *    waiting to be swiped back into. Same reasoning as the fork's own
 *    navigation.
 * 2. Skipping goes to `homeRoute()`, which already knows a browser belongs on
 *    the dashboard and a phone on the tab bar.
 *
 * `onSkip` is for a screen that has to *record* the skip somewhere, which is
 * what stops the same screen reappearing on the next sign-in. It is awaited so
 * the write is in flight before we navigate, but a failure is swallowed on
 * purpose: a skip the database refused is still a skip the person asked for,
 * and stranding them here would be the worse outcome.
 */
export function SkipLink({
  label = 'Skip for now',
  busyLabel = 'Skipping…',
  onSkip,
  className = '',
}: {
  label?: string;
  busyLabel?: string;
  /** Runs before navigating. Errors are swallowed; see above. */
  onSkip?: () => Promise<unknown>;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);

  const skip = async () => {
    if (busy) return;

    if (onSkip) {
      setBusy(true);
      try {
        await onSkip();
      } catch {
        // Deliberately ignored — we leave either way.
      }
      // No setBusy(false): the next line unmounts this screen.
    }

    router.replace(homeRoute());
  };

  return (
    <Pressable
      onPress={skip}
      accessibilityRole="button"
      accessibilityLabel={label}
      className={`self-center px-8 py-3 active:opacity-60 ${className}`}
    >
      <Typography className="text-[12.5px] font-bold text-white/[0.62] text-center">
        {busy ? busyLabel : label}
      </Typography>
    </Pressable>
  );
}
