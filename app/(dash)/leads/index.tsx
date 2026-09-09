import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import { DashShell } from '../../../components/dash/DashShell';
import { Empty, GoldButton, Panel, Pill, Row, StatusChip, TempChip } from '../../../components/dash/primitives';
import { Typography } from '../../../components/ui/Typography';
import { useLeadsStore } from '../../../stores/useLeadsStore';

type Filter = 'all' | 'hot' | 'warm' | 'cold' | 'due' | 'note' | 'draft';

const COLS = [1.25, 1.2, 1, 0.85, 0.55, 0.75, 0.7];

export default function DashLeads() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');

  // The array comes out of the store; every count and slice is derived here.
  // Deriving inside the selector would allocate a new array per call and
  // re-render without end.
  const leads = useLeadsStore((s) => s.leads);

  const counts = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      all: leads.length,
      hot: leads.filter((l) => l.temperature === 'Hot').length,
      warm: leads.filter((l) => l.temperature === 'Warm').length,
      cold: leads.filter((l) => l.temperature === 'Cold').length,
      due: leads.filter((l) => l.followUpDate && l.followUpDate <= today).length,
      note: leads.filter((l) => l.needsNote).length,
      draft: leads.filter((l) => l.syncStatus === 'draft').length,
    };
  }, [leads]);

  const shown = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const pick = (l: (typeof leads)[number]) => {
      switch (filter) {
        case 'hot':
          return l.temperature === 'Hot';
        case 'warm':
          return l.temperature === 'Warm';
        case 'cold':
          return l.temperature === 'Cold';
        case 'due':
          return Boolean(l.followUpDate && l.followUpDate <= today);
        case 'note':
          return l.needsNote;
        case 'draft':
          return l.syncStatus === 'draft';
        default:
          return true;
      }
    };
    return leads.filter(pick).sort((a, b) => (a.capturedAt < b.capturedAt ? 1 : -1));
  }, [leads, filter]);

  return (
    <DashShell
      title="Leads"
      subtitle={`${counts.all} captured`}
      actions={<GoldButton label="Export CSV" onPress={() => router.push('/(dash)/export')} />}
    >
      <View className="flex-row flex-wrap gap-2 mb-4">
        <Pill label={`All ${counts.all}`} active={filter === 'all'} onPress={() => setFilter('all')} />
        <Pill label={`Hot ${counts.hot}`} dot="#C4392E" active={filter === 'hot'} onPress={() => setFilter('hot')} />
        <Pill label={`Warm ${counts.warm}`} dot="#F4B000" active={filter === 'warm'} onPress={() => setFilter('warm')} />
        <Pill label={`Cold ${counts.cold}`} dot="#97A3B8" active={filter === 'cold'} onPress={() => setFilter('cold')} />
        <Pill label={`Follow-up due ${counts.due}`} active={filter === 'due'} onPress={() => setFilter('due')} />
        <Pill label={`Needs note ${counts.note}`} active={filter === 'note'} onPress={() => setFilter('note')} />
        <Pill label={`Not synced ${counts.draft}`} active={filter === 'draft'} onPress={() => setFilter('draft')} />
      </View>

      <Panel className="overflow-hidden">
        {shown.length ? (
          <>
            <Row
              cols={COLS}
              header
              cells={['Name', 'Company', 'Phone', 'Captured', 'Temp', 'Status', 'Deal value']}
            />
            {shown.map((l, i) => (
              <Row
                key={l.id}
                cols={COLS}
                last={i === shown.length - 1}
                cells={[
                  <Pressable onPress={() => router.push(`/(dash)/leads/${l.id}`)}>
                    <Typography className="text-[13.5px] font-semibold text-blue" numberOfLines={1}>
                      {l.name || 'Unnamed'}
                    </Typography>
                    {l.designation ? (
                      <Typography className="text-[11.5px] text-label mt-[1px]" numberOfLines={1}>
                        {l.designation}
                      </Typography>
                    ) : null}
                  </Pressable>,
                  l.company || '—',
                  l.phone || '—',
                  l.time || '—',
                  <TempChip value={l.temperature} />,
                  <StatusChip value={l.status} />,
                  <Typography className="text-[13px] font-bold text-navy">
                    {l.dealValue != null ? `₹${l.dealValue.toLocaleString('en-IN')}` : '—'}
                  </Typography>,
                ]}
              />
            ))}
          </>
        ) : (
          <Empty
            title={counts.all === 0 ? 'No leads yet' : 'Nothing matches that filter'}
            body={
              counts.all === 0
                ? 'Leads captured on the phone appear here the moment they sync.'
                : 'Try a different filter, or clear it to see everything.'
            }
          />
        )}
      </Panel>
    </DashShell>
  );
}
