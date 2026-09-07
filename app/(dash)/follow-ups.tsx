import { useMemo } from 'react';
import { View } from 'react-native';

import { DashShell } from '../../components/dash/DashShell';
import { Empty, Panel, Row, Stat, TempChip } from '../../components/dash/primitives';
import { Typography } from '../../components/ui/Typography';
import { useLeadsStore } from '../../stores/useLeadsStore';

const COLS = [1.3, 1.2, 1, 0.5, 0.6];

/** Days from today: negative is overdue. */
function daysOut(iso: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(iso + 'T00:00:00');
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

function whenLabel(n: number) {
  if (n < -1) return { text: `Overdue by ${Math.abs(n)} days`, color: '#C4392E' };
  if (n === -1) return { text: 'Overdue by 1 day', color: '#C4392E' };
  if (n === 0) return { text: 'Due today', color: '#F4B000' };
  if (n === 1) return { text: 'Due tomorrow', color: '#5A6B87' };
  return { text: `Due in ${n} days`, color: '#5A6B87' };
}

export default function DashFollowUps() {
  const leads = useLeadsStore((s) => s.leads);

  const due = useMemo(
    () =>
      leads
        .filter((l) => Boolean(l.followUpDate))
        .map((l) => ({ lead: l, n: daysOut(l.followUpDate as string) }))
        .sort((a, b) => a.n - b.n),
    [leads]
  );

  const overdue = useMemo(() => due.filter((d) => d.n < 0).length, [due]);
  const todayCount = useMemo(() => due.filter((d) => d.n === 0).length, [due]);

  return (
    <DashShell title="Follow-ups" subtitle={due.length ? `${due.length} scheduled` : undefined}>
      <View className="flex-row gap-4 mb-4">
        <Stat
          label="Overdue"
          value={String(overdue)}
          sub={overdue ? 'Chase these first' : 'Nothing late'}
          valueClassName={overdue ? 'text-[#C4392E]' : 'text-navy'}
        />
        <Stat label="Due today" value={String(todayCount)} sub="Before the day ends" />
        <Stat label="Scheduled" value={String(due.length)} sub="Across all events" />
      </View>

      <Panel className="overflow-hidden">
        {due.length ? (
          <>
            <Row cols={COLS} header cells={['Lead', 'Company', 'When', 'Temp', 'Phone']} />
            {due.map(({ lead, n }, i) => {
              const w = whenLabel(n);
              return (
                <Row
                  key={lead.id}
                  cols={COLS}
                  last={i === due.length - 1}
                  cells={[
                    <Typography className="text-[13.5px] font-semibold text-navy" numberOfLines={1}>
                      {lead.name || 'Unnamed'}
                    </Typography>,
                    lead.company || '—',
                    <View className="flex-row items-center gap-[7px]">
                      <View className="w-[6px] h-[6px] rounded-full" style={{ backgroundColor: w.color }} />
                      <Typography className="text-[13px] font-semibold" style={{ color: w.color }}>
                        {w.text}
                      </Typography>
                    </View>,
                    <TempChip value={lead.temperature} />,
                    lead.phone || '—',
                  ]}
                />
              );
            })}
          </>
        ) : (
          <Empty
            title="Nothing to chase"
            body="Set a follow-up date on a lead and it appears here, oldest first."
          />
        )}
      </Panel>
    </DashShell>
  );
}
