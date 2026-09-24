import { View } from 'react-native';

/**
 * A single bar split into proportional coloured segments — the ageing
 * breakdowns in the reference's data previews.
 *
 * Segments are flex-weighted rather than percentage-width so they always fill
 * the track exactly, whatever the weights add up to.
 *
 * Every segment but the last is pulled one pixel right. Without that, adjacent
 * children of a rounded, clipped row show a hairline of the track between them
 * at fractional device pixel ratios — a seam that looks like a rendering bug.
 */

export interface Segment {
  /** Relative weight. These need not sum to any particular number. */
  weight: number;
  color: string;
}

interface Props {
  segments: Segment[];
  height?: number;
  trackColor?: string;
  className?: string;
}

export function StackedBar({ segments, height = 10, trackColor = '#EEF1F7', className = '' }: Props) {
  return (
    <View
      className={`flex-row rounded-full overflow-hidden ${className}`}
      style={{ height, backgroundColor: trackColor }}
    >
      {segments.map((segment, i) => (
        <View
          key={`${segment.color}-${i}`}
          style={{
            flex: segment.weight,
            backgroundColor: segment.color,
            marginRight: i === segments.length - 1 ? 0 : -1,
          }}
        />
      ))}
    </View>
  );
}
