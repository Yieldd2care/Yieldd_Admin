import { View, type ViewProps } from 'react-native';

interface Props extends ViewProps {
  className?: string;
}

export function Card({ className = '', ...rest }: Props) {
  return <View className={`border border-hairline rounded-lg bg-white ${className}`} {...rest} />;
}
