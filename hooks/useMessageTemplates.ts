import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createTemplate,
  deleteTemplate,
  fetchTemplates,
  setDefaultTemplate,
  updateTemplate,
  type MessageChannel,
  type MessageTemplate,
} from '../lib/api/messageTemplates';
import { useSessionStore } from '../stores/useSessionStore';
import { useEvent } from './useEvents';

export const templateKeys = {
  all: ['messageTemplates'] as const,
  channel: (channel: MessageChannel) => [...templateKeys.all, channel] as const,
};

export function useTemplates(channel?: MessageChannel) {
  const enabled = useSessionStore((s) => Boolean(s.user));

  return useQuery({
    queryKey: channel ? templateKeys.channel(channel) : templateKeys.all,
    queryFn: () => fetchTemplates(channel),
    enabled,
    staleTime: 60_000,
  });
}

/**
 * The template a follow-up should use for this event and channel.
 *
 * Falls back in order: the one the event points at, then the organisation's
 * default for that channel, then the first one that exists. An organisation
 * that has never opened the templates screen still gets a message rather than
 * an empty box, and the fallback is explicit rather than an accident of which
 * row came back first.
 */
export function useEventTemplate(
  eventId: string | undefined,
  channel: MessageChannel
): { template: MessageTemplate | undefined; isLoading: boolean } {
  const { data: event } = useEvent(eventId);
  const { data: templates, isLoading } = useTemplates(channel);

  const linkedId = channel === 'whatsapp' ? event?.whatsappTemplateId : event?.emailTemplateId;

  const template =
    templates?.find((t) => t.id === linkedId) ??
    templates?.find((t) => t.isDefault) ??
    templates?.[0];

  return { template, isLoading };
}

/**
 * Create, edit, delete and default — against `message_templates`, the table the
 * send path actually reads.
 *
 * These exist because the settings editor used to write to a device-local
 * zustand store while every WhatsApp and email send read the database. A rep
 * could rewrite their follow-up message, watch it save, and change nothing
 * about what the customer received.
 *
 * Every mutation invalidates the whole template list rather than patching the
 * cache: `is_default` is exclusive per channel (a partial unique index enforces
 * it), so setting one default silently clears another row the client cannot see
 * from the response.
 */
export function useTemplateMutations(channel: MessageChannel) {
  const queryClient = useQueryClient();
  const user = useSessionStore((s) => s.user);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: templateKeys.all });

  const create = useMutation({
    mutationFn: (input: { name: string; subject?: string | null; body: string }) => {
      if (!user) throw new Error('You need to be signed in.');
      return createTemplate({
        ...input,
        channel,
        organizationId: user.organizationId,
        createdBy: user.id,
      });
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: (input: { id: string; name?: string; subject?: string | null; body?: string }) =>
      updateTemplate(input.id, { name: input.name, subject: input.subject, body: input.body }),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteTemplate(id),
    onSuccess: invalidate,
  });

  const makeDefault = useMutation({
    mutationFn: (id: string) => setDefaultTemplate(id),
    onSuccess: invalidate,
  });

  return { create, update, remove, makeDefault };
}
