import { View } from 'react-native';

/**
 * The faint concentric circles behind the hero, the dark role panel and the
 * closing CTA. Lifted from the rings Hero.tsx already drew.
 *
 * Every ring sets width and height explicitly and equally. This is not
 * belt-and-braces: in React Native a large borderRadius on a NON-square view
 * produces a stadium — two straight sides with rounded caps — not an ellipse.
 * A ring sized by percentage or by flex would quietly stop being round.
 *
 * Unlike the original, these do not rotate. Spinning a perfect 1px circle is
 * visually a no-op; it only costs a JS animation loop per ring.
 */

interface Props {
  /** Diameters, largest first. */
  sizes: number[];
  /** Vertical centre of the ring stack, as a share of the parent's height. */
  originY?: number;
  color?: string;
  className?: string;
}

export function ConcentricRings({
  sizes,
  originY = 0.42,
  color = 'rgba(255,255,255,0.07)',
  className = '',
}: Props) {
  return (
    <View pointerEvents="none" className={`absolute inset-0 overflow-hidden ${className}`}>
      {sizes.map((size) => (
        <View
          key={size}
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 1,
            borderColor: color,
            left: '50%',
            top: `${originY * 100}%` as `${number}%`,
            marginLeft: -size / 2,
            marginTop: -size / 2,
          }}
        />
      ))}
    </View>
  );
}
