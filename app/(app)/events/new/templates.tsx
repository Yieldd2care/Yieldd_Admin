import { useState } from 'react';
import { Pressable, ScrollView, TextInput as RNTextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../../../../components/ui/Typography';
import { Button } from '../../../../components/ui/Button';
import { WizardHeader } from '../../../../components/app/WizardHeader';
import { MailIcon, WhatsAppIcon } from '../../../../components/ui/icons';
import { useEventDraftStore } from '../../../../stores/useEventDraftStore';

const DEFAULT_WHATSAPP =
  "Hi {{name}}, great meeting you at {{event}}. Sharing our brochure — let us know if you'd like a quote.";
const DEFAULT_EMAIL_SUBJECT = 'Great meeting you at {{event}}';
const DEFAULT_EMAIL_BODY =
  "Hi {{name}}, thank you for stopping by our stall. I've attached our brochure and would love to understand your requirement better.";

function MergeFieldText({ text, className = '' }: { text: string; className?: string }) {
  const parts = text.split(/(\{\{[^}]+\}\})/g);
  return (
    <Typography className={className}>
      {parts.map((part, i) =>
        part.startsWith('{{') ? (
          <Typography key={i} className="font-bold text-navy bg-gold/[0.16] px-[5px] rounded">
            {part}
          </Typography>
        ) : (
          part
        )
      )}
    </Typography>
  );
}

export default function MessageTemplatesScreen() {
  const draft = useEventDraftStore();
  const [whatsappText, setWhatsappText] = useState(draft.whatsappTemplate || DEFAULT_WHATSAPP);
  const [emailBody, setEmailBody] = useState(draft.emailBody || DEFAULT_EMAIL_BODY);
  const [editingWhatsapp, setEditingWhatsapp] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);

  const finish = () => {
    useEventDraftStore.getState().setTemplates({
      whatsappTemplate: whatsappText,
      emailSubject: DEFAULT_EMAIL_SUBJECT,
      emailBody,
    });
    router.push('/(app)/events/new/complete');
  };

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
      <WizardHeader title="Set your follow-up message" step={5} />
      <ScrollView contentContainerClassName="px-5 pt-5 pb-5" showsVerticalScrollIndicator={false}>
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
      </ScrollView>
      <View className="bg-white border-t border-hairline px-5 pt-[14px] pb-6 items-center gap-3">
        <Button label="Use these defaults" onPress={finish} className="w-full" />
        <Pressable onPress={finish}>
          <Typography className="text-[13px] font-semibold text-slate">Skip for now</Typography>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
