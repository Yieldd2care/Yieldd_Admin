import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchPendingInvites,
  fetchTeam,
  revokeInvite,
  setMemberStatus,
  type MemberStatus,
} from '../lib/api/team';
import { useSessionStore } from '../stores/useSessionStore';

export const teamKeys = {
  all: ['team'] as const,
  members: () => [...teamKeys.all, 'members'] as const,
  invites: () => [...teamKeys.all, 'invites'] as const,
};

export function useTeam() {
  const userId = useSessionStore((s) => s.user?.id);
  const isAdmin = useSessionStore((s) => s.user?.role === 'admin');

  return useQuery({
    queryKey: [...teamKeys.members(), userId, isAdmin],
    queryFn: () => fetchTeam(userId as string, isAdmin),
    enabled: Boolean(userId),
  });
}

export function usePendingInvites() {
  const isAdmin = useSessionStore((s) => s.user?.role === 'admin');

  return useQuery({
    queryKey: teamKeys.invites(),
    queryFn: fetchPendingInvites,
    // `invites_admin_all` means a rep can never read these.
    enabled: isAdmin,
  });
}

export function useSetMemberStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Extract<MemberStatus, 'active' | 'deactivated'> }) =>
      setMemberStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teamKeys.all }),
  });
}

export function useRevokeInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => revokeInvite(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teamKeys.invites() }),
  });
}
