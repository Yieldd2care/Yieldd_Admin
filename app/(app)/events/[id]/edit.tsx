import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { Typography } from '../../../../components/ui/Typography';
import { Button } from '../../../../components/ui/Button';
import { TextInput } from '../../../../components/ui/TextInput';
import { DateField } from '../../../../components/app/DateField';
import { ScreenHeader } from '../../../../components/app/ScreenHeader';
import { ProBadge } from '../../../../components/app/ProLock';
import { ChevronRightIcon } from '../../../../components/ui/icons';
import { useEvent, useUpdateEvent } from '../../../../hooks/useEvents';
import { useProGate } from '../../../../hooks/usePlan';
import { formatPaise } from '../../../../lib/db';
import { KeyboardSafe } from '../../../../components/app/KeyboardSafe';

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
  locked,
}: {
  label: string;
  value?: string;
  onPress: () => void;
  locked?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between bg-white border border-hairline rounded-md px-4 py-[15px] mb-[10px]"
    >
      <Typography className={`text-[14px] font-semibold text-navy ${locked ? 'opacity-60' : ''}`}>
        {label}
      </Typography>
      <View className="flex-row items-center gap-2">
        {/* The chevron goes with the lock. It promises a screen this plan
            cannot open, and leaving it beside the chip says both things at
            once. */}
        {locked ? (
          <ProBadge />
        ) : (
          <>
            {value ? <Typography className="text-[12.5px] text-slate">{value}</Typography> : null}
            <ChevronRightIcon />
          </>
        )}
      </View>
    </Pressable>
  );
}

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = id ?? '';
  const { data: event, isLoading } = useEvent(eventId || undefined);
  const updateEvent = useUpdateEvent();
  const { locked, gate } = useProGate();

  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [stallNumber, setStallNumber] = useState('');
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
    setStallNumber(event.stallNumber ?? '');
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
        // Empty means "not known", which is a null column rather than an
        // empty string — `{{stall}}` then disappears from a message instead
        // of rendering as nothing between two spaces.
        stallNumber: stallNumber.trim() || null,
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
      <KeyboardSafe>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="px-5 pt-5 pb-8" showsVerticalScrollIndicator={false}>
          {isLoading && !event ? (
            <ActivityIndicator color="#F4B000" />
          ) : (
            <>
              <TextInput label="Event name" placeholder="e.g. IMTEX 2026" value={name} onChangeText={setName} />

              <View className="mt-[18px]">
                <TextInput label="City" placeholder="e.g. Bengaluru" value={city} onChangeText={setCity} />
              </View>

              <View className="mt-[18px]">
                {/* Optional, and read by four screens that until now always fell
                    back because nothing ever set it — plus the {{stall}} variable
                    in follow-up messages. */}
                <TextInput
                  label="Stall number (optional)"
                  placeholder="e.g. H-14"
                  value={stallNumber}
                  onChangeText={setStallNumber}
                />
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
                value={event ? (event.isPriced ? formatPaise(event.totalCost * 100) : '-') : undefined}
                onPress={() => router.push({ pathname: '/(app)/events/new/cost', params: { eventId } })}
              />
              {/* Pro, both of them. The rows stay in place and carry the chip
                  rather than vanishing on Free — see the note on Row in the
                  Settings screen for why the chip takes the right slot. */}
              <LinkRow
                label="Custom fields"
                locked={locked}
                onPress={() => {
                  if (gate('custom-fields')) {
                    router.push({ pathname: '/(app)/events/[id]/fields', params: { id: eventId } });
                  }
                }}
              />
              {/* A picker, not the wizard's editor. Reaching step 5 to change
                  an event's message wrote another template row every time, so
                  four shows a year left four near-identical "Default follow-up"
                  templates and no way to reuse one already written. */}
              <LinkRow
                label="Follow-up message"
                locked={locked}
                onPress={() => {
                  if (gate('event-templates')) {
                    router.push({ pathname: '/(app)/events/[id]/templates', params: { id: eventId } });
                  }
                }}
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
      </KeyboardSafe>
    </SafeAreaView>
  );
}
