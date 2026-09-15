import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { ScreenHeader } from '../../../components/app/ScreenHeader';
import { VoiceRecorder } from '../../../components/capture/VoiceRecorder';
import { useCaptureDraftStore } from '../../../stores/useCaptureDraftStore';
import type { Recording } from '../../../hooks/useVoiceRecorder';

/**
 * The standalone voice-note screen.
 *
 * Nearly all of it moved out. The recorder itself is now
 * `components/capture/VoiceRecorder`, shared with the capture details screen,
 * which records inline instead of pushing a route. What is left here is the
 * part that only makes sense as a screen: reading what is already attached, and
 * writing the result back to the capture draft before going back.
 *
 * The route survives because the manual-entry path still uses it — a rep typing
 * a lead with no card has no details screen to record on.
 */
export default function VoiceNoteScreen() {
  const existingUri = useCaptureDraftStore((s) => s.voiceUri);
  const existingSeconds = useCaptureDraftStore((s) => s.voiceDurationSeconds);
  const existingExtension = useCaptureDraftStore((s) => s.voiceExtension);

  const [recording, setRecording] = useState<Recording | null>(
    existingUri
      ? { uri: existingUri, durationSeconds: existingSeconds, extension: existingExtension }
      : null
  );

  const attach = () => {
    if (!recording) return;
    useCaptureDraftStore.getState().setVoiceNote(recording);
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
      <ScreenHeader title="Voice note" />

      <VoiceRecorder
        variant="screen"
        existing={
          existingUri
            ? { uri: existingUri, durationSeconds: existingSeconds, extension: existingExtension }
            : null
        }
        onChange={setRecording}
      />

      <View className="bg-white border-t border-hairline px-5 pt-[14px] pb-6">
        {/* The disabled state carries the same shadow at zero alpha rather than
            no shadow at all. `shadow-*` compiles to a CSS variable, and
            NativeWind can only make a component a variable provider on its
            first render — so a button that gained its first shadow the moment
            the recording stopped sent react-native-css-interop down its
            upgrade-warning path, where its own prop stringifier throws
            "Couldn't find a navigation context" at you. See AGENTS.md. */}
        <Pressable
          onPress={attach}
          disabled={!recording}
          className={`h-[54px] rounded-md items-center justify-center ${
            recording
              ? 'bg-gold shadow-[0_10px_24px_rgba(244,176,0,0.30)]'
              : 'bg-surface shadow-[0_10px_24px_rgba(244,176,0,0)]'
          }`}
        >
          <Typography
            className={`text-[16px] font-bold ${recording ? 'text-navy' : 'text-slate'}`}
          >
            Attach to lead
          </Typography>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
