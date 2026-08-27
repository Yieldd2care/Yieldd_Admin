import { useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput as RNTextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../../../../components/ui/Typography';
import { Button } from '../../../../components/ui/Button';
import { WizardHeader } from '../../../../components/app/WizardHeader';

const COST_KEYS = [
  'Stall',
  'Fabrication',
  'Furniture',
  'Travel',
  'Staff',
  'Accommodation',
  'Marketing',
] as const;

type CostKey = (typeof COST_KEYS)[number];

// Typed rather than `as const` so `hint` is optional on every entry — with
// `as const` the array widens to a union in which only Staff has `hint`, and
// destructuring it below is a type error.
const FIELDS: readonly { key: CostKey; hint?: string }[] = [
  { key: 'Stall' },
  { key: 'Fabrication' },
  { key: 'Furniture' },
  { key: 'Travel' },
  { key: 'Staff', hint: 'e.g. food or transportation' },
  { key: 'Accommodation' },
  { key: 'Marketing' },
];

function formatInr(n: number) {
  return n.toLocaleString('en-IN');
}

export default function EventCostScreen() {
  const [values, setValues] = useState<Record<(typeof FIELDS)[number]['key'], string>>({
    Stall: '',
    Fabrication: '',
    Furniture: '',
    Travel: '',
    Staff: '',
    Accommodation: '',
    Marketing: '',
  });

  const total = useMemo(
    () => Object.values(values).reduce((sum, v) => sum + (parseInt(v.replace(/[^\d]/g, ''), 10) || 0), 0),
    [values]
  );

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
      <WizardHeader title="What did this cost?" step={2} />
      <ScrollView contentContainerClassName="px-5 pt-5 pb-5" showsVerticalScrollIndicator={false}>
        <Typography className="text-[13px] leading-[1.55] text-slate mb-5">
          This is the number the ROI dashboard is built on &mdash; add whatever you know now, adjust later.
        </Typography>

        <View className="bg-navy rounded-lg px-5 py-[18px] mb-5">
          <Typography className="text-[30px] font-extrabold tracking-[-0.01em] text-white">
            &#8377;{formatInr(total)}
          </Typography>
          <Typography className="text-[12px] text-white/[0.60] mt-1">TOTAL EVENT COST</Typography>
        </View>

        {FIELDS.map(({ key, hint }) => (
          <View
            key={key}
            className={`flex-row items-center gap-3 bg-white border border-hairline rounded-md px-4 mb-3 ${
              hint ? 'py-3' : 'h-[52px]'
            }`}
          >
            <View className="flex-1">
              <Typography className="text-[14px] font-semibold text-navy">{key}</Typography>
              {hint ? <Typography className="text-[11px] text-slate mt-[1px]">{hint}</Typography> : null}
            </View>
            <Typography className="text-[14px] font-semibold text-slate">&#8377;</Typography>
            <RNTextInput
              className="w-[120px] text-right text-[14.5px] font-regular text-navy"
              placeholder="0"
              placeholderTextColor="#97A3B8"
              keyboardType="number-pad"
              value={values[key]}
              onChangeText={(v) => setValues((prev) => ({ ...prev, [key]: v }))}
            />
          </View>
        ))}
      </ScrollView>
      <View className="bg-white border-t border-hairline px-5 pt-[14px] pb-6 items-center gap-3">
        <Button label="Continue" onPress={() => router.push('/(app)/events/new/invite')} className="w-full" />
        <Pressable onPress={() => router.push('/(app)/events/new/invite')}>
          <Typography className="text-[13px] font-semibold text-slate">Skip for now</Typography>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
