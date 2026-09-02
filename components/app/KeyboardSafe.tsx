import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';

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
 * **Why `undefined` on Android rather than `height`.** Expo leaves
 * `softwareKeyboardLayoutMode` at its default of `resize`, so Android already
 * shrinks the window when the keyboard opens and the layout reflows on its own.
 * Adding `height` on top of that adjusts twice and makes the content jump. iOS
 * does not resize anything, so it needs `padding`.
 */
export function KeyboardSafe({ children, className = 'flex-1' }: Props) {
  return (
    <KeyboardAvoidingView
      className={className}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {children}
    </KeyboardAvoidingView>
  );
}
