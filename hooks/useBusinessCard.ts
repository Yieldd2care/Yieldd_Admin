import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchMyCard,
  saveMyCard,
  setCardPublished,
  type BusinessCard,
  type CardInput,
} from '../lib/api/businessCard';
import { useSessionStore } from '../stores/useSessionStore';

export const cardKeys = {
  mine: (profileId: string | undefined) => ['business-card', profileId ?? 'anonymous'] as const,
};

export function useMyCard() {
  const profileId = useSessionStore((s) => s.user?.id);

  return useQuery<BusinessCard | null>({
    queryKey: cardKeys.mine(profileId),
    queryFn: () => fetchMyCard(profileId as string),
    enabled: Boolean(profileId),
    // A card is edited by one person on one device and read far more often
    // than it changes; refetching it on every focus would be noise.
    staleTime: 5 * 60_000,
  });
}

export function useSaveCard() {
  const queryClient = useQueryClient();
  const profileId = useSessionStore((s) => s.user?.id);

  return useMutation({
    mutationFn: (input: CardInput) => {
      if (!profileId) throw new Error('You need to be signed in.');
      return saveMyCard(profileId, input);
    },
    onSuccess: ({ card }) => {
      // The saved row comes back from the upsert, so the cache is written
      // directly rather than invalidated — the preview that renders straight
      // after this should show what was saved, not a spinner.
      queryClient.setQueryData(cardKeys.mine(profileId), card);
    },
  });
}

export function useSetCardPublished() {
  const queryClient = useQueryClient();
  const profileId = useSessionStore((s) => s.user?.id);

  return useMutation({
    mutationFn: (published: boolean) => {
      if (!profileId) throw new Error('You need to be signed in.');
      return setCardPublished(profileId, published);
    },
    onSuccess: (_result, published) => {
      queryClient.setQueryData<BusinessCard | null>(cardKeys.mine(profileId), (current) =>
        current ? { ...current, isPublished: published } : current
      );
    },
  });
}
