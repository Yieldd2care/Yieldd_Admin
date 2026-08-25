import { Pressable, View } from 'react-native';
import { router } from 'expo-router';

import { Typography } from '../ui/Typography';
import { ChevronLeftIcon } from '../ui/icons';

interface Props {
  title: string;
  step: number;
  totalSteps?: number;
}

export function WizardHeader({ title, step, totalSteps = 6 }: Props) {
  const progress = (step / totalSteps) * 100;

  return (
    <View className="bg-white border-b border-hairline pt-[18px] px-5 pb-4">
      <View className="flex-row items-center gap-3">
        <Pressable onPress={() => router.back()} className="w-[34px] h-[34px] rounded-md bg-surface items-center justify-center">
          <ChevronLeftIcon />
        </Pressable>
        <Typography className="text-[20px] leading-[1.3] font-bold tracking-[-0.01em] text-navy">{title}</Typography>
      </View>
      <View className="h-1 rounded-full bg-surface mt-[14px] overflow-hidden">
        <View className="h-full bg-gold rounded-full" style={{ width: `${progress}%` }} />
      </View>
      <Typography variant="caption" className="text-slate mt-[6px]">
        Step {step} of {totalSteps}
      </Typography>
    </View>
  );
}
