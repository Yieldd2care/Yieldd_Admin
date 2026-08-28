import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { SheetShell } from '../../../components/app/SheetShell';
import { AlertCircleIcon, CheckIcon } from '../../../components/ui/icons';
import { useLeadsStore } from '../../../stores/useLeadsStore';
import { useTeam } from '../../../hooks/useTeam';

/**
 * Hand a lead to someone else on the team (PENDING.md #6).
 *
 * Only an admin gets here — the button on the lead detail screen is theirs
 * alone. A rep who could reassign could also quietly move a lead off their own
 * name after a bad outcome, which is exactly what the leaderboard is not for.
 */
export default function ReassignModal() {
  const { leadId } = useLocalSearchParams<{ leadId?: string }>();

  const leads = useLeadsStore((s) => s.leads);
  const reassignLead = useLeadsStore((s) => s.reassignLead);
  const { data: members } = useTeam();

  const lead = leads.find((l) => l.id === leadId);

  // Deactivated members are deliberately excluded: their access is gone, so a
  // lead parked on their name would be nobody's.
  const assignable = (members ?? []).filter((m) => m.status === 'active');

  const currentId = lead?.assignedToId ?? assignable.find((m) => m.isSelf)?.id ?? null;
  const [selected, setSelected] = useState<string | null>(currentId);

  const confirm = () => {
    if (!lead || !selected || selected === currentId) {
      router.back();
      return;
    }
    reassignLead(lead.id, selected);
    router.back();
  };

  if (!lead) {
    return (
      <SheetShell>
        <Typography className="text-[19px] font-bold text-navy">Reassign lead</Typography>
        <Typography className="text-[12.5px] text-slate mt-[5px]">
          This lead is no longer available.
        </Typography>
        <Pressable
          onPress={() => router.back()}
          className="h-[54px] rounded-md bg-gold items-center justify-center mt-6"
        >
          <Typography className="text-[16px] font-bold text-navy">Close</Typography>
        </Pressable>
      </SheetShell>
    );
  }

  const unchanged = selected === currentId;

  return (
    <SheetShell>
      <Typography className="text-[19px] font-bold text-navy">Reassign lead</Typography>
      <Typography className="text-[12.5px] text-slate mt-[5px]">
        {lead.name}
        {lead.company ? ` · ${lead.company}` : ''}
      </Typography>

      <ScrollView
        className="mt-5 max-h-[320px]"
        contentContainerClassName="gap-2"
        showsVerticalScrollIndicator={false}
      >
        {assignable.map((member) => {
          const active = selected === member.id;
          return (
            <Pressable
              key={member.id}
              onPress={() => setSelected(member.id)}
              className={`flex-row items-center gap-3 border-[1.5px] rounded-md px-4 py-3 ${
                active ? 'border-gold bg-gold/[0.06]' : 'border-hairline'
              }`}
            >
              <View className="w-9 h-9 rounded-xl bg-surface items-center justify-center">
                <Typography className="text-[14px] font-extrabold text-navy">{member.initial}</Typography>
              </View>
              <View className="flex-1">
                <Typography className="text-[14px] font-bold text-navy">
                  {member.isSelf ? `${member.name} (you)` : member.name}
                </Typography>
                <Typography className="text-[11.5px] text-slate mt-[1px]">
                  {member.badge === 'admin' ? 'Admin' : 'Sales rep'}
                  {member.id === currentId ? ' · currently assigned' : ''}
                </Typography>
              </View>
              {active ? <CheckIcon size={18} color="#F4B000" strokeWidth={2.5} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>

      <View className="flex-row items-start gap-2 bg-gold/[0.08] border border-gold/[0.30] rounded-md px-[14px] py-3 mt-4">
        <AlertCircleIcon size={14} color="#8A6100" strokeWidth={2} />
        <Typography className="flex-1 text-[12px] font-medium text-navy" style={{ lineHeight: 17 }}>
          Follow-ups and the leaderboard move with the lead. Whoever captured it stays on the
          activity trail.
        </Typography>
      </View>

      <Pressable
        onPress={confirm}
        disabled={unchanged}
        className={`h-[54px] rounded-md items-center justify-center mt-6 ${
          unchanged ? 'bg-gold/40' : 'bg-gold'
        }`}
      >
        <Typography className="text-[16px] font-bold text-navy">
          {unchanged ? 'Pick someone else' : 'Reassign'}
        </Typography>
      </Pressable>
    </SheetShell>
  );
}
