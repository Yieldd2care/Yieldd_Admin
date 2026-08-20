import { Pressable, View } from 'react-native';
import { router } from 'expo-router';

import { Typography } from '../ui/Typography';
import { Button } from '../ui/Button';
import { BlurHeader } from '../ui/BlurHeader';
import { BrandLockup } from '../ui/BrandLockup';

const LINKS: { key: string; label: string }[] = [
  { key: 'how', label: 'How it works' },
  { key: 'features', label: 'Features' },
  { key: 'roi', label: 'Event ROI' },
  { key: 'industries', label: 'Industries' },
  { key: 'faq', label: 'FAQ' },
];

interface Props {
  onNavigate: (key: string) => void;
}

export function WebNav({ onNavigate }: Props) {
  return (
    <BlurHeader className="border-b border-white/[0.12]">
      <View className="max-w-[1200px] w-full mx-auto px-8 py-3 flex-row items-center justify-between gap-8">
        <Pressable onPress={() => onNavigate('top')}>
          <BrandLockup size="sm" />
        </Pressable>
        <View className="hidden lg:flex flex-row items-center gap-[26px] flex-1 justify-end">
          {LINKS.map((link) => (
            <Pressable key={link.key} onPress={() => onNavigate(link.key)}>
              <Typography className="text-white/[0.78] hover:text-white text-[14.5px] font-medium transition-colors duration-200">
                {link.label}
              </Typography>
            </Pressable>
          ))}
          <Pressable onPress={() => router.push('/(auth)')}>
            <Typography className="text-white text-[14.5px] font-semibold">Sign in</Typography>
          </Pressable>
          <Button label="Get started" onPress={() => router.push('/(auth)')} className="h-11 px-[22px]" />
        </View>
        <Pressable className="lg:hidden" onPress={() => router.push('/(auth)')}>
          <Typography className="text-gold text-[14.5px] font-semibold">Get started</Typography>
        </Pressable>
      </View>
    </BlurHeader>
  );
}
