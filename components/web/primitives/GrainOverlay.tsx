import { View } from 'react-native';

/**
 * A film-grain tile over a large gradient, which is what stops it banding into
 * visible steps on a wide display.
 *
 * `.web-grain` (global.css) blends at soft-light, and mix-blend-mode resolves
 * against the nearest stacking context — so this has to sit INSIDE the
 * element that paints the gradient, not over the section as a whole. Placed a
 * level too high it blends against the page background and does nothing.
 */

interface Props {
  /** 0-1. Subtle is the point; past ~0.5 it reads as noise, not texture. */
  opacity?: number;
  className?: string;
}

export function GrainOverlay({ opacity = 0.3, className = '' }: Props) {
  return (
    <View
      pointerEvents="none"
      className={`absolute inset-0 web-grain ${className}`}
      style={{ opacity }}
    />
  );
}
