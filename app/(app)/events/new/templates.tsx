import { useEffect, useState } from 'react';
import { Pressable, ScrollView, TextInput as RNTextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { Typography } from '../../../../components/ui/Typography';
import { Button } from '../../../../components/ui/Button';
import { ScreenHeader } from '../../../../components/app/ScreenHeader';
import { WizardHeader } from '../../../../components/app/WizardHeader';
import { KeyboardSafe } from '../../../../components/app/KeyboardSafe';
import { MergeFieldText, UnknownTokenWarning } from '../../../../components/app/MergeFieldText';
import { MailIcon, WhatsAppIcon } from '../../../../components/ui/icons';
import { useEventDraftStore } from '../../../../stores/useEventDraftStore';
import { useSessionStore } from '../../../../stores/useSessionStore';
import { useEvent, useUpdateEvent } from '../../../../hooks/useEvents';
import { useEventTemplate } from '../../../../hooks/useMessageTemplates';
import { ensureTemplate } from '../../../../lib/api/messageTemplates';

const DEFAULT_WHATSAPP =
  "Hi {{name}}, great meeting you at {{event}}. Sharing our brochure. Let us know if you'd like a quote.";
const DEFAULT_EMAIL_SUBJECT = 'Great meeting you at {{event}}';
const DEFAULT_EMAIL_BODY =
  "Hi {{name}}, thank you for stopping by our stall. I've attached our brochure and would love to understand your requirement better.";


export default function MessageTemplatesScreen() {
  /**
   * Step 5 of the wizard, and the follow-up editor reached from an existing
   * event. Same reasoning as the cost step: given an `eventId` it edits that
   * event, and without one it belongs to the wizard's draft. Reading the id
   * from the draft alone is what made this screen unusable after a wizard had
   * finished, and dangerous while one was half-done.
   */
  const { eventId: eventIdParam } = useLocalSearchParams<{ eventId?: string }>();
  const editingOne = Boolean(eventIdParam);

  const draft = useEventDraftStore();
  const user = useSessionStore((s) => s.user);
  const updateEvent = useUpdateEvent();

  const eventId = eventIdParam ?? draft.eventId;
  const { data: event } = useEvent(editingOne ? eventIdParam : undefined);
  const { template: currentWhatsapp } = useEventTemplate(
    editingOne ? eventIdParam : undefined,
    'whatsapp'
  );
  const { template: currentEmail } = useEventTemplate(
    editingOne ? eventIdParam : undefined,
    'email'
  );

  const [whatsappText, setWhatsappText] = useState(draft.whatsappTemplate || DEFAULT_WHATSAPP);
  const [emailBody, setEmailBody] = useState(draft.emailBody || DEFAULT_EMAIL_BODY);

  /**
   * Editing an existing event shows the message that event actually sends, not
   * the wizard's leftovers. Without this the screen would offer the default
   * text and saving it would overwrite a message someone had already written.
   */
  useEffect(() => {
    if (!editingOne) return;
    if (currentWhatsapp?.body) setWhatsappText(currentWhatsapp.body);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingOne, currentWhatsapp?.id]);

  useEffect(() => {
    if (!editingOne) return;
    if (currentEmail?.body) setEmailBody(currentEmail.body);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingOne, currentEmail?.id]);
  const [editingWhatsapp, setEditingWhatsapp] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * The two messages become organisation-level templates and the event points
   * at them, rather than being stored as loose text on the event.
   *
   * `events.whatsapp_template` and `email_template` used to be text columns and
   * were dropped on purpose: two writable copies of the same message with
   * nothing reconciling them is how they drift apart. One template row, many
   * events referencing it, edited in one place.
   */
  const finish = async () => {
    if (isSaving) return;
    setError(null);

    // The draft belongs to the event being created. Editing an existing event
    // must not write into it, or the next event someone starts inherits these.
    if (!editingOne) {
      useEventDraftStore.getState().setTemplates({
        whatsappTemplate: whatsappText,
        emailSubject: DEFAULT_EMAIL_SUBJECT,
        emailBody,
      });
    }

    if (eventId && user) {
      setIsSaving(true);
      const eventLabel = editingOne ? event?.name : draft.name;
      const label = (isEdited: boolean) =>
        isEdited && eventLabel ? `${eventLabel} follow-up` : 'Default follow-up';
      try {
        const [whatsapp, email] = await Promise.all([
          ensureTemplate({
            organizationId: user.organizationId,
            createdBy: user.id,
            channel: 'whatsapp',
            name: label(whatsappText !== DEFAULT_WHATSAPP),
            body: whatsappText,
          }),
          ensureTemplate({
            organizationId: user.organizationId,
            createdBy: user.id,
            channel: 'email',
            name: label(emailBody !== DEFAULT_EMAIL_BODY),
            subject: DEFAULT_EMAIL_SUBJECT,
            body: emailBody,
          }),
        ]);
        await updateEvent.mutateAsync({
          id: eventId,
          whatsappTemplateId: whatsapp.id,
          emailTemplateId: email.id,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Those templates didn't save.");
        setIsSaving(false);
        return;
      }
      setIsSaving(false);
    } else if (editingOne) {
      setError('That event could not be identified, so nothing was saved.');
      return;
    }

    if (editingOne) {
      router.back();
      return;
    }

    router.push('/(app)/events/new/complete');
  };

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
      {editingOne ? (
        <ScreenHeader title={event?.name ? `${event.name}: follow-up` : 'Follow-up message'} />
      ) : (
        <WizardHeader title="Set your follow-up message" step={5} />
      )}
      {/* Both message boxes are multiline, so the keyboard covers most of this
          screen. `keyboardShouldPersistTaps` matters as much as the avoiding
          view: without it the first tap on Done or Continue is spent dismissing
          the keyboard and never reaches the button. */}
      <KeyboardSafe>
        <ScrollView
          contentContainerClassName="px-5 pt-5 pb-5"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        <View className="bg-white border border-hairline rounded-lg p-4 mb-4">
          <View className="flex-row items-center gap-[10px] mb-3">
            <WhatsAppIcon size={17} color="#25D366" strokeWidth={2} />
            <Typography className="text-[13.5px] font-bold text-navy">WhatsApp</Typography>
            <Pressable className="ml-auto" onPress={() => setEditingWhatsapp((v) => !v)}>
              <Typography className="text-[12px] font-bold text-gold">{editingWhatsapp ? 'Done' : 'Edit'}</Typography>
            </Pressable>
          </View>
          {editingWhatsapp ? (
            <RNTextInput
              className="bg-section rounded-xl px-[14px] py-3 text-[13px] leading-[1.55] text-ink-muted"
              value={whatsappText}
              onChangeText={setWhatsappText}
              multiline
            />
          ) : (
            <View className="bg-section rounded-xl px-[14px] py-3">
              <MergeFieldText text={whatsappText} className="text-[13px] leading-[1.55] text-ink-muted" />
            </View>
          )}
        </View>

        <View className="bg-white border border-hairline rounded-lg p-4 mb-4">
          <View className="flex-row items-center gap-[10px] mb-3">
            <MailIcon size={17} color="#0B132B" strokeWidth={1.75} />
            <Typography className="text-[13.5px] font-bold text-navy">Email</Typography>
            <Pressable className="ml-auto" onPress={() => setEditingEmail((v) => !v)}>
              <Typography className="text-[12px] font-bold text-gold">{editingEmail ? 'Done' : 'Edit'}</Typography>
            </Pressable>
          </View>
          <View className="border border-hairline rounded-[10px] px-[14px] py-3">
            <MergeFieldText text={DEFAULT_EMAIL_SUBJECT} className="text-[12.5px] font-bold text-navy mb-[6px]" />
            {editingEmail ? (
              <RNTextInput
                className="text-[12.5px] leading-[1.55] text-slate"
                value={emailBody}
                onChangeText={setEmailBody}
                multiline
              />
            ) : (
              <MergeFieldText text={emailBody} className="text-[12.5px] leading-[1.55] text-slate" />
            )}
          </View>
        </View>

        {error ? (
          <Typography className="mt-1 text-[13px] font-semibold text-[#C23B3B] leading-[1.45]">
            {error}
          </Typography>
        ) : null}
        </ScrollView>
      {/* Inside KeyboardSafe, not after it (#69). Both message boxes are
          multiline, so this footer is exactly what the keyboard covers, and it
          was outside the wrapper on iPhone as well as Android. */}
      <View className="bg-white border-t border-hairline px-5 pt-[14px] pb-6 items-center gap-3">
        <Button
          label={isSaving ? 'Saving…' : editingOne ? 'Save follow-up' : 'Use these defaults'}
          disabled={isSaving}
          onPress={finish}
          className="w-full"
        />
        {editingOne ? null : (
          <Pressable onPress={finish} disabled={isSaving}>
            <Typography className="text-[13px] font-semibold text-slate">Skip for now</Typography>
          </Pressable>
        )}
      </View>
      </KeyboardSafe>
    </SafeAreaView>
  );
}
