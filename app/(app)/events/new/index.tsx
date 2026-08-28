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
import { useCreateEvent, useUpdateEvent } from '../../../../hooks/useEvents';

const SUGGESTIONS = ['IMTEX', 'Plastindia', 'Vibrant Gujarat', 'Auto Expo', 'IITF'];

export default function CreateEventScreen() {
  const draft = useEventDraftStore();
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();

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
  const [error, setError] = useState<string | null>(null);

  const isSaving = createEvent.isPending || updateEvent.isPending;
  const canContinue = name.trim() !== '' && city.trim() !== '' && startDate !== null && endDate !== null;

  /**
   * The event row is written here, at step 1, rather than at the end of the
   * wizard. Everything after this point needs a real `event_id` to attach to —
   * invites carry a token per event, custom fields and templates belong to one
   * — and a Free plan's one-event limit is a refusal the person should meet on
   * the first screen, not after filling in five.
   *
   * Coming back to an unfinished wizard updates that same row. Creating a
   * second one would silently consume the plan's only remaining slot.
   */
  const handleContinue = async () => {
    if (!canContinue || isSaving) return;
    setError(null);

    const details = { name, city, startDate: startDate as Date, endDate: endDate as Date };

    try {
      if (draft.eventId) {
        await updateEvent.mutateAsync({ id: draft.eventId, ...details });
      } else {
        const created = await createEvent.mutateAsync(details);
        useEventDraftStore.getState().setEventId(created.id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't save. Try again.");
      return;
    }

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

        {error ? (
          <Typography className="mt-5 text-[13px] font-semibold text-[#C23B3B] leading-[1.45]">
            {error}
          </Typography>
        ) : null}
      </ScrollView>
      <View className="bg-white border-t border-hairline px-5 pt-[14px] pb-6">
        <Button
          label={isSaving ? 'Saving…' : 'Continue'}
          disabled={!canContinue || isSaving}
          onPress={handleContinue}
        />
      </View>
    </SafeAreaView>
  );
}
