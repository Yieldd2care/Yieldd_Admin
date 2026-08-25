import { Pressable, View } from 'react-native';

interface Props {
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export function Toggle({ value, onValueChange }: Props) {
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      className={`w-11 h-[26px] rounded-full p-[3px] ${value ? 'bg-gold items-end' : 'bg-surface items-start'}`}
    >
      <View className="w-5 h-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)]" />
    </Pressable>
  );
}
