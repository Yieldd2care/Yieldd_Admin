import { TextInput as RNTextInput, View, type TextInputProps } from 'react-native';

import { Typography } from './Typography';

interface Props extends TextInputProps {
  label?: string;
  className?: string;
}

export function TextInput({ label, className = '', ...rest }: Props) {
  return (
    <View className="gap-[7px]">
      {label ? (
        <Typography variant="body-sm" className="text-ink-muted">
          {label}
        </Typography>
      ) : null}
      <RNTextInput
        className={`h-[52px] bg-white rounded-md px-4 text-[15.5px] font-regular text-navy border border-hairline focus:border-transparent focus:outline focus:outline-2 focus:outline-gold focus:outline-offset-2 ${className}`}
        placeholderTextColor="#97A3B8"
        {...rest}
      />
    </View>
  );
}
