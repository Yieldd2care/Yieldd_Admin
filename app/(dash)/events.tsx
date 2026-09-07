import { View } from 'react-native';

import { DashShell } from '../../components/dash/DashShell';
import { Empty, Panel, Row, StatusChip } from '../../components/dash/primitives';
import { Typography } from '../../components/ui/Typography';
import { useEvents } from '../../hooks/useEvents';
import { formatPaise } from '../../lib/db';

const COLS = [1.6, 1, 0.95, 0.6, 0.7];

function dateRange(start: string, end: string) {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const year = new Date(end).getFullYear();
  return `${fmt(start)} – ${fmt(end)} ${year}`;
}

export default function DashEvents() {
  const { data: events, isLoading } = useEvents();

  return (
    <DashShell
      title="Events"
      subtitle={events?.length ? `${events.length} in total` : undefined}
    >
      <Panel className="overflow-hidden">
        {events?.length ? (
          <>
            <Row cols={COLS} header cells={['Event', 'City', 'Dates', 'Status', 'Spend']} />
            {events.map((e, i) => (
              <Row
                key={e.id}
                cols={COLS}
                last={i === events.length - 1}
                cells={[
                  <View>
                    <Typography className="text-[14px] font-semibold text-navy" numberOfLines={1}>
                      {e.name}
                    </Typography>
                    {e.stallNumber ? (
                      <Typography className="text-[11.5px] text-label mt-[2px]">Stall {e.stallNumber}</Typography>
                    ) : null}
                  </View>,
                  e.city || '—',
                  dateRange(e.startDate, e.endDate),
                  <StatusChip value={e.status} />,
                  <Typography className="text-[13px] font-semibold text-navy">
                    {/* totalCost is rupees (mapper runs paiseToRupees), formatPaise wants paise. */}
                    {formatPaise(e.totalCost * 100, { fallback: 'Not added' })}
                  </Typography>,
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
                : 'Events are created in the phone app. Once one exists, everything captured at it shows up here.'
            }
          />
        )}
      </Panel>
    </DashShell>
  );
}
