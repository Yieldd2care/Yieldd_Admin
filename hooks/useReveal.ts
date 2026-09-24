import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

/**
 * Fades and lifts an element in as it scrolls into view.
 *
 * Driven by IntersectionObserver rather than a scroll handler, for two
 * reasons. It fires once per threshold crossing instead of once per frame; and
 * mutating a Reanimated shared value writes straight to the node without
 * re-rendering React. That second point is the important one — AGENTS.md
 * records that a continuously re-rendering tree is what catches NativeWind
 * mid-upgrade and throws the bogus "Couldn't find a navigation context" red
 * screen.
 *
 * The other tempting implementation, swapping `opacity-0`/`translate-y-4`
 * classes, is exactly what AGENTS.md forbids: transforms are variable-backed,
 * and gaining one after the first render trips the same failure.
 *
 * It starts VISIBLE and only hides itself once it has confirmed it can observe
 * and animate. A reveal that fails closed leaves the page blank, so every path
 * that cannot run the animation — native, no IntersectionObserver, reduced
 * motion — simply leaves the content shown.
 */

interface Options {
  /** Stagger, in ms, for use by <Deck>. */
  delay?: number;
  /** Re-hide when scrolled back out. Off by default. */
  once?: boolean;
  /** Share of the element that must be visible before it animates. */
  threshold?: number;
  /** Distance in px the element rises through. */
  distance?: number;
}

function prefersReducedMotion() {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.matchMedia) {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function canAnimate() {
  return (
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    typeof window.IntersectionObserver !== 'undefined' &&
    !prefersReducedMotion()
  );
}

export function useReveal({
  delay = 0,
  once = true,
  threshold = 0.16,
  distance = 18,
}: Options = {}) {
  // Decided at render, not in the effect. Starting at 1 and hiding afterwards
  // would paint the content, remove it, then fade it back in — one frame of
  // flicker on every element on the page. Anywhere the animation cannot run,
  // this is 1 and the content is simply there.
  const animates = canAnimate();
  const progress = useSharedValue(animates ? 0 : 1);
  const hostRef = useRef<unknown>(null);

  useEffect(() => {
    if (!animates) return;

    const node = hostRef.current as Element | null;
    // react-native-web hands back the host DOM node, but guard rather than
    // trust it — a future wrapper component would return an instance instead.
    if (!node || typeof (node as { nodeType?: number }).nodeType !== 'number') {
      progress.value = 1;
      return;
    }

    let shown = false;
    const show = () => {
      shown = true;
      progress.value = withDelay(
        delay,
        withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }),
      );
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting) {
          show();
          if (once) observer.disconnect();
        } else if (!once) {
          progress.value = withTiming(0, { duration: 200 });
        }
      },
      { threshold },
    );

    observer.observe(node);

    // The whole point of a reveal failing safe: if the observer never fires —
    // a browser quirk, a detached node, a zero-size ancestor — the content
    // would sit at opacity 0 for ever. After a second, show it regardless.
    const failsafe = setTimeout(() => {
      if (!shown) {
        shown = true;
        progress.value = withTiming(1, { duration: 200 });
      }
    }, 1000);

    return () => {
      clearTimeout(failsafe);
      observer.disconnect();
    };
    // Deliberately mount-only: these options never change for a given element,
    // and re-running would re-hide content mid-scroll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * distance }],
  }));

  return { hostRef, style };
}
