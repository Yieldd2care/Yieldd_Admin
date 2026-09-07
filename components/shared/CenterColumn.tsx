import type { ReactNode } from 'react';
import { View } from 'react-native';

/**
 * Caps content to a readable column so it stops stretching across a desktop
 * monitor. The parent needs `items-center` for this to centre.
 *
 * On a phone this is a no-op: `w-full` inside a padded screen is already
 * narrower than any of the caps used here, so native layout is unchanged.
 * That is why these screens can stay one file rather than splitting into
 * web and native versions the way sign-in did.
 */
export function CenterColumn({
  max = 'max-w-[420px]',
  className = '',
  children,
}: {
  /** A Tailwind max-width class. Forms 420, choice screens 460, builders 560. */
  max?: string;
  className?: string;
  children: ReactNode;
}) {
  return <View className={`w-full ${max} ${className}`}>{children}</View>;
}
