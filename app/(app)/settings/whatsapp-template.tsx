import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '../../../components/app/ScreenHeader';
import { MessageTemplateManager } from '../../../components/app/MessageTemplateManager';

export default function WhatsAppTemplateScreen() {
  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
      <ScreenHeader title="WhatsApp template" />
      {/* See MessageTemplateManager for why both of these are needed: the
          keyboard covered the Save row, and its first tap was being eaten. */}
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerClassName="px-5 pt-[6px] pb-10"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <MessageTemplateManager
            channel="whatsapp"
            intro="This is the default WhatsApp message reps send after a scan. They can still edit it before sending — this just sets what they start with."
            addLabel="Add a WhatsApp template"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
