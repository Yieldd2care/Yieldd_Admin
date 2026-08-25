import { TextInput as RNTextInput, type TextInputProps } from 'react-native';

export function AuthPillInput({ className = '', ...rest }: TextInputProps & { className?: string }) {
  return (
    <RNTextInput
      className={`w-full h-[52px] rounded-full bg-white px-[22px] text-[14.5px] font-regular text-navy ${className}`}
      placeholderTextColor="#97A3B8"
      {...rest}
    />
  );
}
