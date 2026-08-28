import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type MemberBadge = 'admin' | 'rep';
export type MemberStatus = 'active' | 'deactivated';

export type TeamMember = {
  id: string;
  initial: string;
  name: string;
  role: string;
  badge: MemberBadge;
  phone: string;
  email: string;
  status: MemberStatus;
  isSelf?: boolean;
};

export type PendingInvite = {
  id: string;
  initial: string;
  name: string;
  phone: string;
  invitedLabel: string;
};

type TeamState = {
  members: TeamMember[];
  pendingInvites: PendingInvite[];
  revokeAccess: (id: string) => void;
  revokeInvite: (id: string) => void;
};

export const useTeamStore = create<TeamState>()(
  persist(
    (set) => ({
      members: [
        {
          id: 'mem_priya',
          initial: 'P',
          name: 'Priya Sharma',
          role: 'You',
          badge: 'admin',
          phone: '98200 11234',
          email: 'priya@acmeindustries.in',
          status: 'active',
          isSelf: true,
        },
        {
          id: 'mem_arjun',
          initial: 'A',
          name: 'Arjun Mehta',
          role: '142 leads captured',
          badge: 'rep',
          phone: '98211 55672',
          email: 'arjun@acmeindustries.in',
          status: 'active',
        },
        {
          id: 'mem_ritika',
          initial: 'R',
          name: 'Ritika Chawla',
          role: '118 leads captured',
          badge: 'rep',
          phone: '98673 20981',
          email: 'ritika@acmeindustries.in',
          status: 'active',
        },
        {
          id: 'mem_rohit',
          initial: 'D',
          name: 'Rohit Desai',
          role: 'Deactivated · leads retained',
          badge: 'rep',
          phone: '98450 67213',
          email: 'rohit@acmeindustries.in',
          status: 'deactivated',
        },
      ],
      pendingInvites: [
        { id: 'inv_meera', initial: 'M', name: 'Meera Iyer', phone: '98204 55210', invitedLabel: 'Invited 2 days ago' },
      ],
      revokeAccess: (id) =>
        set((state) => ({
          members: state.members.map((m) =>
            m.id === id ? { ...m, status: 'deactivated', role: 'Deactivated · leads retained' } : m
          ),
        })),
      revokeInvite: (id) =>
        set((state) => ({
          pendingInvites: state.pendingInvites.filter((inv) => inv.id !== id),
        })),
    }),
    {
      name: 'yieldd-team',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
