import { Image } from 'react-native';

type Size = 'sm' | 'md';

const SIZES: Record<Size, { width: number }> = {
  sm: { width: 174 },
  md: { width: 214 },
};

interface Props {
  size?: Size;
}

const ASPECT = 2172 / 724;

export function BrandLockup({ size = 'sm' }: Props) {
  const s = SIZES[size];
  return (
    <Image
      source={require('../../assets/brand/transparenet secondary logo.png')}
      style={{ width: s.width, height: s.width / ASPECT }}
      resizeMode="contain"
    />
  );
}
