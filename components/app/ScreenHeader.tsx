import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';

import { Typography } from '../ui/Typography';
import { ChevronLeftIcon } from '../ui/icons';

interface Props {
  title: string;
  right?: ReactNode;
  onBack?: () => void;
}

export function ScreenHeader({ title, right, onBack }: Props) {
  return (
    <View className="bg-white border-b border-hairline flex-row items-center justify-between px-5 pt-[18px] pb-4">
      <View className="flex-row items-center gap-3 flex-1 min-w-0">
        <Pressable
          onPress={onBack ?? (() => router.back())}
          className="w-[34px] h-[34px] rounded-md bg-surface items-center justify-center"
        >
          <ChevronLeftIcon />
        </Pressable>
        <Typography className="text-[18px] leading-[1.3] font-bold tracking-[-0.01em] text-navy" numberOfLines={1}>
          {title}
        </Typography>
      </View>
      {right}
    </View>
  );
}
