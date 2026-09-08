import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchPendingInvites,
  fetchTeam,
  revokeInvite,
  setMemberStatus,
  type MemberStatus,
} from '../lib/api/team';
import { createInvites, type Invite, type InviteDraft } from '../lib/api/invites';
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

/**
 * Invite people to the organisation.
 *
 * The organisation id and the inviter come from the session rather than the
 * caller, the same way useCreateEvent does it — a screen should not be able to
 * invite into someone else's organisation by passing a different id.
 *
 * `eventId` is null for a plain team invite. Pass an event to put them on it as
 * well; `handle_new_user()` inserts the event_members row at signup.
 */
export function useCreateInvites() {
  const queryClient = useQueryClient();
  const user = useSessionStore((s) => s.user);

  return useMutation({
    mutationFn: ({ reps, eventId = null }: { reps: InviteDraft[]; eventId?: string | null }): Promise<Invite[]> => {
      if (!user) throw new Error('You need to be signed in to invite anyone.');
      return createInvites({
        organizationId: user.organizationId,
        invitedBy: user.id,
        eventId,
        reps,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teamKeys.all }),
  });
}
