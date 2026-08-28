import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { SheetShell } from '../../../components/app/SheetShell';
import { AlertCircleIcon, CheckIcon } from '../../../components/ui/icons';
import type { LeadStatus } from '../../../data/leads';

// Imported rather than redeclared: a locally-defined union is how `Lost` came
// to be offered here while data/leads.ts had never heard of it.
const STATUSES: { key: LeadStatus; color: string; hint?: string }[] = [
  { key: 'New', color: '#8A98B0' },
  { key: 'Contacted', color: '#1D3F8A' },
  { key: 'Qualified', color: '#F4B000' },
  { key: 'Won', color: '#4ED17F', hint: 'Asks for deal value' },
  { key: 'Lost', color: '#C23B3B' },
];

export default function StatusChangeModal() {
  const [status, setStatus] = useState<LeadStatus>('Qualified');

  const confirm = () => {
    if (status === 'Won') {
      router.replace('/(app)/(modals)/deal-value');
      return;
    }
    router.back();
  };

  return (
    <SheetShell>
      <Typography className="text-[19px] font-bold text-navy">Change status</Typography>
      <Typography className="text-[12.5px] text-slate mt-[5px]">Rajesh Menon &middot; Northline Engineering</Typography>

      <View className="gap-2 mt-5">
        {STATUSES.map((s) => {
          const active = status === s.key;
          return (
            <Pressable
              key={s.key}
              onPress={() => setStatus(s.key)}
              className={`flex-row items-center gap-3 border-[1.5px] rounded-md px-4 py-[14px] ${active ? 'border-gold bg-gold/[0.06]' : 'border-hairline'}`}
            >
              <View className="w-[10px] h-[10px] rounded-full" style={{ backgroundColor: s.color }} />
              <Typography className="text-[14px] font-bold text-navy flex-1">{s.key}</Typography>
              {s.hint ? <Typography className="text-[11px] text-slate">{s.hint}</Typography> : null}
              {active ? <CheckIcon size={18} color="#F4B000" strokeWidth={2.5} /> : null}
            </Pressable>
          );
        })}
      </View>

      <View className="flex-row items-start gap-2 bg-gold/[0.08] border border-gold/[0.30] rounded-md px-[14px] py-3 mt-4">
        <AlertCircleIcon size={14} color="#8A6100" strokeWidth={2} />
        <Typography className="flex-1 text-[12px] font-medium text-navy" style={{ lineHeight: 17 }}>
          Marking a lead Won opens a quick screen to enter the deal value &mdash; that&apos;s what turns cost-per-lead into real ROI.
        </Typography>
      </View>

      <Pressable
        onPress={confirm}
        className="h-[54px] rounded-md bg-gold items-center justify-center mt-6 flex-row gap-2"
      >
        <Typography className="text-[16px] font-bold text-navy">Confirm</Typography>
      </Pressable>
    </SheetShell>
  );
}
