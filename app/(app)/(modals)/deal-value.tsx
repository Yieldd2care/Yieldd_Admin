import { useState } from 'react';
import { Pressable, TextInput as RNTextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { SheetShell } from '../../../components/app/SheetShell';
import { DateField } from '../../../components/app/DateField';
import { CheckIcon } from '../../../components/ui/icons';
import { useLeadsStore } from '../../../stores/useLeadsStore';

/** Only the digits count — people type "4,20,000" and "Rs 420000" alike. */
function toAmount(value: string): number {
  return parseInt(value.replace(/[^\d]/g, ''), 10) || 0;
}

/**
 * The deal value, for the two statuses that cannot exist without one.
 *
 * `status` says which. Won asks what the deal closed at; Qualified asks what it
 * is expected to be worth — the figure the ROI screen's pipeline is built from.
 * Both are enforced by database constraints, so this screen is the only way
 * into either status rather than a politeness.
 *
 * Defaults to Won so an older link with no `status` behaves as it always did.
 */
export default function DealValueModal() {
  const { leadId, status } = useLocalSearchParams<{ leadId?: string; status?: string }>();
  const target: 'Qualified' | 'Won' = status === 'Qualified' ? 'Qualified' : 'Won';
  const isQualified = target === 'Qualified';

  const leads = useLeadsStore((s) => s.leads);
  const lead = leads.find((l) => l.id === leadId);

  // Blank, not a plausible number. A pre-filled ₹4,20,000 that someone taps
  // past goes straight into the ROI figure the whole product is sold on.
  const [value, setValue] = useState(lead?.dealValue ? String(lead.dealValue) : '');
  const [closeDate, setCloseDate] = useState<Date | null>(
    lead?.dealClosedAt ? new Date(lead.dealClosedAt) : null
  );
  const [note, setNote] = useState(lead?.note ?? '');

  const canConfirm = toAmount(value) > 0;

  const confirm = () => {
    if (!canConfirm) return;
    if (leadId) {
      useLeadsStore.getState().editLead(leadId, {
        status: target,
        dealValue: toAmount(value),
        // A close date belongs to a deal that closed. Qualified leaves it
        // untouched rather than writing null, so re-qualifying a lead that was
        // once Won does not quietly erase when it closed.
        ...(isQualified ? {} : { dealClosedAt: closeDate ? closeDate.toISOString() : null }),
        ...(note.trim() ? { note } : {}),
      });
      void useLeadsStore.getState().syncDrafts();
    }
    router.replace('/(app)/(tabs)/leads');
  };

  return (
    <SheetShell>
      <View
        className={`flex-row items-center gap-[6px] self-start rounded-full px-3 py-[6px] ${
          isQualified ? 'bg-gold/[0.16]' : 'bg-success/[0.14]'
        }`}
      >
        <CheckIcon size={12} color={isQualified ? '#8A6100' : '#1F8A50'} strokeWidth={2.5} />
        <Typography
          className={`text-[11.5px] font-bold ${isQualified ? 'text-[#8A6100]' : 'text-[#1F8A50]'}`}
        >
          {isQualified ? 'Marking Qualified' : 'Marked Won'}
        </Typography>
      </View>
      <Typography className="text-[19px] font-bold text-navy mt-[10px]">
        {isQualified ? 'What could this deal be worth?' : "What's the deal worth?"}
      </Typography>
      <Typography className="text-[12.5px] text-slate mt-[5px]">
        {lead ? [lead.name, lead.company].filter(Boolean).join(' · ') : 'This lead'}
      </Typography>

      {isQualified ? (
        <Typography className="text-[12.5px] text-slate mt-3 leading-[1.5]">
          Your best estimate. It is what the event&rsquo;s expected deal value is built from, and
          you can change it when the deal closes.
        </Typography>
      ) : null}

      <Typography className="text-[12px] font-bold tracking-[0.04em] text-slate mt-[22px] mb-[9px]" style={{ textTransform: 'uppercase' }}>
        {isQualified ? 'Expected deal value' : 'Deal value'}
      </Typography>
      <View className={`flex-row items-center border-[1.5px] rounded-[14px] px-[18px] h-16 ${value ? 'border-gold shadow-[0_0_0_3px_rgba(244,176,0,0.14)]' : 'border-hairline shadow-[0_0_0_3px_rgba(244,176,0,0)]'}`}>
        <Typography className="text-[22px] font-bold text-slate mr-2">&#8377;</Typography>
        <RNTextInput
          value={value}
          onChangeText={setValue}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor="#97A3B8"
          className="flex-1 text-[26px] font-extrabold text-navy"
        />
      </View>

      {/* A close date on a lead that has not closed is a date nobody can fill
          in honestly, so Qualified is not asked for one. */}
      {isQualified ? null : (
        <View className="mt-[18px]">
          <DateField
            label="Close date"
            value={closeDate}
            placeholder="Optional"
            onChange={setCloseDate}
          />
        </View>
      )}
      <View className="mt-[18px]">
        <Typography className="text-[12.5px] font-semibold text-navy mb-2">Note</Typography>
        <RNTextInput
          value={note}
          onChangeText={setNote}
          placeholder="Optional"
          placeholderTextColor="#97A3B8"
          className="h-12 border border-hairline rounded-md px-[14px] text-[14px] text-navy"
        />
      </View>

      <View className="flex-row gap-[10px] mt-6">
        <Pressable onPress={() => router.back()} className="flex-1 h-[52px] rounded-md bg-white border border-hairline items-center justify-center">
          <Typography className="text-[14px] font-bold text-navy">Cancel</Typography>
        </Pressable>
        <Pressable
          disabled={!canConfirm}
          onPress={confirm}
          className={`flex-[2] h-[52px] rounded-md items-center justify-center ${canConfirm ? 'bg-gold shadow-[0_10px_24px_rgba(244,176,0,0.28)]' : 'bg-surface shadow-[0_10px_24px_rgba(244,176,0,0)]'}`}
        >
          <Typography className={`text-[15px] font-bold ${canConfirm ? 'text-navy' : 'text-slate'}`}>Confirm</Typography>
        </Pressable>
      </View>
    </SheetShell>
  );
}
