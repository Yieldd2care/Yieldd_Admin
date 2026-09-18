import type { ReactNode } from 'react';
import { KeyboardAvoidingView } from 'react-native';

interface Props {
  children: ReactNode;
  className?: string;
}

/**
 * Keeps the keyboard off whatever the person is typing into.
 *
 * Wrap the scrolling body **and** any fixed footer, not just the ScrollView —
 * the Save button usually lives in that footer, and lifting the fields while
 * leaving the button underneath the keyboard solves half the problem.
 *
 * Two rules go with it, and the second is the one that gets forgotten:
 *
 *   1. This component, around the body and the footer.
 *   2. `keyboardShouldPersistTaps="handled"` on the ScrollView inside. React
 *      Native's default is `never`, which means the first tap on any button
 *      while the keyboard is open is spent dismissing the keyboard and never
 *      reaches the button. It reads as a dead button, not as a keyboard
 *      dismissal, and it is why "the Save button does nothing" gets reported.
 *
 * **Why `padding` on Android too, and not `undefined` or `height`.** This used
 * to pass `undefined` on Android, on the reasoning that
 * `softwareKeyboardLayoutMode` defaults to `resize` so the window shrinks by
 * itself. Expo SDK 57 forces Android edge-to-edge, where the window is laid out
 * behind the keyboard and no longer reliably shrinks, so `undefined` — which
 * renders a plain View and adjusts nothing — could leave the field covered.
 * React Native 0.86 ships fixes for edge-to-edge, but does not say whether the
 * root view still resizes, and that cannot be settled from a desk.
 *
 * It does not have to be, because `padding` is right either way. The inset is
 * `max(frame.y + frame.height - keyboardScreenY, 0)`, measured from this view's
 * own onLayout rectangle:
 *
 *   - Window did NOT resize: the frame still runs under the keyboard, and the
 *     subtraction is exactly the overlap. The enclosing SafeAreaView already
 *     reserved `insets.bottom`, and the frame starts below it, so the
 *     navigation bar is not counted twice.
 *   - Window DID resize: layout reports the reduced height while the keyboard
 *     is still in full-screen coordinates, the subtraction goes negative, and
 *     the clamp makes it 0. Nothing is added. No double-adjust.
 *
 * `height` has no such self-correction — it measures against an
 * `_initialFrameHeight` captured at first layout and never recomputed, so it
 * freezes when the keyboard changes size (emoji panel, predictive-text bar).
 *
 * Every screen goes through here rather than hand-rolling its own, so if a
 * handset ever disagrees with the above, this is the one line to change.
 */
export function KeyboardSafe({ children, className = 'flex-1' }: Props) {
  return (
    <KeyboardAvoidingView className={className} behavior="padding">
      {children}
    </KeyboardAvoidingView>
  );
}
