import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Svg, { Path, Rect } from 'react-native-svg';

import { Typography } from '../../../../components/ui/Typography';
import { Button } from '../../../../components/ui/Button';
import { Toggle } from '../../../../components/ui/Toggle';
import { WizardHeader } from '../../../../components/app/WizardHeader';
import { CustomFieldsEditor } from '../../../../components/app/CustomFieldsEditor';
import { ClockIcon } from '../../../../components/ui/icons';

function ListIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#0B132B" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="4" width="18" height="16" rx="2" />
      <Path d="M7 8h10M7 12h6" />
    </Svg>
  );
}

function BoxIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#0B132B" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="4" y="7" width="16" height="13" rx="2" />
      <Path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" />
    </Svg>
  );
}

interface Template {
  key: string;
  title: string;
  sub: string;
  icon: ReactNode;
  on: boolean;
}

export default function CustomFieldsScreen() {
  const [templates, setTemplates] = useState<Template[]>([
    { key: 'product', title: 'Product interest', sub: 'Dropdown', icon: <ListIcon />, on: true },
    { key: 'qty', title: 'Order quantity', sub: 'Number', icon: <BoxIcon />, on: true },
    { key: 'timeline', title: 'Buying timeline', sub: 'Dropdown', icon: <ClockIcon size={17} strokeWidth={1.75} />, on: false },
  ]);

  const toggleTemplate = (key: string) =>
    setTemplates((prev) => prev.map((t) => (t.key === key ? { ...t, on: !t.on } : t)));

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
      <WizardHeader title="What do you need to ask?" step={4} />
      <ScrollView contentContainerClassName="px-5 pt-5 pb-5" showsVerticalScrollIndicator={false}>
        <Typography className="text-[13px] leading-[1.55] text-slate mb-5">
          Turn these on to capture what your industry actually needs at the booth.
        </Typography>

        <Typography variant="caption" className="text-slate mb-[10px]">
          Ready-made fields
        </Typography>
        {templates.map((t) => (
          <Pressable
            key={t.key}
            onPress={() => toggleTemplate(t.key)}
            className={`flex-row items-center gap-[14px] bg-white border rounded-lg p-4 mb-[10px] ${
              t.on ? 'border-gold/[0.45]' : 'border-hairline'
            }`}
            style={t.on ? { backgroundColor: 'rgba(244,176,0,0.05)' } : undefined}
          >
            <View className="w-9 h-9 rounded-md bg-surface items-center justify-center">{t.icon}</View>
            <View className="flex-1">
              <Typography className="text-[14px] font-bold text-navy">{t.title}</Typography>
              <Typography className="text-[12px] text-slate mt-[2px]">{t.sub}</Typography>
            </View>
            <Toggle value={t.on} onValueChange={() => toggleTemplate(t.key)} />
          </Pressable>
        ))}

        <View className="mt-5">
          <CustomFieldsEditor />
        </View>
      </ScrollView>
      <View className="bg-white border-t border-hairline px-5 pt-[14px] pb-6 items-center gap-3">
        <Button label="Continue" onPress={() => router.push('/(app)/events/new/templates')} className="w-full" />
        <Pressable onPress={() => router.push('/(app)/events/new/templates')}>
          <Typography className="text-[13px] font-semibold text-slate">Skip for now</Typography>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
