import { useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput as RNTextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../../../../components/ui/Typography';
import { Button } from '../../../../components/ui/Button';
import { WizardHeader } from '../../../../components/app/WizardHeader';
import { COST_KEYS, useEventDraftStore, type CostKey } from '../../../../stores/useEventDraftStore';

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

/** Only the digits count — people type "8,40,000" and "Rs 12000" alike. */
function toAmount(value: string): number {
  return parseInt(value.replace(/[^\d]/g, ''), 10) || 0;
}

export default function EventCostScreen() {
  const savedCosts = useEventDraftStore((s) => s.costs);

  const [values, setValues] = useState<Record<CostKey, string>>(() =>
    COST_KEYS.reduce(
      (acc, key) => ({ ...acc, [key]: savedCosts[key] ? String(savedCosts[key]) : '' }),
      {} as Record<CostKey, string>
    )
  );

  const total = useMemo(
    () => Object.values(values).reduce((sum, v) => sum + toAmount(v), 0),
    [values]
  );

  // Both the primary button and "Skip for now" commit, because skipping means
  // "no costs yet", not "throw away what I already typed".
  const commitAndContinue = () => {
    useEventDraftStore.getState().setCosts(
      COST_KEYS.reduce(
        (acc, key) => ({ ...acc, [key]: toAmount(values[key]) }),
        {} as Record<CostKey, number>
      )
    );
    router.push('/(app)/events/new/invite');
  };

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
        <Button label="Continue" onPress={commitAndContinue} className="w-full" />
        <Pressable onPress={commitAndContinue}>
          <Typography className="text-[13px] font-semibold text-slate">Skip for now</Typography>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
