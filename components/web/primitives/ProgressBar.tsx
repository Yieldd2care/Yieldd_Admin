import { View } from 'react-native';

/**
 * A track with a filled portion, and an optional hard colour change at the
 * fill point — the reference's timeline bar, where the amber "nobody knows
 * yet" stretch meets the blue "the report arrives" one at a single edge.
 *
 * Two sibling views rather than a gradient with a doubled colour stop: it
 * costs one fewer browser-only feature, and the fill can be animated by width
 * later if that is ever wanted.
 */

interface Props {
  /** 0-1. */
  value: number;
  height?: number;
  color?: string;
  trackColor?: string;
  className?: string;
}

export function ProgressBar({
  value,
  height = 10,
  color = '#F4B000',
  trackColor = '#E3E7EF',
  className = '',
}: Props) {
  const pct = `${Math.max(0, Math.min(1, value)) * 100}%` as `${number}%`;

  return (
    <View
      className={`rounded-full overflow-hidden ${className}`}
      style={{ height, backgroundColor: trackColor }}
    >
      <View style={{ width: pct, height: '100%', backgroundColor: color }} />
    </View>
  );
}
