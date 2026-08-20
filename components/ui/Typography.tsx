import { Text, type TextProps } from 'react-native';

type Variant =
  | 'display-xl'
  | 'display-lg'
  | 'display-md'
  | 'heading-lg'
  | 'heading-md'
  | 'body-lg'
  | 'body-md'
  | 'body-sm'
  | 'caption';

const VARIANT_CLASSES: Record<Variant, string> = {
  'display-xl': 'text-[38px] leading-[1.1] font-extrabold tracking-tight',
  'display-lg': 'text-[30px] leading-[1.14] font-extrabold tracking-tight',
  'display-md': 'text-[23px] leading-[1.18] font-extrabold tracking-tight',
  'heading-lg': 'text-xl leading-snug font-bold tracking-tight',
  'heading-md': 'text-[17px] leading-snug font-semibold',
  'body-lg': 'text-[16px] leading-[1.65] font-regular',
  'body-md': 'text-[14.5px] leading-[1.6] font-regular',
  'body-sm': 'text-[13px] leading-relaxed font-medium',
  caption: 'text-[11px] tracking-[0.14em] uppercase font-bold',
};

interface Props extends TextProps {
  variant?: Variant;
  className?: string;
}

export function Typography({ variant = 'body-md', className = '', style, ...rest }: Props) {
  return <Text className={`${VARIANT_CLASSES[variant]} ${className}`} style={style} {...rest} />;
}
