import { View, type ViewProps } from 'react-native';

interface Props extends ViewProps {
  color?: string;
  size?: number;
  className?: string;
}

/**
 * Layered flat circles approximating a CSS radial-gradient glow — RN has no
 * native radial-gradient primitive, so this fakes the soft falloff.
 */
export function RadialGlow({ color = '#1D3F8A', size = 700, className = '', style, ...rest }: Props) {
  return (
    <View pointerEvents="none" className={`absolute ${className}`} style={style} {...rest}>
      <View
        className="rounded-full"
        style={{ width: size, height: size, backgroundColor: color, opacity: 0.1 }}
      />
      <View
        className="rounded-full absolute"
        style={{
          width: size * 0.6,
          height: size * 0.6,
          top: size * 0.2,
          left: size * 0.2,
          backgroundColor: color,
          opacity: 0.14,
        }}
      />
      <View
        className="rounded-full absolute"
        style={{
          width: size * 0.3,
          height: size * 0.3,
          top: size * 0.35,
          left: size * 0.35,
          backgroundColor: color,
          opacity: 0.18,
        }}
      />
    </View>
  );
}
