import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../../../../components/ui/Typography';
import { Button } from '../../../../components/ui/Button';
import { TextInput } from '../../../../components/ui/TextInput';
import { WizardHeader } from '../../../../components/app/WizardHeader';

const SUGGESTIONS = ['IMTEX', 'Plastindia', 'Vibrant Gujarat', 'Auto Expo', 'IITF'];

export default function CreateEventScreen() {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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
            <TextInput label="Start date" placeholder="18 Feb 2026" value={startDate} onChangeText={setStartDate} />
          </View>
          <View className="flex-1">
            <TextInput label="End date" placeholder="22 Feb 2026" value={endDate} onChangeText={setEndDate} />
          </View>
        </View>
      </ScrollView>
      <View className="bg-white border-t border-hairline px-5 pt-[14px] pb-6">
        <Button label="Continue" onPress={() => router.push('/(app)/events/new/cost')} />
      </View>
    </SafeAreaView>
  );
}
