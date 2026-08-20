import { LinearGradient } from 'expo-linear-gradient';
import type { ViewProps } from 'react-native';

type Preset = 'navy-gold-diagonal' | 'navy-blue-diagonal' | 'gold-brushed';

const PRESETS: Record<
  Preset,
  { colors: [string, string]; start: { x: number; y: number }; end: { x: number; y: number } }
> = {
  'navy-gold-diagonal': { colors: ['#0B132B', '#1D3F8A'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  'navy-blue-diagonal': { colors: ['#0B132B', '#101C3E'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  'gold-brushed': { colors: ['#F4B000', '#FFC53D'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
};

interface Props extends ViewProps {
  preset: Preset;
  className?: string;
}

export function GradientPanel({ preset, className = '', style, children, ...rest }: Props) {
  const { colors, start, end } = PRESETS[preset];
  return (
    <LinearGradient colors={colors} start={start} end={end} className={className} style={style} {...rest}>
      {children}
    </LinearGradient>
  );
}
