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

export default function DealValueModal() {
  const { leadId } = useLocalSearchParams<{ leadId?: string }>();
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
        status: 'Won',
        dealValue: toAmount(value),
        dealClosedAt: closeDate ? closeDate.toISOString() : null,
        ...(note.trim() ? { note } : {}),
      });
      void useLeadsStore.getState().syncDrafts();
    }
    router.replace('/(app)/(tabs)/leads');
  };

  return (
    <SheetShell>
      <View className="flex-row items-center gap-[6px] self-start bg-success/[0.14] rounded-full px-3 py-[6px]">
        <CheckIcon size={12} color="#1F8A50" strokeWidth={2.5} />
        <Typography className="text-[11.5px] font-bold text-[#1F8A50]">Marked Won</Typography>
      </View>
      <Typography className="text-[19px] font-bold text-navy mt-[10px]">What&apos;s the deal worth?</Typography>
      <Typography className="text-[12.5px] text-slate mt-[5px]">
        {lead ? [lead.name, lead.company].filter(Boolean).join(' · ') : 'This lead'}
      </Typography>

      <Typography className="text-[12px] font-bold tracking-[0.04em] text-slate mt-[22px] mb-[9px]" style={{ textTransform: 'uppercase' }}>
        Deal value
      </Typography>
      <View className={`flex-row items-center border-[1.5px] rounded-[14px] px-[18px] h-16 ${value ? 'border-gold shadow-[0_0_0_3px_rgba(244,176,0,0.14)]' : 'border-hairline'}`}>
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

      <View className="mt-[18px]">
        <DateField
          label="Close date"
          value={closeDate}
          placeholder="Optional"
          onChange={setCloseDate}
        />
      </View>
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
          className={`flex-[2] h-[52px] rounded-md items-center justify-center ${canConfirm ? 'bg-gold shadow-[0_10px_24px_rgba(244,176,0,0.28)]' : 'bg-surface'}`}
        >
          <Typography className={`text-[15px] font-bold ${canConfirm ? 'text-navy' : 'text-slate'}`}>Confirm</Typography>
        </Pressable>
      </View>
    </SheetShell>
  );
}
