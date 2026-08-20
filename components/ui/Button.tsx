import { Pressable, type PressableProps } from 'react-native';

import { Typography } from './Typography';

type Variant = 'primary' | 'secondary' | 'ghost';

interface Props extends PressableProps {
  label: string;
  variant?: Variant;
  className?: string;
}

const BASE =
  'h-14 px-7 rounded-md items-center justify-center flex-row transition-all duration-200';

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-gold hover:bg-gold-hover active:scale-[0.98] hover:-translate-y-0.5 shadow-[0_10px_26px_rgba(244,176,0,0.34)]',
  secondary: 'border border-white/[0.30] hover:border-gold active:scale-[0.98]',
  ghost: 'active:opacity-70',
};

const TEXT_CLASSES: Record<Variant, string> = {
  primary: 'text-navy font-bold text-base',
  secondary: 'text-white font-medium text-base',
  ghost: 'text-gold font-semibold text-base',
};

export function Button({ label, variant = 'primary', className = '', ...rest }: Props) {
  return (
    <Pressable className={`${BASE} ${VARIANT_CLASSES[variant]} ${className}`} {...rest}>
      <Typography className={TEXT_CLASSES[variant]}>{label}</Typography>
    </Pressable>
  );
}
