import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { Typography } from '../../components/ui/Typography';
import { NavyGlowBackdrop } from '../../components/app/NavyGlowBackdrop';
import { ChevronRightIcon, UsersIcon, ProfileIcon } from '../../components/ui/icons';

function ChecklistIllustration() {
  return (
    <Svg width={150} height={140} viewBox="0 0 160 150" fill="none">
      <Rect x="62" y="10" width="36" height="14" rx="5" fill="#0B132B" stroke="rgba(255,255,255,0.40)" strokeWidth="2" />
      <Rect x="40" y="20" width="80" height="112" rx="12" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.30)" strokeWidth="1.5" />
      <Rect x="54" y="42" width="16" height="16" rx="4" fill="#F4B000" />
      <Path d="M58 50l3 3 6-7" stroke="#0B132B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Rect x="76" y="46" width="30" height="5" rx="2.5" fill="rgba(255,255,255,0.30)" />
      <Rect x="54" y="70" width="16" height="16" rx="4" fill="#F4B000" />
      <Path d="M58 78l3 3 6-7" stroke="#0B132B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Rect x="76" y="74" width="30" height="5" rx="2.5" fill="rgba(255,255,255,0.30)" />
      <Rect x="54" y="98" width="16" height="16" rx="4" fill="none" stroke="rgba(255,255,255,0.30)" strokeWidth="1.5" />
      <Rect x="76" y="102" width="24" height="5" rx="2.5" fill="rgba(255,255,255,0.18)" />
      <Line x1="98" y1="118" x2="128" y2="98" stroke="#F4B000" strokeWidth="4" strokeLinecap="round" />
      <Circle cx="130" cy="96.5" r="3" fill="#F4B000" />
    </Svg>
  );
}

function ForkOption({
  icon,
  title,
  description,
  onPress,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="bg-white rounded-lg p-5 flex-row items-start gap-[14px] active:opacity-80">
      <View className="w-11 h-11 rounded-md bg-gold/[0.14] items-center justify-center flex-shrink-0">{icon}</View>
      <View className="flex-1">
        <Typography className="text-[16.5px] font-bold text-navy">{title}</Typography>
        <Typography className="text-[13px] leading-[1.5] text-slate mt-2">{description}</Typography>
      </View>
      <View className="mt-1">
        <ChevronRightIcon />
      </View>
    </Pressable>
  );
}

export default function ForkScreen() {
  const chooseTeam = () => router.push('/(app)/events/new');
  const chooseSolo = () => router.push('/(app)/card/edit');

  return (
    <SafeAreaView className="flex-1 bg-navy" edges={['top', 'bottom']}>
      <NavyGlowBackdrop />
      <View className="flex-1">
        <View className="items-center pt-8 px-8">
          <ChecklistIllustration />
        </View>

        <View className="px-8 pt-[12px] items-center">
          <Typography variant="caption" className="text-gold">
            One quick question
          </Typography>
          <Typography className="mt-3 text-[26px] leading-[1.28] font-extrabold tracking-[-0.01em] text-white text-center">
            Setting this up for a team, or just yourself?
          </Typography>
        </View>

        <View className="gap-4 px-6 pt-10">
          <ForkOption
            icon={<UsersIcon size={20} color="#F4B000" strokeWidth={2} />}
            title="For my team"
            description="Create an event, invite reps, and see live results across everyone."
            onPress={chooseTeam}
          />
          <ForkOption
            icon={<ProfileIcon size={20} color="#F4B000" strokeWidth={2} />}
            title="Just me"
            description="Build your digital card and start capturing leads right away."
            onPress={chooseSolo}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
