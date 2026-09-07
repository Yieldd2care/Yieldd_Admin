import { View } from 'react-native';

import { DashShell } from '../../components/dash/DashShell';
import { Empty, Panel, Row, Stat, StatusChip } from '../../components/dash/primitives';
import { Typography } from '../../components/ui/Typography';
import { useTeam } from '../../hooks/useTeam';
import { useOrganization } from '../../hooks/useOrganization';

const COLS = [1.3, 1.3, 1, 0.55, 0.6, 0.45];

export default function DashTeam() {
  const { data: members, isLoading } = useTeam();
  const { data: org } = useOrganization();

  const seatsUsed = members?.length ?? 0;
  // `seats` is already included + purchased; no need to add them again here.
  const seatsTotal = org?.seats ?? null;

  return (
    <DashShell title="Team" subtitle={seatsUsed ? `${seatsUsed} members` : undefined}>
      <View className="flex-row gap-4 mb-4">
        <Stat
          label="Seats used"
          value={seatsTotal != null ? `${seatsUsed} of ${seatsTotal}` : String(seatsUsed)}
          sub={seatsTotal != null ? `${Math.max(seatsTotal - seatsUsed, 0)} free` : 'Seat count unavailable'}
        />
        <Stat
          label="Active"
          value={String(members?.filter((m) => m.status === 'active').length ?? 0)}
          sub="Can capture leads"
        />
        <Stat
          label="Invited"
          value={String(members?.filter((m) => m.status === 'invited').length ?? 0)}
          sub="Not signed in yet"
        />
      </View>

      <Panel className="overflow-hidden">
        {members?.length ? (
          <>
            <Row cols={COLS} header cells={['Member', 'Email', 'Phone', 'Role', 'Status', 'Leads']} />
            {members.map((m, i) => (
              <Row
                key={m.id}
                cols={COLS}
                last={i === members.length - 1}
                cells={[
                  <View className="flex-row items-center gap-[11px]">
                    <View className="w-[34px] h-[34px] rounded-full bg-navy items-center justify-center">
                      <Typography className="text-[12px] font-bold text-white">{m.initial}</Typography>
                    </View>
                    <View className="flex-1 min-w-0">
                      <Typography className="text-[13.5px] font-semibold text-navy" numberOfLines={1}>
                        {m.name}
                        {m.isSelf ? ' (you)' : ''}
                      </Typography>
                      {m.designation ? (
                        <Typography className="text-[11.5px] text-label" numberOfLines={1}>
                          {m.designation}
                        </Typography>
                      ) : null}
                    </View>
                  </View>,
                  m.email || '—',
                  m.phone || '—',
                  <StatusChip value={m.role} />,
                  <StatusChip value={m.status} />,
                  <Typography className="text-[14px] font-bold text-navy">
                    {m.leadCount != null ? String(m.leadCount) : '—'}
                  </Typography>,
                ]}
              />
            ))}
          </>
        ) : (
          <Empty
            title={isLoading ? 'Loading team' : 'Just you so far'}
            body={isLoading ? 'One moment.' : 'Invites are sent from the phone app, over WhatsApp.'}
          />
        )}
      </Panel>
    </DashShell>
  );
}
