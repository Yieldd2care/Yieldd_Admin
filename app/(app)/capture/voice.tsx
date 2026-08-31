import { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Platform, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';

import { Typography } from '../../../components/ui/Typography';
import { ScreenHeader } from '../../../components/app/ScreenHeader';
import { PlayIcon, TrashIcon } from '../../../components/ui/icons';
import { useCaptureDraftStore } from '../../../stores/useCaptureDraftStore';
import { canRecordVoiceNote } from '../../../lib/api/voiceNotes';

/**
 * Recording a voice note at the stall.
 *
 * The whole screen used to be a prop: a fixed 00:14, a fixed waveform, and a
 * button that toggled a boolean. It now records real audio, and the recording
 * is attached to the lead when the lead is saved — not before, because the
 * storage policy joins back to a `voice_notes` row that does not exist yet.
 *
 * Two minutes is the cap. Nobody transcribes a ten-minute ramble, and a large
 * file on hall wifi is a sync that never finishes.
 */
const MAX_SECONDS = 120;

/** Mono, 22 kHz, 64 kbps AAC — speech, not music. A two-minute note is ~1 MB. */
const SPEECH_PRESET = {
  ...RecordingPresets.HIGH_QUALITY,
  sampleRate: 22050,
  numberOfChannels: 1,
  bitRate: 64000,
};

const BAR_COUNT = 28;

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function VoiceNoteScreen() {
  const recorder = useAudioRecorder(SPEECH_PRESET);
  const state = useAudioRecorderState(recorder, 100);

  const [permissionDenied, setPermissionDenied] = useState(false);
  const [locked, setLocked] = useState(false);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [recordedSeconds, setRecordedSeconds] = useState(0);
  const [levels, setLevels] = useState<number[]>(() => Array(BAR_COUNT).fill(6));
  const [isBusy, setIsBusy] = useState(false);

  const player = useAudioPlayer(recordedUri ? { uri: recordedUri } : null);

  const existingUri = useCaptureDraftStore((s) => s.voiceUri);
  const existingSeconds = useCaptureDraftStore((s) => s.voiceDurationSeconds);

  // Coming back to the screen shows what is already attached rather than
  // silently starting a second recording over the top of it.
  useEffect(() => {
    if (existingUri && !recordedUri) {
      setRecordedUri(existingUri);
      setRecordedSeconds(existingSeconds);
    }
  }, [existingUri, existingSeconds, recordedUri]);

  // Asked before the microphone, so the rep meets a plan limit before they
  // speak rather than after.
  useEffect(() => {
    let cancelled = false;
    void canRecordVoiceNote().then((allowed) => {
      if (!cancelled && !allowed) setLocked(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void (async () => {
      const { granted } = await AudioModule.requestRecordingPermissionsAsync();
      if (!granted) {
        setPermissionDenied(true);
        return;
      }
      // Without this, iOS records at a whisper and plays back through the
      // earpiece rather than the speaker.
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    })();
  }, []);

  const seconds = state.isRecording ? (state.durationMillis ?? 0) / 1000 : recordedSeconds;

  // A moving bar chart from the recorder's own level meter. It is not a real
  // waveform of the file — it is what the microphone is hearing right now,
  // which is the only thing the rep needs: proof it is picking them up.
  const lastPush = useRef(0);
  useEffect(() => {
    if (!state.isRecording) return;
    const now = Date.now();
    if (now - lastPush.current < 90) return;
    lastPush.current = now;

    // metering is dBFS: roughly -60 (silence) to 0 (clipping).
    const db = state.metering ?? -60;
    const level = Math.max(0, Math.min(1, (db + 60) / 60));
    setLevels((prev) => [...prev.slice(1), 6 + level * 46]);
  }, [state.metering, state.isRecording, state.durationMillis]);

  // Hard stop at two minutes rather than letting it run.
  useEffect(() => {
    if (state.isRecording && seconds >= MAX_SECONDS) void stopRecording();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, state.isRecording]);

  const startRecording = async () => {
    if (isBusy) return;
    setIsBusy(true);
    try {
      setLevels(Array(BAR_COUNT).fill(6));
      setRecordedUri(null);
      setRecordedSeconds(0);
      await recorder.prepareToRecordAsync(SPEECH_PRESET);
      recorder.record();
    } catch {
      Alert.alert('Could not record', 'The microphone is not available right now.');
    } finally {
      setIsBusy(false);
    }
  };

  const stopRecording = async () => {
    if (isBusy) return;
    setIsBusy(true);
    try {
      const elapsed = (state.durationMillis ?? 0) / 1000;
      await recorder.stop();
      const uri = recorder.uri;
      if (uri) {
        setRecordedUri(uri);
        setRecordedSeconds(Math.max(1, elapsed));
      }
    } catch {
      Alert.alert('Could not save', 'The recording was lost. Try again.');
    } finally {
      setIsBusy(false);
    }
  };

  const discard = () => {
    setRecordedUri(null);
    setRecordedSeconds(0);
    setLevels(Array(BAR_COUNT).fill(6));
    useCaptureDraftStore.getState().setVoiceNote(null);
  };

  const attach = () => {
    if (!recordedUri) return;
    useCaptureDraftStore.getState().setVoiceNote({
      uri: recordedUri,
      durationSeconds: recordedSeconds,
      // HIGH_QUALITY yields m4a on a phone and webm in a browser; both are on
      // the bucket's allow list, but the object key has to match.
      extension: Platform.OS === 'web' ? '.webm' : '.m4a',
    });
    router.back();
  };

  if (locked) {
    return (
      <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
        <ScreenHeader title="Voice note" />
        <View className="flex-1 items-center justify-center px-9 gap-4">
          <Typography className="text-[17px] font-extrabold text-navy text-center">
            You&rsquo;ve used your three voice notes
          </Typography>
          <Typography className="text-[13.5px] text-slate text-center leading-[1.55]">
            The free plan includes three, so you can hear what they sound like. Upgrade to record
            one on every lead &mdash; each gets a transcript and a summary you can read before you
            call back.
          </Typography>
          <Pressable
            onPress={() => router.push('/(app)/(modals)/upgrade')}
            className="bg-gold rounded-full px-6 py-3 mt-2"
          >
            <Typography className="text-[14px] font-bold text-navy">See Pro</Typography>
          </Pressable>
          <Pressable onPress={() => router.back()}>
            <Typography className="text-[13px] font-semibold text-slate">
              Type a note instead
            </Typography>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (permissionDenied) {
    return (
      <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
        <ScreenHeader title="Voice note" />
        <View className="flex-1 items-center justify-center px-9 gap-4">
          <Typography className="text-[15px] font-bold text-navy text-center">
            Microphone access is off
          </Typography>
          <Typography className="text-[13px] text-slate text-center leading-[1.5]">
            Voice notes need the microphone. Turn it on for Yieldd in your phone&rsquo;s settings,
            or type the details on the lead instead.
          </Typography>
          {/* It said "go to your settings" and then offered no way to get
              there. Once the microphone has been denied the OS will not ask
              again, so this link is the only route back. */}
          <Pressable
            onPress={() => void Linking.openSettings()}
            className="bg-gold rounded-full px-6 py-3 mt-2"
          >
            <Typography className="text-[14px] font-bold text-navy">Open settings</Typography>
          </Pressable>
          <Pressable onPress={() => router.back()}>
            <Typography className="text-[13px] font-semibold text-slate">Go back</Typography>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const hasRecording = Boolean(recordedUri);

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
      <ScreenHeader title="Voice note" />

      <View className="flex-1 items-center justify-center px-8 gap-[34px]">
        <View className="items-center">
          <Typography
            className="text-[44px] font-extrabold text-navy tracking-[-0.01em]"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {formatDuration(seconds)}
          </Typography>
          <Typography
            className="text-[12px] font-bold tracking-[0.10em] text-slate -mt-[6px]"
            style={{ textTransform: 'uppercase' }}
          >
            {state.isRecording ? 'Recording' : hasRecording ? 'Recorded' : 'Tap to record'}
          </Typography>
        </View>

        <View className="flex-row items-center gap-1 h-14">
          {levels.map((h, i) => (
            <View
              key={i}
              className={`w-1 rounded-[3px] ${state.isRecording && h > 14 ? 'bg-gold' : 'bg-hairline'}`}
              style={{ height: h }}
            />
          ))}
        </View>

        <View className="relative w-[100px] h-[100px] items-center justify-center">
          <View className="absolute inset-0 rounded-full border-2 border-gold/[0.25]" />
          <Pressable
            onPress={() => {
              if (state.isRecording) return void stopRecording();
              if (hasRecording) return player.playing ? player.pause() : player.play();
              return void startRecording();
            }}
            disabled={isBusy}
            className={`w-[76px] h-[76px] rounded-full bg-gold items-center justify-center shadow-[0_14px_30px_rgba(244,176,0,0.38)] ${isBusy ? 'opacity-60' : ''}`}
          >
            {state.isRecording ? (
              <View className="w-6 h-6 rounded-md bg-navy" />
            ) : hasRecording ? (
              <PlayIcon size={22} color="#0B132B" />
            ) : (
              <View className="w-6 h-6 rounded-full bg-navy" />
            )}
          </Pressable>
        </View>

        <View className="flex-row items-center gap-7 h-[46px]">
          {hasRecording && !state.isRecording ? (
            <>
              <Pressable
                onPress={() => void startRecording()}
                className="h-[46px] px-5 rounded-full bg-white border border-hairline items-center justify-center"
              >
                <Typography className="text-[13px] font-bold text-navy">Record again</Typography>
              </Pressable>
              <Pressable
                onPress={discard}
                className="w-[46px] h-[46px] rounded-full bg-white border border-hairline items-center justify-center"
              >
                <TrashIcon />
              </Pressable>
            </>
          ) : null}
        </View>

        <Typography className="text-[11.5px] text-placeholder text-center">
          Up to {MAX_SECONDS / 60} minutes. The transcript and summary arrive after you save the lead.
        </Typography>
      </View>

      <View className="bg-white border-t border-hairline px-5 pt-[14px] pb-6">
        <Pressable
          onPress={attach}
          disabled={!hasRecording || state.isRecording}
          className={`h-[54px] rounded-md items-center justify-center ${
            hasRecording && !state.isRecording
              ? 'bg-gold shadow-[0_10px_24px_rgba(244,176,0,0.30)]'
              : 'bg-surface'
          }`}
        >
          <Typography
            className={`text-[16px] font-bold ${hasRecording && !state.isRecording ? 'text-navy' : 'text-slate'}`}
          >
            Attach to lead
          </Typography>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
