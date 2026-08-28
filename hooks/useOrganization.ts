import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchOrganization, updateOrganization } from '../lib/api/organization';
import { useSessionStore } from '../stores/useSessionStore';

export const organizationKeys = {
  all: ['organization'] as const,
};

export function useOrganization() {
  const enabled = useSessionStore((s) => Boolean(s.user));

  return useQuery({
    queryKey: organizationKeys.all,
    queryFn: fetchOrganization,
    enabled,
    // The plan tier and seat count barely move, and every screen that shows a
    // limit reads them.
    staleTime: 5 * 60_000,
  });
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();
  const organizationId = useSessionStore((s) => s.user?.organizationId);

  return useMutation({
    mutationFn: (patch: { name?: string; category?: string | null; onboardingIntent?: string | null }) => {
      if (!organizationId) throw new Error('You need to be signed in.');
      return updateOrganization(organizationId, patch);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: organizationKeys.all });
      // The session store keeps a flattened copy of the company name.
      await useSessionStore.getState().refreshProfile();
    },
  });
}
