import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput as RNTextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { Typography } from '../../../../components/ui/Typography';
import { Button } from '../../../../components/ui/Button';
import { ScreenHeader } from '../../../../components/app/ScreenHeader';
import { WizardHeader } from '../../../../components/app/WizardHeader';
import { COST_KEYS, useEventDraftStore, type CostKey } from '../../../../stores/useEventDraftStore';
import { useEvent, useUpdateEvent } from '../../../../hooks/useEvents';
import { KeyboardSafe } from '../../../../components/app/KeyboardSafe';

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

/**
 * Only the digits count — people type "8,40,000" and "Rs 12000" alike.
 *
 * An empty box is `null`, not 0: "I have not seen the stall invoice yet" and "the
 * stall was free" are different answers, and only the second one is a number.
 * A typed "0" still comes back as 0, which is how someone says a line cost
 * nothing.
 */
function toAmount(value: string): number | null {
  const digits = value.replace(/[^\d]/g, '');
  if (!digits) return null;
  const parsed = parseInt(digits, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export default function EventCostScreen() {
  /**
   * Step 2 of the wizard, and also the only way to edit an event's cost later.
   *
   * The second use is why `eventId` arrives as a route parameter. Reading it
   * from the draft store — which is all this screen used to do — meant that
   * "Edit cost" on the ROI screen opened a form whose save was skipped
   * entirely: the wizard clears the draft when it finishes, so `eventId` was
   * null, the write was guarded away, and the costs went into a draft nobody
   * would look at again. Worse, with a half-finished wizard still in the draft
   * they went onto *that* event instead of the one being looked at.
   */
  const { eventId: eventIdParam } = useLocalSearchParams<{ eventId?: string }>();
  const editingOne = Boolean(eventIdParam);

  const savedCosts = useEventDraftStore((s) => s.costs);
  const draftEventId = useEventDraftStore((s) => s.eventId);
  const eventId = eventIdParam ?? draftEventId;
  const { data: event } = useEvent(editingOne ? eventIdParam : undefined);
  const updateEvent = useUpdateEvent();
  const [error, setError] = useState<string | null>(null);

  // `!= null` rather than truthiness, here and in the effect below: a genuine 0
  // is falsy, so seeding on truthiness would show an empty box for a line
  // someone recorded as free — and the save below would then write it back as
  // null, quietly turning "this cost nothing" into "nobody filled this in".
  const [values, setValues] = useState<Record<CostKey, string>>(() =>
    COST_KEYS.reduce(
      (acc, key) => ({ ...acc, [key]: savedCosts[key] != null ? String(savedCosts[key]) : '' }),
      {} as Record<CostKey, string>
    )
  );

  /**
   * When editing a specific event the numbers must come off that event, not
   * the draft. Seeding from the draft would show one event's costs while
   * saving them onto another, and an untouched field would blank a real figure.
   * Runs once per event: `costs` is a fresh object on every query result, so
   * the id is the dependency, not the object.
   */
  useEffect(() => {
    if (!editingOne || !event) return;
    setValues(
      COST_KEYS.reduce(
        (acc, key) => ({ ...acc, [key]: event.costs[key] != null ? String(event.costs[key]) : '' }),
        {} as Record<CostKey, string>
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingOne, event?.id]);

  const total = useMemo(
    () => Object.values(values).reduce((sum, v) => sum + (toAmount(v) ?? 0), 0),
    [values]
  );

  const commitAndContinue = async () => {
    if (updateEvent.isPending) return;
    setError(null);

    const costs = COST_KEYS.reduce(
      (acc, key) => ({ ...acc, [key]: toAmount(values[key]) }),
      {} as Record<CostKey, number | null>
    );

    // Written straight to the seven paise columns, which is what makes
    // total_cost_paisa — and therefore cost-per-lead and the ROI figure —
    // agree with the total shown above.
    if (eventId) {
      try {
        await updateEvent.mutateAsync({ id: eventId, costs });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Those costs didn't save. Try again.");
        return;
      }
    } else if (editingOne) {
      // Only reachable if the parameter arrived empty. Saying so beats a
      // "Saving…" that returns you to an unchanged ROI figure.
      setError("That event could not be identified, so nothing was saved.");
      return;
    }

    if (editingOne) {
      // Editing one event is not the wizard: the draft belongs to whatever
      // event is being created next, and must not take these numbers.
      router.back();
      return;
    }

    useEventDraftStore.getState().setCosts(costs);
    router.push('/(app)/events/new/invite');
  };

  /**
   * Skipping writes nothing at all, which is the point.
   *
   * This used to call `commitAndContinue`, on the reasoning that skipping meant
   * "no costs yet" rather than "discard what I typed". But `toAmount` returned 0
   * for an empty box, so skipping the step wrote seven zeros just as surely as
   * filling it in — every event came out of the wizard already "priced", the
   * unpriced warning on Home could never name anything, and the app could never
   * ask for the figures again. Leaving the columns null is what lets it ask.
   *
   * Anything already typed is kept in the draft on the way past, so this still
   * does not throw away work — it just does not invent zeros for the rest.
   */
  const skipForNow = () => {
    if (updateEvent.isPending) return;
    const costs = COST_KEYS.reduce(
      (acc, key) => ({ ...acc, [key]: toAmount(values[key]) }),
      {} as Record<CostKey, number | null>
    );
    useEventDraftStore.getState().setCosts(costs);
    router.push('/(app)/events/new/invite');
  };

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
      {editingOne ? (
        <ScreenHeader title={event?.name ? `${event.name}: cost` : 'Event cost'} />
      ) : (
        <WizardHeader title="What did this cost?" step={2} />
      )}
      <KeyboardSafe>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="px-5 pt-5 pb-5" showsVerticalScrollIndicator={false}>
          <Typography className="text-[13px] leading-[1.55] text-slate mb-5">
            This is the number the ROI dashboard is built on. Add whatever you know now and adjust later.
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

          {error ? (
            <Typography className="mt-2 text-[13px] font-semibold text-[#C23B3B] leading-[1.45]">
              {error}
            </Typography>
          ) : null}
        </ScrollView>
        <View className="bg-white border-t border-hairline px-5 pt-[14px] pb-6 items-center gap-3">
          <Button
            label={updateEvent.isPending ? 'Saving…' : editingOne ? 'Save cost' : 'Continue'}
            disabled={updateEvent.isPending}
            onPress={commitAndContinue}
            className="w-full"
          />
          {editingOne ? null : (
            <Pressable onPress={skipForNow} disabled={updateEvent.isPending}>
              <Typography className="text-[13px] font-semibold text-slate">Skip for now</Typography>
            </Pressable>
          )}
        </View>
      </KeyboardSafe>
    </SafeAreaView>
  );
}
