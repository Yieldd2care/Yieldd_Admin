import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { ScreenHeader } from '../../../components/app/ScreenHeader';
import { AlertCircleIcon, CheckIcon, MailIcon, WhatsAppIcon } from '../../../components/ui/icons';
import { useLeadsStore } from '../../../stores/useLeadsStore';
import { useSessionStore } from '../../../stores/useSessionStore';
import { useCurrentEvent } from '../../../hooks/useEvents';
import { useEventTemplate } from '../../../hooks/useMessageTemplates';
import { renderTemplate, whatsappDigits } from '../../../lib/messaging';

/**
 * Picking who gets a follow-up.
 *
 * The next screen opens one chat at a time — a `wa.me` link hands the draft to
 * the rep's own WhatsApp and they press send. So this is a queue being built,
 * not a broadcast being scheduled, and the copy says so rather than implying
 * messages will go out on their own.
 */
export default function BulkSendScreen() {
  const [channel, setChannel] = useState<'whatsapp' | 'email'>('whatsapp');
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [touched, setTouched] = useState(false);

  const allLeads = useLeadsStore((s) => s.leads);
  const user = useSessionStore((s) => s.user);
  const { event } = useCurrentEvent();
  const { template } = useEventTemplate(event?.id, channel);

  const leads = useMemo(
    () =>
      allLeads.filter(
        (l) => l.syncStatus === 'synced' && (!event || !l.eventId || l.eventId === event.id)
      ),
    [allLeads, event]
  );

  /** Someone with no number cannot be WhatsApped, and no email cannot be mailed. */
  const reachable = useMemo(
    () =>
      leads.filter((l) =>
        channel === 'whatsapp' ? Boolean(whatsappDigits(l.phone)) : Boolean(l.email?.trim())
      ),
    [leads, channel]
  );
  const unreachableCount = leads.length - reachable.length;

  // Everyone reachable starts selected — the common case is "send to all of
  // today's leads" — but a deliberate deselection is never undone by a re-render.
  const isSelected = (id: string) => (touched ? Boolean(selected[id]) : true);
  const selectedIds = reachable.filter((l) => isSelected(l.id)).map((l) => l.id);

  const toggle = (id: string) => {
    if (!touched) {
      // First tap: keep everyone else on, turn this one off.
      const initial: Record<string, boolean> = {};
      reachable.forEach((l) => {
        initial[l.id] = l.id !== id;
      });
      setSelected(initial);
      setTouched(true);
      return;
    }
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const previewLead = reachable.find((l) => isSelected(l.id)) ?? reachable[0];
  const preview = template
    ? renderTemplate(template.body, {
        name: previewLead?.name,
        company: previewLead?.company,
        event: event?.name,
        sender: user?.name,
        senderCompany: user?.company,
      })
    : '';

  const start = () => {
    if (!selectedIds.length) return;
    router.push({
      pathname: '/(app)/leads/send-queue',
      params: { channel, ids: selectedIds.join(',') },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
      <ScreenHeader
        title="Bulk send"
        right={
          <View className="bg-navy rounded-full px-3 py-[6px]">
            <Typography className="text-[12px] font-extrabold text-white">
              {selectedIds.length} selected
            </Typography>
          </View>
        }
      />

      <View className="flex-row gap-2 bg-white border-b border-hairline px-5 py-[14px]">
        <Pressable
          onPress={() => setChannel('whatsapp')}
          className={`flex-1 h-[42px] rounded-full border-[1.5px] flex-row items-center justify-center gap-[7px] ${channel === 'whatsapp' ? 'bg-navy border-navy' : 'border-hairline'}`}
        >
          <WhatsAppIcon size={14} color={channel === 'whatsapp' ? '#fff' : '#25D366'} />
          <Typography className={`text-[12.5px] font-bold ${channel === 'whatsapp' ? 'text-white' : 'text-navy'}`}>
            WhatsApp
          </Typography>
        </Pressable>
        <Pressable
          onPress={() => setChannel('email')}
          className={`flex-1 h-[42px] rounded-full border-[1.5px] flex-row items-center justify-center gap-[7px] ${channel === 'email' ? 'bg-navy border-navy' : 'border-hairline'}`}
        >
          <MailIcon size={14} color={channel === 'email' ? '#fff' : '#5A6B87'} />
          <Typography className={`text-[12.5px] font-bold ${channel === 'email' ? 'text-white' : 'text-navy'}`}>
            Email
          </Typography>
        </Pressable>
      </View>

      <ScrollView contentContainerClassName="px-5 pt-[14px] pb-6" showsVerticalScrollIndicator={false}>
        <View className="bg-white border border-hairline rounded-2xl p-[14px] mb-4">
          <Typography className="text-[10px] font-bold tracking-[0.12em] text-slate mb-2" style={{ textTransform: 'uppercase' }}>
            Message preview
          </Typography>
          {template ? (
            <>
              {channel === 'email' && template.subject ? (
                <Typography className="text-[12px] font-bold text-navy mb-[6px]">
                  {renderTemplate(template.subject, { name: previewLead?.name, event: event?.name })}
                </Typography>
              ) : null}
              <View className="bg-section rounded-[10px] px-[13px] py-[11px]">
                <Typography className="text-[12.5px] text-navy" style={{ lineHeight: 19 }}>
                  {preview}
                </Typography>
              </View>
              <Pressable onPress={() => router.push('/(app)/events/new/templates')} className="mt-[10px]">
                <Typography className="text-[12px] font-bold text-gold">
                  Edit the {channel === 'whatsapp' ? 'WhatsApp' : 'email'} template
                </Typography>
              </Pressable>
            </>
          ) : (
            <View className="bg-section rounded-[10px] px-[13px] py-[11px]">
              <Typography className="text-[12.5px] text-slate leading-[1.5]">
                No {channel === 'whatsapp' ? 'WhatsApp' : 'email'} template yet.{' '}
                <Typography
                  className="text-[12.5px] font-bold text-gold"
                  onPress={() => router.push('/(app)/events/new/templates')}
                >
                  Write one
                </Typography>{' '}
                and it will be used here.
              </Typography>
            </View>
          )}
        </View>

        {/* Said plainly, because the alternative is a rep believing 40 messages
            went out while they were having lunch. */}
        <View className="flex-row items-start gap-2 bg-gold/[0.08] border border-gold/[0.30] rounded-md px-[14px] py-3 mb-4">
          <AlertCircleIcon size={14} color="#8A6100" strokeWidth={2} />
          <Typography className="flex-1 text-[12px] font-medium text-navy" style={{ lineHeight: 17 }}>
            {channel === 'whatsapp'
              ? 'These open one at a time in your own WhatsApp, with the message already typed. You press send — nothing goes out on its own.'
              : 'These open one at a time in your mail app, already written. You press send.'}
          </Typography>
        </View>

        {unreachableCount > 0 ? (
          <Typography className="text-[12px] text-slate mb-3 leading-[1.5]">
            {unreachableCount} lead{unreachableCount === 1 ? '' : 's'} left out &mdash; no{' '}
            {channel === 'whatsapp' ? 'phone number' : 'email address'} captured.
          </Typography>
        ) : null}

        {reachable.map((lead) => {
          const on = isSelected(lead.id);
          return (
            <Pressable
              key={lead.id}
              onPress={() => toggle(lead.id)}
              className={`flex-row items-center gap-3 bg-white border rounded-2xl px-4 py-[13px] mb-[10px] ${on ? 'border-gold/[0.45]' : 'border-hairline'}`}
            >
              <View className="w-9 h-9 rounded-[10px] bg-surface items-center justify-center">
                <Typography className="text-[13px] font-extrabold text-navy">{lead.initial}</Typography>
              </View>
              <View className="flex-1">
                <Typography className="text-[13.5px] font-bold text-navy">{lead.name}</Typography>
                <Typography className="text-[11.5px] text-slate mt-[1px]">
                  {lead.company || (channel === 'whatsapp' ? lead.phone : lead.email) || 'No company'}
                </Typography>
              </View>
              <View
                className={`w-[22px] h-[22px] rounded-full items-center justify-center ${on ? 'bg-gold' : 'bg-surface'}`}
              >
                {on ? <CheckIcon size={13} color="#0B132B" strokeWidth={3} /> : null}
              </View>
            </Pressable>
          );
        })}

        {!reachable.length ? (
          <Typography className="text-[13px] text-slate text-center mt-10 leading-[1.5]">
            {leads.length
              ? `None of your leads have ${channel === 'whatsapp' ? 'a phone number' : 'an email address'}.`
              : 'No leads captured yet.'}
          </Typography>
        ) : null}
      </ScrollView>

      <View className="bg-white border-t border-hairline px-5 pt-[14px] pb-6">
        <Pressable
          onPress={start}
          disabled={!selectedIds.length || !template}
          className={`h-[54px] rounded-md items-center justify-center ${
            selectedIds.length && template ? 'bg-gold shadow-[0_10px_24px_rgba(244,176,0,0.30)]' : 'bg-surface'
          }`}
        >
          <Typography
            className={`text-[16px] font-bold ${selectedIds.length && template ? 'text-navy' : 'text-slate'}`}
          >
            Start sending &mdash; {selectedIds.length}
          </Typography>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
