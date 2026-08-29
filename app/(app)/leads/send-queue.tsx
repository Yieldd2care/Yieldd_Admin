import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { MailIcon, WhatsAppIcon } from '../../../components/ui/icons';
import { useLeadsStore } from '../../../stores/useLeadsStore';
import { useSessionStore } from '../../../stores/useSessionStore';
import { useCurrentEvent } from '../../../hooks/useEvents';
import { useEventTemplate } from '../../../hooks/useMessageTemplates';
import { openEmail, openWhatsApp, renderTemplate } from '../../../lib/messaging';
import { completeBatch, recordSend, startBatch } from '../../../lib/api/messageSends';

/**
 * Walking through the follow-ups, one at a time.
 *
 * This shape is not a compromise — it is what a `wa.me` deep link actually
 * allows. Each card hands one draft to the rep's own WhatsApp or mail app; they
 * press send there and come back. The app never claims a message was
 * delivered, because it genuinely cannot know: it records "opened" and
 * "skipped", which are the two things it can honestly observe.
 */
export default function SendQueueScreen() {
  const { channel: channelParam, ids } = useLocalSearchParams<{ channel?: string; ids?: string }>();
  const channel = channelParam === 'email' ? 'email' : 'whatsapp';

  const allLeads = useLeadsStore((s) => s.leads);
  const user = useSessionStore((s) => s.user);
  const { event } = useCurrentEvent();
  const { template } = useEventTemplate(event?.id, channel);

  const queue = useMemo(() => {
    const wanted = (ids ?? '').split(',').filter(Boolean);
    // Kept in the order they were picked, not the order the store holds them.
    return wanted
      .map((id) => allLeads.find((l) => l.id === id))
      .filter((l): l is NonNullable<typeof l> => Boolean(l));
  }, [ids, allLeads]);

  const [index, setIndex] = useState(0);
  const [sent, setSent] = useState(0);
  const batchId = useRef<string | null>(null);
  const [isOpening, setIsOpening] = useState(false);

  // One batch row for the whole run, so "3 of 8" has a real denominator.
  useEffect(() => {
    if (!user || !queue.length || batchId.current) return;
    let cancelled = false;
    void startBatch({
      organizationId: user.organizationId,
      eventId: event?.id ?? null,
      createdBy: user.id,
      channel,
      totalCount: queue.length,
    }).then((id) => {
      if (!cancelled) batchId.current = id;
    });
    return () => {
      cancelled = true;
    };
  }, [user, queue.length, event?.id, channel]);

  const total = queue.length;
  const lead = queue[index];
  const done = index >= total;

  useEffect(() => {
    if (done && total > 0) void completeBatch(batchId.current);
  }, [done, total]);

  const message = lead && template
    ? renderTemplate(template.body, {
        name: lead.name,
        company: lead.company,
        event: event?.name,
        sender: user?.name,
        senderCompany: user?.company,
      })
    : '';

  const subject =
    lead && template?.subject
      ? renderTemplate(template.subject, { name: lead.name, company: lead.company, event: event?.name })
      : '';

  const advance = () => setIndex((i) => i + 1);

  const skip = () => {
    if (!lead || !user) return advance();
    void recordSend({
      leadId: lead.id,
      sentBy: user.id,
      channel,
      templateUsed: template?.name,
      templateId: template?.id,
      batchId: batchId.current,
      status: 'skipped',
    });
    advance();
  };

  const openIt = async () => {
    if (!lead || !user || isOpening) return;
    setIsOpening(true);

    const outcome =
      channel === 'whatsapp'
        ? await openWhatsApp(lead.phone, message)
        : await openEmail(lead.email, subject, message);

    setIsOpening(false);

    if (!outcome.ok) {
      Alert.alert('Could not open', outcome.message);
      return;
    }

    // `sent` here means the draft was handed over with the chat open. Whether
    // the rep pressed send in WhatsApp is not something this app can see, and
    // it must not pretend otherwise.
    void recordSend({
      leadId: lead.id,
      sentBy: user.id,
      channel,
      templateUsed: template?.name,
      templateId: template?.id,
      batchId: batchId.current,
      status: 'sent',
    });
    setSent((n) => n + 1);
    advance();
  };

  if (!total) {
    return (
      <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
        <View className="flex-1 items-center justify-center px-8">
          <Typography className="text-[15px] font-bold text-navy text-center">
            Nothing in the queue
          </Typography>
          <Pressable onPress={() => router.back()} className="mt-4">
            <Typography className="text-[13.5px] font-bold text-gold">Go back</Typography>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (done) {
    return (
      <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
        <View className="flex-1 items-center justify-center px-8">
          <Typography className="text-[22px] font-extrabold text-navy text-center">
            {sent} of {total} opened
          </Typography>
          <Typography className="text-[13.5px] text-slate text-center mt-3 leading-[1.55] max-w-[290px]">
            {sent === total
              ? 'That is everyone. Anything you did not press send on in ' +
                (channel === 'whatsapp' ? 'WhatsApp' : 'your mail app') +
                ' is still waiting there.'
              : `${total - sent} skipped. You can run through them again whenever you like.`}
          </Typography>
          <Pressable
            onPress={() => router.replace('/(app)/(tabs)/leads')}
            className="bg-gold rounded-full px-7 py-3 mt-7"
          >
            <Typography className="text-[14.5px] font-bold text-navy">Back to leads</Typography>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const progress = (index / total) * 100;

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between px-5 pt-[18px] pb-4">
        <Typography className="text-[19px] font-bold text-navy">Sending follow-ups</Typography>
        <Pressable onPress={() => router.back()}>
          <Typography className="text-[13px] font-bold text-slate">Cancel</Typography>
        </Pressable>
      </View>

      <View className="px-5">
        <View className="flex-row items-center justify-between mb-2">
          <Typography className="text-[12px] font-bold text-slate">
            {index} of {total} done
          </Typography>
          <Typography className="text-[12px] font-bold text-slate">{total - index} to go</Typography>
        </View>
        <View className="h-[6px] rounded-full bg-surface overflow-hidden">
          <View className="h-full bg-gold rounded-full" style={{ width: `${progress}%` }} />
        </View>
      </View>

      <View className="flex-1 items-center justify-center px-8">
        <Typography className="text-[10px] font-bold tracking-[0.12em] text-slate" style={{ textTransform: 'uppercase' }}>
          Up next
        </Typography>
        <View className="w-full bg-white border border-hairline rounded-[20px] p-7 mt-4">
          <View className="w-16 h-16 rounded-[18px] bg-gold items-center justify-center self-center">
            <Typography className="text-[24px] font-extrabold text-navy">{lead.initial}</Typography>
          </View>
          <Typography className="text-[17px] font-bold text-navy text-center mt-4">{lead.name}</Typography>
          <Typography className="text-[12.5px] text-slate text-center mt-[2px]">
            {lead.company || (channel === 'whatsapp' ? lead.phone : lead.email) || 'No company'}
          </Typography>

          {channel === 'email' && subject ? (
            <Typography className="text-[12px] font-bold text-navy mt-[18px]">{subject}</Typography>
          ) : null}

          <View className={`bg-section rounded-[10px] px-[14px] py-3 ${channel === 'email' && subject ? 'mt-2' : 'mt-[18px]'}`}>
            <Typography className="text-[12.5px] text-navy" style={{ lineHeight: 19 }}>
              {message}
            </Typography>
          </View>

          <View className="flex-row gap-[10px] mt-6">
            <Pressable
              onPress={skip}
              className="flex-1 h-[50px] rounded-md bg-white border border-hairline items-center justify-center"
            >
              <Typography className="text-[14px] font-bold text-navy">Skip</Typography>
            </Pressable>
            <Pressable
              onPress={openIt}
              disabled={isOpening}
              className={`flex-[2] h-[50px] rounded-md bg-gold items-center justify-center flex-row gap-[7px] shadow-[0_8px_20px_rgba(244,176,0,0.28)] ${isOpening ? 'opacity-60' : ''}`}
            >
              {channel === 'whatsapp' ? (
                <WhatsAppIcon size={14} color="#25D366" />
              ) : (
                <MailIcon size={14} color="#0B132B" strokeWidth={2} />
              )}
              <Typography className="text-[14.5px] font-bold text-navy">
                {channel === 'whatsapp' ? 'Open in WhatsApp' : 'Open in Mail'}
              </Typography>
            </Pressable>
          </View>
        </View>

        <Typography className="text-[11.5px] text-placeholder text-center mt-4 leading-[1.5]">
          Press send in {channel === 'whatsapp' ? 'WhatsApp' : 'your mail app'}, then come back here
          for the next one.
        </Typography>
      </View>
    </SafeAreaView>
  );
}
