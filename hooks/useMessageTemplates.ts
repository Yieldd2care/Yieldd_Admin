import { useQuery } from '@tanstack/react-query';

import { fetchTemplates, type MessageChannel, type MessageTemplate } from '../lib/api/messageTemplates';
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
