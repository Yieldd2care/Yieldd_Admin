import { View } from 'react-native';

/**
 * A faint dot lattice over a dark panel — the texture the reference lays under
 * its role panel and its closing CTA.
 *
 * A tiled radial-gradient rather than hundreds of Views: one paint, no layout
 * cost, and it resizes with the panel for free. This is web-only CSS, which is
 * fine here — nothing under components/web/ renders on a device.
 */

interface Props {
  /** Lattice pitch in px. */
  size?: number;
  opacity?: number;
  className?: string;
}

export function DotGrid({ size = 46, opacity = 0.22, className = '' }: Props) {
  return (
    <View
      pointerEvents="none"
      className={`absolute inset-0 [background-image:radial-gradient(rgba(255,255,255,0.9)_1px,transparent_1px)] ${className}`}
      style={{ backgroundSize: `${size}px ${size}px`, opacity } as never}
    />
  );
}
