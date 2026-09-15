import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';

import { canRecordVoiceNote } from '../lib/api/voiceNotes';
import { persistCapture } from '../lib/captureFiles';

/**
 * Recording a voice note, with no opinion about where it is rendered.
 *
 * Lifted out of `app/(app)/capture/voice.tsx` when the capture rework put a
 * recorder inline on the details screen alongside the event fields. The screen
 * could not simply be reused: it owned the capture-draft store and called
 * `router.back()` when it was done, neither of which makes sense in a slot
 * halfway down a form. What was worth keeping was everything else — the
 * metering, the two-minute cap, the permission and plan gates, the playback.
 *
 * So this knows nothing about zustand or expo-router. It records, and it tells
 * you what it has.
 *
 * ---------------------------------------------------------------------------
 * A warning about where this is called from
 *
 * `useAudioRecorderState(recorder, 100)` re-renders its owner ten times a
 * second for the whole recording. On a dedicated screen that is free. On the
 * details screen it is not: that screen is a ScrollView full of text inputs,
 * and a 10Hz re-render competing with every keystroke is both janky and — per
 * AGENTS.md — exactly the continuous-re-render condition that trips
 * NativeWind's mid-life component upgrade and throws the completely unrelated
 * "Couldn't find a navigation context" red screen.
 *
 * So this hook belongs inside `components/capture/VoiceRecorder.tsx`, which is
 * memoised, and never in the screen that renders it. Lift the finished
 * recording out once, on stop or discard; never the live state.
 */

/**
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
const FLOOR = 6;

export type Recording = {
  uri: string;
  durationSeconds: number;
  /** `.m4a` on a phone, `.webm` in a browser. The object key has to match. */
  extension: string;
};

export type RecorderStatus =
  | 'checking'
  | 'locked'
  | 'denied'
  | 'idle'
  | 'recording'
  | 'recorded';

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function useVoiceRecorder(existing?: Recording | null) {
  const recorder = useAudioRecorder(SPEECH_PRESET);
  const state = useAudioRecorderState(recorder, 100);

  const [permissionDenied, setPermissionDenied] = useState(false);
  const [locked, setLocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const [recording, setRecording] = useState<Recording | null>(existing ?? null);
  const [levels, setLevels] = useState<number[]>(() => Array(BAR_COUNT).fill(FLOOR));
  const [isBusy, setIsBusy] = useState(false);

  const player = useAudioPlayer(recording ? { uri: recording.uri } : null);

  /**
   * The audio session is claimed on the first record, not on mount.
   *
   * The old screen did this on mount, which was harmless when the screen
   * existed only to record. Inline on the details screen it would seize the
   * audio session — ducking whatever the rep was listening to — merely because
   * they opened a form. Released again on unmount for the same reason.
   */
  const sessionClaimed = useRef(false);

  useEffect(() => {
    return () => {
      if (sessionClaimed.current) {
        void setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      }
    };
  }, []);

  /**
   * The plan gate, asked before the microphone.
   *
   * Deliberately first: a rep on the Free plan who has used their three notes
   * should meet that limit before they start talking, not after.
   */
  useEffect(() => {
    let cancelled = false;
    void canRecordVoiceNote()
      .then((allowed) => {
        if (cancelled) return;
        if (!allowed) setLocked(true);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const seconds = state.isRecording
    ? (state.durationMillis ?? 0) / 1000
    : (recording?.durationSeconds ?? 0);

  /**
   * A moving bar chart from the recorder's own level meter. Not a real waveform
   * of the file — it is what the microphone is hearing right now, which is the
   * only thing the rep needs: proof it is picking them up.
   */
  const lastPush = useRef(0);
  useEffect(() => {
    if (!state.isRecording) return;
    const now = Date.now();
    if (now - lastPush.current < 90) return;
    lastPush.current = now;

    // metering is dBFS: roughly -60 (silence) to 0 (clipping).
    const db = state.metering ?? -60;
    const level = Math.max(0, Math.min(1, (db + 60) / 60));
    setLevels((prev) => [...prev.slice(1), FLOOR + level * 46]);
  }, [state.metering, state.isRecording, state.durationMillis]);

  const stop = useCallback(async (): Promise<Recording | null> => {
    if (isBusy) return null;
    setIsBusy(true);
    try {
      // Read before stopping: `stop()` resets the state this comes from.
      const elapsed = (state.durationMillis ?? 0) / 1000;
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) return null;

      /**
       * Copied out of the OS cache before anyone is told it exists.
       *
       * The recorder writes into the cache directory, which the system may
       * reclaim. Under the new flow a capture can sit on the device for hours
       * waiting for a signal, so the recording has to outlive that.
       */
      const durable = await persistCapture(uri, `voice${Platform.OS === 'web' ? '.webm' : '.m4a'}`);

      const next: Recording = {
        uri: durable,
        durationSeconds: Math.max(1, elapsed),
        extension: Platform.OS === 'web' ? '.webm' : '.m4a',
      };
      setRecording(next);
      return next;
    } catch {
      Alert.alert('Could not save', 'The recording was lost. Try again.');
      return null;
    } finally {
      setIsBusy(false);
    }
  }, [isBusy, recorder, state.durationMillis]);

  // Hard stop at two minutes rather than letting it run.
  useEffect(() => {
    if (state.isRecording && seconds >= MAX_SECONDS) void stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, state.isRecording]);

  const start = useCallback(async () => {
    if (isBusy || locked) return;
    setIsBusy(true);
    try {
      if (!sessionClaimed.current) {
        const { granted } = await AudioModule.requestRecordingPermissionsAsync();
        if (!granted) {
          setPermissionDenied(true);
          return;
        }
        // Without this, iOS records at a whisper and plays back through the
        // earpiece rather than the speaker.
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        sessionClaimed.current = true;
      }

      setLevels(Array(BAR_COUNT).fill(FLOOR));
      setRecording(null);
      await recorder.prepareToRecordAsync(SPEECH_PRESET);
      recorder.record();
    } catch {
      Alert.alert('Could not record', 'The microphone is not available right now.');
    } finally {
      setIsBusy(false);
    }
  }, [isBusy, locked, recorder]);

  const discard = useCallback(() => {
    setRecording(null);
    setLevels(Array(BAR_COUNT).fill(FLOOR));
  }, []);

  const togglePlay = useCallback(() => {
    if (!recording) return;
    if (player.playing) player.pause();
    else player.play();
  }, [player, recording]);

  const status: RecorderStatus = checking
    ? 'checking'
    : locked
      ? 'locked'
      : permissionDenied
        ? 'denied'
        : state.isRecording
          ? 'recording'
          : recording
            ? 'recorded'
            : 'idle';

  return {
    status,
    seconds,
    levels,
    isBusy,
    isPlaying: player.playing,
    recording,
    maxSeconds: MAX_SECONDS,
    start,
    stop,
    discard,
    togglePlay,
  };
}
