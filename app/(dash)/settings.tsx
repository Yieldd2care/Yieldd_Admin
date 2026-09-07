import { View } from 'react-native';

import { DashShell } from '../../components/dash/DashShell';
import { Panel, StatusChip } from '../../components/dash/primitives';
import { Typography } from '../../components/ui/Typography';
import { useSessionStore } from '../../stores/useSessionStore';
import { useOrganization } from '../../hooks/useOrganization';

function Field({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View className={`py-4 ${last ? '' : 'border-b border-hairline'}`}>
      <Typography
        className="text-[9.5px] font-bold tracking-[0.08em] text-label"
        style={{ textTransform: 'uppercase' }}
      >
        {label}
      </Typography>
      <Typography className="text-[14px] font-medium text-navy mt-1">{value}</Typography>
    </View>
  );
}

export default function DashSettings() {
  const user = useSessionStore((s) => s.user);
  const { data: org } = useOrganization();

  return (
    <DashShell title="Settings" subtitle="Organisation and profile">
      <View className="flex-row gap-4">
        <Panel className="flex-1 px-[22px] pb-3">
          <Typography className="text-[17px] font-bold text-navy pt-4">Organisation</Typography>
          <Field label="Company" value={org?.name ?? user?.company ?? '—'} />
          <Field label="Category" value={org?.category ?? 'Not set'} />
          <Field label="Seats" value={org ? String(org.seats) : '—'} />
          <View className="py-4">
            <Typography
              className="text-[9.5px] font-bold tracking-[0.08em] text-label"
              style={{ textTransform: 'uppercase' }}
            >
              Plan
            </Typography>
            <View className="mt-[6px] flex-row">
              <View className="rounded-full px-[10px] py-[4px]" style={{ backgroundColor: '#FFF6E0' }}>
                <Typography className="text-[11px] font-bold" style={{ color: '#8A6100' }}>
                  {(org?.planTier ?? user?.planTier) === 'pro' ? 'Pro' : 'Free'}
                </Typography>
              </View>
            </View>
          </View>
        </Panel>

        <Panel className="flex-1 px-[22px] pb-3">
          <Typography className="text-[17px] font-bold text-navy pt-4">You</Typography>
          <Field label="Name" value={user?.name ?? '—'} />
          <Field label="Designation" value={user?.designation ?? 'Not set'} />
          <Field label="Email" value={user?.email ?? '—'} />
          <Field label="Phone" value={user?.phone ?? 'Not set'} />
          <View className="py-4">
            <Typography
              className="text-[9.5px] font-bold tracking-[0.08em] text-label"
              style={{ textTransform: 'uppercase' }}
            >
              Role
            </Typography>
            <View className="mt-[6px] flex-row">
              <StatusChip value={user?.role} />
            </View>
          </View>
        </Panel>
      </View>

      <Panel className="mt-4 p-[22px]">
        <Typography className="text-[15px] font-bold text-navy">Changing any of this</Typography>
        <Typography className="text-[13px] text-slate leading-[1.6] mt-2">
          Editing your profile, templates, notifications and the digital card all live in the phone app for now. This
          dashboard reads the same data — anything changed there shows up here on the next load.
        </Typography>
      </Panel>
    </DashShell>
  );
}
