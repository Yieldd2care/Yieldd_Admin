import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';

interface Props {
  children: ReactNode;
}

export function SheetShell({ children }: Props) {
  return (
    <View className="flex-1 justify-end bg-navy/[0.55]">
      <Pressable className="flex-1" onPress={() => router.back()} />
      <View className="bg-white rounded-t-[22px] px-6 pt-[10px] pb-8">
        <View className="w-9 h-1 rounded-full bg-hairline self-center mb-[18px]" />
        {children}
      </View>
    </View>
  );
}
