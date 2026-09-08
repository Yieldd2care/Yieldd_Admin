import { useState } from 'react';
import { View } from 'react-native';

import { Typography } from '../ui/Typography';
import { TextInput } from '../ui/TextInput';
import { DateField } from '../app/DateField';
import { Cap, GhostButton, GoldButton, Panel } from './primitives';
import { COST_KEYS, EMPTY_COSTS, type EventCosts } from '../../types/event';
import { formatPaise } from '../../lib/db';

/**
 * One form for both creating and editing an event.
 *
 * The phone asks for this across a six-step wizard, which is right when only
 * one field fits on screen at a time. On a monitor the whole thing fits at
 * once, so stepping through it would be six clicks for no gain.
 *
 * Costs are plain rupees here, as they are on `Event.costs` — the mapper does
 * paise conversion on both sides (`costsFromRow` / `costsToColumns`).
 */

export type EventFormValues = {
  name: string;
  city: string;
  stallNumber: string;
  startDate: Date | null;
  endDate: Date | null;
  costs: EventCosts;
};

export function emptyEventForm(): EventFormValues {
  return { name: '', city: '', stallNumber: '', startDate: null, endDate: null, costs: { ...EMPTY_COSTS } };
}

/** Digits only. An empty box means "not known yet", which is zero. */
function toAmount(text: string) {
  const digits = text.replace(/[^0-9]/g, '');
  return digits ? Number(digits) : 0;
}

export function EventForm({
  initial,
  submitLabel,
  busy,
  error,
  onSubmit,
  onCancel,
}: {
  initial: EventFormValues;
  submitLabel: string;
  busy?: boolean;
  error?: string | null;
  onSubmit: (values: EventFormValues) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<EventFormValues>(initial);

  const set = <K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const setCost = (key: (typeof COST_KEYS)[number], text: string) =>
    setValues((v) => ({ ...v, costs: { ...v.costs, [key]: toAmount(text) } }));

  const total = COST_KEYS.reduce((sum, k) => sum + (values.costs[k] || 0), 0);

  // Same rule the phone editor uses: a name, a city and both dates.
  const canSubmit =
    values.name.trim() !== '' &&
    values.city.trim() !== '' &&
    values.startDate !== null &&
    values.endDate !== null &&
    !busy;

  return (
    <View className="flex-row gap-4 items-start">
      <Panel className="flex-[1.1] p-[22px]">
        <Typography className="text-[17px] font-bold text-navy">The event</Typography>

        <View className="gap-[18px] mt-[18px]">
          <TextInput
            label="Event name"
            placeholder="India Machine Tools Expo"
            value={values.name}
            onChangeText={(t) => set('name', t)}
          />
          <View className="flex-row gap-4">
            <View className="flex-1">
              <TextInput
                label="City"
                placeholder="Mumbai"
                value={values.city}
                onChangeText={(t) => set('city', t)}
              />
            </View>
            <View className="flex-1">
              <TextInput
                label="Stall number"
                placeholder="B-42 (optional)"
                value={values.stallNumber}
                onChangeText={(t) => set('stallNumber', t)}
              />
            </View>
          </View>

          <View className="flex-row gap-4">
            <View className="flex-1">
              <DateField
                label="Starts"
                value={values.startDate}
                onChange={(d) => {
                  set('startDate', d);
                  // An end before the start is not a date the wizard can produce
                  // either; clearing it is less confusing than a silent swap.
                  if (values.endDate && d.getTime() > values.endDate.getTime()) set('endDate', null);
                }}
              />
            </View>
            <View className="flex-1">
              <DateField
                label="Ends"
                value={values.endDate}
                minDate={values.startDate}
                onChange={(d) => set('endDate', d)}
              />
            </View>
          </View>
        </View>

        {error ? (
          <Typography className="text-[12.5px] font-semibold text-[#C23B3B] mt-4 leading-[1.45]">
            {error}
          </Typography>
        ) : null}

        <View className="flex-row gap-3 mt-6 pt-5 border-t border-hairline">
          <GoldButton label={busy ? 'Saving…' : submitLabel} disabled={!canSubmit} onPress={() => onSubmit(values)} />
          <GhostButton label="Cancel" onPress={onCancel} />
        </View>

        {!canSubmit && !busy ? (
          <Typography className="text-[11.5px] text-label mt-3">
            A name, a city and both dates are needed before this can be saved.
          </Typography>
        ) : null}
      </Panel>

      <Panel className="flex-1 p-[22px]">
        <Typography className="text-[17px] font-bold text-navy">What the stall costs</Typography>
        <Typography className="text-[12.5px] text-slate mt-1 leading-[1.55]">
          Rupees. Leave anything you do not know yet — it can be filled in later, and it is what
          makes the ROI real.
        </Typography>

        <View className="gap-3 mt-[18px]">
          {COST_KEYS.map((key) => (
            <View key={key} className="flex-row items-center gap-3">
              <Typography className="flex-1 text-[13.5px] text-ink-muted">{key}</Typography>
              <View className="w-[150px]">
                <TextInput
                  placeholder="0"
                  value={values.costs[key] ? String(values.costs[key]) : ''}
                  onChangeText={(t) => setCost(key, t)}
                  keyboardType="number-pad"
                  className="h-[42px] text-right"
                />
              </View>
            </View>
          ))}
        </View>

        <View className="flex-row items-center justify-between mt-5 pt-4 border-t border-hairline">
          <Cap>Total spend</Cap>
          <Typography className="text-[19px] font-extrabold text-navy">
            {total > 0 ? formatPaise(total * 100) : '—'}
          </Typography>
        </View>
      </Panel>
    </View>
  );
}
