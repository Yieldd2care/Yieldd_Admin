import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { Typography } from '../../../../components/ui/Typography';
import { Button } from '../../../../components/ui/Button';
import { TextInput } from '../../../../components/ui/TextInput';
import { DateField } from '../../../../components/app/DateField';
import { ScreenHeader } from '../../../../components/app/ScreenHeader';
import { ChevronRightIcon } from '../../../../components/ui/icons';
import { useEvent, useUpdateEvent } from '../../../../hooks/useEvents';
import { formatPaise } from '../../../../lib/db';

/**
 * Changing an event after it has been created.
 *
 * Until now there was no way to. Everything the create-event wizard asks for
 * was reachable exactly once, on the way through, and the wizard's own steps
 * could not be reopened safely because they addressed whatever event id was
 * left in the create-event draft rather than one you had chosen.
 *
 * This screen owns the three answers that had no other home — name, city and
 * dates — and hands the rest to the editors that already exist, each told which
 * event it is working on. That is deliberate: a second copy of the seven cost
 * fields, or of the follow-up editor, is a second thing to keep in step with
 * the first.
 */
function LinkRow({
  label,
  value,
  onPress,
}: {
  label: string;
  value?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between bg-white border border-hairline rounded-md px-4 py-[15px] mb-[10px]"
    >
      <Typography className="text-[14px] font-semibold text-navy">{label}</Typography>
      <View className="flex-row items-center gap-2">
        {value ? <Typography className="text-[12.5px] text-slate">{value}</Typography> : null}
        <ChevronRightIcon />
      </View>
    </Pressable>
  );
}

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = id ?? '';
  const { data: event, isLoading } = useEvent(eventId || undefined);
  const updateEvent = useUpdateEvent();

  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Seeded from the event once it arrives, keyed on its id rather than the
   * object — the query hands back a fresh object on every refetch, and
   * re-seeding on that would wipe what someone was halfway through typing.
   */
  useEffect(() => {
    if (!event) return;
    setName(event.name);
    setCity(event.city ?? '');
    setStartDate(event.startDate ? new Date(event.startDate) : null);
    setEndDate(event.endDate ? new Date(event.endDate) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id]);

  const canSave =
    name.trim() !== '' && city.trim() !== '' && startDate !== null && endDate !== null;

  const save = async () => {
    if (!canSave || !eventId || updateEvent.isPending) return;
    setError(null);
    try {
      await updateEvent.mutateAsync({
        id: eventId,
        name,
        city,
        startDate: startDate as Date,
        endDate: endDate as Date,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't save. Try again.");
      return;
    }
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
      <ScreenHeader title="Edit event" />
      <ScrollView contentContainerClassName="px-5 pt-5 pb-8" showsVerticalScrollIndicator={false}>
        {isLoading && !event ? (
          <ActivityIndicator color="#F4B000" />
        ) : (
          <>
            <TextInput label="Event name" placeholder="e.g. IMTEX 2026" value={name} onChangeText={setName} />

            <View className="mt-[18px]">
              <TextInput label="City" placeholder="e.g. Bengaluru" value={city} onChangeText={setCity} />
            </View>

            <View className="flex-row gap-3 mt-[18px]">
              <View className="flex-1">
                <DateField
                  label="Start date"
                  value={startDate}
                  placeholder="18 Feb 2026"
                  onChange={(date) => {
                    setStartDate(date);
                    // Same guard the create screen uses: an end date that now
                    // falls before the start is cleared rather than saved.
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

            <Typography
              className="text-[10px] font-bold tracking-[0.12em] text-slate mt-7 mb-3"
              style={{ textTransform: 'uppercase' }}
            >
              Everything else asked at setup
            </Typography>

            {/* Each of these is the screen that already owns that answer, told
                which event it is editing. Nothing here keeps its own copy. */}
            <LinkRow
              label="Event cost"
              value={event ? formatPaise(event.totalCost * 100, { fallback: 'Not added' }) : undefined}
              onPress={() => router.push({ pathname: '/(app)/events/new/cost', params: { eventId } })}
            />
            <LinkRow
              label="Custom fields"
              onPress={() => router.push({ pathname: '/(app)/events/[id]/fields', params: { id: eventId } })}
            />
            <LinkRow
              label="Follow-up message"
              onPress={() => router.push({ pathname: '/(app)/events/new/templates', params: { eventId } })}
            />
            <LinkRow
              label="Invite reps"
              onPress={() => router.push({ pathname: '/(app)/events/new/invite', params: { eventId } })}
            />

            {error ? (
              <Typography className="mt-5 text-[13px] font-semibold text-[#C23B3B] leading-[1.45]">
                {error}
              </Typography>
            ) : null}
          </>
        )}
      </ScrollView>
      <View className="bg-white border-t border-hairline px-5 pt-[14px] pb-6">
        <Button
          label={updateEvent.isPending ? 'Saving…' : 'Save changes'}
          disabled={!canSave || updateEvent.isPending}
          onPress={save}
        />
      </View>
    </SafeAreaView>
  );
}
