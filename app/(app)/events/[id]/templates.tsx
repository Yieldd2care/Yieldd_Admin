import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { Typography } from '../../../../components/ui/Typography';
import { Button } from '../../../../components/ui/Button';
import { ScreenHeader } from '../../../../components/app/ScreenHeader';
import { MergeFieldText } from '../../../../components/app/MergeFieldText';
import { CheckIcon, MailIcon, PlusIcon, WhatsAppIcon } from '../../../../components/ui/icons';
import { useEvent, useUpdateEvent } from '../../../../hooks/useEvents';
import { useTemplates } from '../../../../hooks/useMessageTemplates';
import type { MessageChannel, MessageTemplate } from '../../../../lib/api/messageTemplates';


function TemplateChoice({
  template,
  selected,
  onPress,
}: {
  template: MessageTemplate;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`border-[1.5px] rounded-lg px-4 py-[14px] mb-[10px] ${
        selected ? 'border-gold bg-gold/[0.06]' : 'border-hairline bg-white'
      }`}
    >
      <View className="flex-row items-center gap-2">
        <Typography className="flex-1 text-[13.5px] font-bold text-navy" numberOfLines={1}>
          {template.name}
        </Typography>
        {template.isDefault ? (
          <View className="bg-surface rounded-full px-[9px] py-[3px]">
            <Typography className="text-[10.5px] font-bold text-slate">Default</Typography>
          </View>
        ) : null}
        {selected ? (
          <View className="w-[18px] h-[18px] rounded-full bg-gold items-center justify-center">
            <CheckIcon size={11} color="#0B132B" strokeWidth={3} />
          </View>
        ) : (
          <View className="w-[18px] h-[18px] rounded-full border-[1.5px] border-hairline" />
        )}
      </View>

      {template.subject ? (
        <MergeFieldText
          text={template.subject}
          className="text-[12px] font-bold text-navy mt-[8px]"
        />
      ) : null}
      <MergeFieldText
        text={template.body}
        className="text-[12.5px] leading-[1.5] text-slate mt-[6px]"
      />
    </Pressable>
  );
}

function ChannelSection({
  channel,
  selectedId,
  onSelect,
}: {
  channel: MessageChannel;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { data: templates, isLoading } = useTemplates(channel);
  const isWhatsApp = channel === 'whatsapp';

  return (
    <View className="mb-7">
      <View className="flex-row items-center gap-[9px] mb-3">
        {isWhatsApp ? (
          <WhatsAppIcon size={16} color="#25D366" />
        ) : (
          <MailIcon size={16} color="#0B132B" strokeWidth={1.75} />
        )}
        <Typography className="text-[14px] font-bold text-navy">
          {isWhatsApp ? 'WhatsApp' : 'Email'}
        </Typography>
      </View>

      {isLoading ? (
        <ActivityIndicator size="small" color="#F4B000" />
      ) : !templates?.length ? (
        <View className="bg-surface rounded-lg px-4 py-[14px]">
          <Typography className="text-[12.5px] text-navy leading-[1.5]">
            No {isWhatsApp ? 'WhatsApp' : 'email'} templates yet. Write one in Settings and it will
            appear here.
          </Typography>
        </View>
      ) : (
        templates.map((t) => (
          <TemplateChoice
            key={t.id}
            template={t}
            selected={selectedId === t.id}
            onPress={() => onSelect(t.id)}
          />
        ))
      )}

      <Pressable
        onPress={() =>
          router.push(
            isWhatsApp ? '/(app)/settings/whatsapp-template' : '/(app)/settings/email-template'
          )
        }
        className="flex-row items-center gap-2 border-[1.5px] border-dashed border-hairline rounded-lg px-4 py-[13px] mt-1"
      >
        <PlusIcon />
        <Typography className="text-[13px] font-bold text-gold">
          Write a new {isWhatsApp ? 'WhatsApp' : 'email'} template
        </Typography>
      </Pressable>
    </View>
  );
}

export default function EventTemplatesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = id ?? '';
  const { data: event, isLoading } = useEvent(eventId || undefined);
  const updateEvent = useUpdateEvent();

  const [whatsappId, setWhatsappId] = useState<string | null>(null);
  const [emailId, setEmailId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Seeded on the event's id, not the object: the query returns a fresh object
  // on every refetch, and re-seeding on that would undo a selection just made.
  useEffect(() => {
    if (!event) return;
    setWhatsappId(event.whatsappTemplateId);
    setEmailId(event.emailTemplateId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id]);

  const save = async () => {
    if (!eventId || updateEvent.isPending) return;
    setError(null);
    try {
      await updateEvent.mutateAsync({
        id: eventId,
        whatsappTemplateId: whatsappId,
        emailTemplateId: emailId,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't save. Try again.");
      return;
    }
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
      <ScreenHeader title="Follow-up message" />
      <ScrollView
        contentContainerClassName="px-5 pt-5 pb-8"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Typography className="text-[13px] leading-[1.55] text-slate mb-6">
          Pick the message reps start from when they follow up on this event&rsquo;s leads. They can
          still edit it before sending.
        </Typography>

        {isLoading && !event ? (
          <ActivityIndicator color="#F4B000" />
        ) : (
          <>
            <ChannelSection channel="whatsapp" selectedId={whatsappId} onSelect={setWhatsappId} />
            <ChannelSection channel="email" selectedId={emailId} onSelect={setEmailId} />
          </>
        )}

        {error ? (
          <Typography className="text-[13px] font-semibold text-[#C23B3B] leading-[1.45]">
            {error}
          </Typography>
        ) : null}
      </ScrollView>
      <View className="bg-white border-t border-hairline px-5 pt-[14px] pb-6">
        <Button
          label={updateEvent.isPending ? 'Saving…' : 'Save selection'}
          disabled={isLoading || updateEvent.isPending}
          onPress={save}
        />
      </View>
    </SafeAreaView>
  );
}
