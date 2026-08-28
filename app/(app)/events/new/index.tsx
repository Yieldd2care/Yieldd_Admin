import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../../../../components/ui/Typography';
import { Button } from '../../../../components/ui/Button';
import { TextInput } from '../../../../components/ui/TextInput';
import { DateField } from '../../../../components/app/DateField';
import { WizardHeader } from '../../../../components/app/WizardHeader';
import { useEventDraftStore } from '../../../../stores/useEventDraftStore';

const SUGGESTIONS = ['IMTEX', 'Plastindia', 'Vibrant Gujarat', 'Auto Expo', 'IITF'];

export default function CreateEventScreen() {
  const draft = useEventDraftStore();

  // Seeded from the draft so re-entering the wizard — or coming back from the
  // last screen's "Edit event details" — shows what was typed, not a blank form.
  const [name, setName] = useState(draft.name);
  const [city, setCity] = useState(draft.city);
  const [startDate, setStartDate] = useState<Date | null>(
    draft.startDate ? new Date(draft.startDate) : null
  );
  const [endDate, setEndDate] = useState<Date | null>(
    draft.endDate ? new Date(draft.endDate) : null
  );

  const canContinue = name.trim() !== '' && city.trim() !== '' && startDate !== null && endDate !== null;

  const handleContinue = () => {
    useEventDraftStore.getState().setDetails({ name, city, startDate, endDate });
    router.push('/(app)/events/new/cost');
  };

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
      <WizardHeader title="Create your event" step={1} />
      <ScrollView contentContainerClassName="px-5 pt-5 pb-5" showsVerticalScrollIndicator={false}>
        <TextInput label="Event name" placeholder="e.g. IMTEX 2026" value={name} onChangeText={setName} />
        <View className="flex-row flex-wrap gap-2 mt-[10px] mb-[18px]">
          {SUGGESTIONS.map((s) => (
            <Pressable key={s} onPress={() => setName(s)} className="bg-surface rounded-full px-[14px] py-2">
              <Typography className="text-[12.5px] font-semibold text-navy">{s}</Typography>
            </Pressable>
          ))}
        </View>

        <TextInput label="City" placeholder="e.g. Bengaluru" value={city} onChangeText={setCity} />

        <View className="flex-row gap-3 mt-[18px]">
          <View className="flex-1">
            <DateField
              label="Start date"
              value={startDate}
              placeholder="18 Feb 2026"
              onChange={(date) => {
                setStartDate(date);
                if (endDate && date.getTime() > endDate.getTime()) setEndDate(null);
              }}
            />
          </View>
          <View className="flex-1">
            <DateField
              label="End date"
              value={endDate}
              placeholder="22 Feb 2026"
              minDate={startDate}
              onChange={setEndDate}
            />
          </View>
        </View>
      </ScrollView>
      <View className="bg-white border-t border-hairline px-5 pt-[14px] pb-6">
        <Button label="Continue" disabled={!canContinue} onPress={handleContinue} />
      </View>
    </SafeAreaView>
  );
}
