import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

/**
 * A ring chart showing one percentage.
 *
 * The reference draws this with a conic-gradient. SVG has no conic gradient,
 * so the arc is a stroked circle clipped by strokeDasharray — which is the
 * better tool anyway: it stays crisp at any size and needs no masking.
 *
 * strokeLinecap is `butt`, not `round`. A round cap adds half a stroke width
 * of visual length at each end, which at a high percentage closes the gap
 * entirely and turns a 94% ring into a full one.
 *
 * The centre label is a sibling View rather than an SVG <Text> so it picks up
 * the site's fonts and NativeWind classes.
 */

interface Props {
  /** 0-1. */
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  label?: string;
  className?: string;
}

export function Donut({
  value,
  size = 74,
  stroke = 10,
  color = '#F4B000',
  trackColor = '#E3E7EF',
  label,
  className = '',
}: Props) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, value));
  const centre = size / 2;

  return (
    <View className={`items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={centre}
          cy={centre}
          r={radius}
          stroke={trackColor}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={centre}
          cy={centre}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${circumference * clamped} ${circumference}`}
          strokeLinecap="butt"
          // Start at twelve o'clock rather than three.
          transform={`rotate(-90 ${centre} ${centre})`}
        />
      </Svg>

      {label ? (
        <View className="absolute inset-0 items-center justify-center">
          <Text className="[font-family:Figtree,system-ui,sans-serif] [font-weight:800] text-[15px] leading-none text-navy">
            {label}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
