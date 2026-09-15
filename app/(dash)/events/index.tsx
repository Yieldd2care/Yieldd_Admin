import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import { DashShell } from '../../../components/dash/DashShell';
import { Empty, GoldButton, Panel, Row, StatusChip } from '../../../components/dash/primitives';
import { Typography } from '../../../components/ui/Typography';
import { useEvents } from '../../../hooks/useEvents';
import { useSessionStore } from '../../../stores/useSessionStore';
import { formatPaise } from '../../../lib/db';

const COLS = [1.6, 1, 0.95, 0.6, 0.5, 0.7, 0.75];

function dateRange(start: string, end: string) {
  const fmt = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return `${fmt(start)} – ${fmt(end)} ${new Date(end).getFullYear()}`;
}

export default function DashEvents() {
  const router = useRouter();
  const { data: events, isLoading } = useEvents();
  const isAdmin = useSessionStore((s) => s.user?.role === 'admin');

  return (
    <DashShell
      title="Events"
      subtitle={events?.length ? `${events.length} in total` : undefined}
      actions={
        isAdmin ? <GoldButton label="New event" onPress={() => router.push('/(dash)/events/new')} /> : undefined
      }
    >
      <Panel className="overflow-hidden">
        {events?.length ? (
          <>
            <Row
              cols={COLS}
              header
              cells={['Event', 'City', 'Dates', 'Status', 'Leads', 'Spend', '']}
            />
            {events.map((e, i) => (
              <Row
                key={e.id}
                cols={COLS}
                last={i === events.length - 1}
                cells={[
                  <Pressable onPress={() => router.push(`/(dash)/events/${e.id}`)}>
                    <Typography className="text-[14px] font-semibold text-blue" numberOfLines={1}>
                      {e.name}
                    </Typography>
                    {e.stallNumber ? (
                      <Typography className="text-[11.5px] text-label mt-[2px]">Stall {e.stallNumber}</Typography>
                    ) : null}
                  </Pressable>,
                  e.city || '-',
                  dateRange(e.startDate, e.endDate),
                  <StatusChip value={e.status} />,
                  <Typography className="text-[14px] font-bold text-navy">{e.leads ?? 0}</Typography>,
                  <Typography className="text-[13px] font-semibold text-navy">
                    {/* totalCost is rupees; formatPaise wants paise. */}
                    {formatPaise(e.totalCost * 100, { fallback: 'Not added' })}
                  </Typography>,
                  <View className="flex-row gap-2 justify-end">
                    <Pressable
                      onPress={() => router.push(`/(dash)/events/${e.id}/roi`)}
                      className="px-3 py-[7px] rounded-sm border border-hairline bg-white"
                    >
                      <Typography className="text-[12.5px] font-semibold text-navy">ROI</Typography>
                    </Pressable>
                    {isAdmin ? (
                      <Pressable
                        onPress={() => router.push(`/(dash)/events/${e.id}/edit`)}
                        className="px-3 py-[7px] rounded-sm border border-hairline bg-white"
                      >
                        <Typography className="text-[12.5px] font-semibold text-navy">Edit</Typography>
                      </Pressable>
                    ) : null}
                  </View>,
                ]}
              />
            ))}
          </>
        ) : (
          <Empty
            title={isLoading ? 'Loading events' : 'No events yet'}
            body={
              isLoading
                ? 'One moment.'
                : isAdmin
                  ? 'Create one and everything captured at it collects here.'
                  : 'An admin creates the event; once you are added to one it shows up here.'
            }
          />
        )}
      </Panel>
    </DashShell>
  );
}
