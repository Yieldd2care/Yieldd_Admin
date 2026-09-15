import { memo, useEffect } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { router } from 'expo-router';

import { Typography } from '../ui/Typography';
import { MicIcon, PlayIcon, TrashIcon } from '../ui/icons';
import { formatDuration, useVoiceRecorder, type Recording } from '../../hooks/useVoiceRecorder';

/**
 * The voice recorder, in the two shapes the app needs it.
 *
 * `screen` is the original full-bleed treatment, still used by the standalone
 * route that the manual-entry path pushes to. `inline` is a card that sits in
 * the middle of the new capture details screen, between the card preview and
 * the event fields.
 *
 * ---------------------------------------------------------------------------
 * Why this is memoised, and why the hook is called HERE
 *
 * `useVoiceRecorder` polls the recorder ten times a second while recording, so
 * whichever component calls it re-renders at 10Hz. That has to be this one and
 * not the details screen, which is a ScrollView full of text inputs — a rep
 * typing into a custom field while a note records would be fighting a re-render
 * of the whole form on every keystroke.
 *
 * It is also an AGENTS.md hazard, not merely a performance one: a continuously
 * re-rendering tree is what catches NativeWind mid-upgrade and produces the
 * bogus "Couldn't find a navigation context" red screen, which costs hours
 * because it names something that is not wrong.
 *
 * `onChange` therefore fires only on the transitions — a finished recording, or
 * a discard — never on the live ticks.
 * ---------------------------------------------------------------------------
 */

type Props = {
  variant: 'screen' | 'inline';
  /** What is already attached, so returning to the screen does not start over. */
  existing?: Recording | null;
  /** Fires once per settled state: a finished recording, or null on discard. */
  onChange: (recording: Recording | null) => void;
};

function VoiceRecorderImpl({ variant, existing, onChange }: Props) {
  const rec = useVoiceRecorder(existing);
  const inline = variant === 'inline';

  // Report the settled recording upward. Keyed on the object identity the hook
  // hands back, which only changes on stop and discard — never on a tick.
  useEffect(() => {
    onChange(rec.recording);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec.recording]);

  if (rec.status === 'checking') {
    return inline ? (
      <View className="h-[76px] rounded-md border border-hairline bg-white items-center justify-center">
        <Typography className="text-[13px] text-slate">Checking…</Typography>
      </View>
    ) : (
      <View className="flex-1 items-center justify-center">
        <Typography className="text-[13px] text-slate">Checking…</Typography>
      </View>
    );
  }

  /**
   * The Free-plan cap.
   *
   * On the details screen this must NOT take over — the rep still has a card, a
   * product photo and event fields to submit, and a plan limit on one optional
   * extra is no reason to block the capture. So inline it is a compact row and
   * everything around it stays usable.
   */
  if (rec.status === 'locked') {
    return inline ? (
      <View className="rounded-md border border-hairline bg-white px-4 py-[14px] flex-row items-center gap-3">
        <MicIcon size={16} color="#8A6100" />
        <View className="flex-1">
          <Typography className="text-[13px] font-semibold text-navy">
            You&rsquo;ve used your three voice notes
          </Typography>
          <Typography className="text-[11.5px] text-slate mt-[2px] leading-[1.45]">
            Upgrade to record one on every lead.
          </Typography>
        </View>
        <Pressable
          onPress={() => router.push('/(app)/(modals)/upgrade')}
          className="bg-gold rounded-full px-4 py-2"
        >
          <Typography className="text-[12.5px] font-bold text-navy">See Pro</Typography>
        </Pressable>
      </View>
    ) : (
      <View className="flex-1 items-center justify-center px-9 gap-4">
        <Typography className="text-[17px] font-extrabold text-navy text-center">
          You&rsquo;ve used your three voice notes
        </Typography>
        <Typography className="text-[13.5px] text-slate text-center leading-[1.55]">
          The free plan includes three, so you can hear what they sound like. Upgrade to record one
          on every lead &mdash; each gets a transcript and a summary you can read before you call
          back.
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
    );
  }

  if (rec.status === 'denied') {
    return inline ? (
      <View className="rounded-md border border-hairline bg-white px-4 py-[14px] flex-row items-center gap-3">
        <MicIcon size={16} color="#8A6100" />
        <View className="flex-1">
          <Typography className="text-[13px] font-semibold text-navy">
            Microphone access is off
          </Typography>
          <Typography className="text-[11.5px] text-slate mt-[2px] leading-[1.45]">
            Turn it on for Yieldd to record a note.
          </Typography>
        </View>
        <Pressable
          onPress={() => void Linking.openSettings()}
          className="bg-white border border-hairline rounded-full px-4 py-2"
        >
          <Typography className="text-[12.5px] font-bold text-navy">Settings</Typography>
        </Pressable>
      </View>
    ) : (
      <View className="flex-1 items-center justify-center px-9 gap-4">
        <Typography className="text-[15px] font-bold text-navy text-center">
          Microphone access is off
        </Typography>
        <Typography className="text-[13px] text-slate text-center leading-[1.5]">
          Voice notes need the microphone. Turn it on for Yieldd in your phone&rsquo;s settings, or
          type the details on the lead instead.
        </Typography>
        {/* Once the microphone has been denied the OS will not ask again, so
            this link is the only route back. */}
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
    );
  }

  const isRecording = rec.status === 'recording';
  const hasRecording = rec.status === 'recorded';

  const press = () => {
    if (isRecording) return void rec.stop();
    if (hasRecording) return rec.togglePlay();
    return void rec.start();
  };

  if (inline) {
    return (
      <View className="rounded-md border border-hairline bg-white px-4 py-[14px]">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={press}
            disabled={rec.isBusy}
            className={`w-[46px] h-[46px] rounded-full bg-gold items-center justify-center shadow-[0_8px_18px_rgba(244,176,0,0.30)] ${
              rec.isBusy ? 'opacity-60' : ''
            }`}
          >
            {isRecording ? (
              <View className="w-[14px] h-[14px] rounded-[3px] bg-navy" />
            ) : hasRecording ? (
              <PlayIcon size={16} color="#0B132B" />
            ) : (
              <MicIcon size={18} color="#0B132B" />
            )}
          </Pressable>

          <View className="flex-1">
            <Typography className="text-[13.5px] font-semibold text-navy">
              {isRecording ? 'Recording…' : hasRecording ? 'Voice note attached' : 'Add a voice note'}
            </Typography>
            <Typography
              className="text-[11.5px] text-slate mt-[2px]"
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {isRecording || hasRecording
                ? formatDuration(rec.seconds)
                : `Up to ${rec.maxSeconds / 60} minutes`}
            </Typography>
          </View>

          {hasRecording && !isRecording ? (
            <Pressable
              onPress={() => rec.discard()}
              className="w-[38px] h-[38px] rounded-full bg-white border border-hairline items-center justify-center"
            >
              <TrashIcon />
            </Pressable>
          ) : null}
        </View>

        {isRecording ? (
          <View className="flex-row items-center gap-1 h-8 mt-3">
            {rec.levels.map((h, i) => (
              <View
                key={i}
                className={`flex-1 rounded-[2px] ${h > 14 ? 'bg-gold' : 'bg-hairline'}`}
                style={{ height: Math.max(4, h * 0.5) }}
              />
            ))}
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center px-8 gap-[34px]">
      <View className="items-center">
        <Typography
          className="text-[44px] font-extrabold text-navy tracking-[-0.01em]"
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {formatDuration(rec.seconds)}
        </Typography>
        <Typography
          className="text-[12px] font-bold tracking-[0.10em] text-slate -mt-[6px]"
          style={{ textTransform: 'uppercase' }}
        >
          {isRecording ? 'Recording' : hasRecording ? 'Recorded' : 'Tap to record'}
        </Typography>
      </View>

      <View className="flex-row items-center gap-1 h-14">
        {rec.levels.map((h, i) => (
          <View
            key={i}
            className={`w-1 rounded-[3px] ${isRecording && h > 14 ? 'bg-gold' : 'bg-hairline'}`}
            style={{ height: h }}
          />
        ))}
      </View>

      <View className="relative w-[100px] h-[100px] items-center justify-center">
        <View className="absolute inset-0 rounded-full border-2 border-gold/[0.25]" />
        <Pressable
          onPress={press}
          disabled={rec.isBusy}
          className={`w-[76px] h-[76px] rounded-full bg-gold items-center justify-center shadow-[0_14px_30px_rgba(244,176,0,0.38)] ${
            rec.isBusy ? 'opacity-60' : ''
          }`}
        >
          {isRecording ? (
            <View className="w-6 h-6 rounded-md bg-navy" />
          ) : hasRecording ? (
            <PlayIcon size={22} color="#0B132B" />
          ) : (
            <View className="w-6 h-6 rounded-full bg-navy" />
          )}
        </Pressable>
      </View>

      <View className="flex-row items-center gap-7 h-[46px]">
        {hasRecording ? (
          <>
            <Pressable
              onPress={() => void rec.start()}
              className="h-[46px] px-5 rounded-full bg-white border border-hairline items-center justify-center"
            >
              <Typography className="text-[13px] font-bold text-navy">Record again</Typography>
            </Pressable>
            <Pressable
              onPress={() => rec.discard()}
              className="w-[46px] h-[46px] rounded-full bg-white border border-hairline items-center justify-center"
            >
              <TrashIcon />
            </Pressable>
          </>
        ) : null}
      </View>

      <Typography className="text-[11.5px] text-placeholder text-center">
        Up to {rec.maxSeconds / 60} minutes. The transcript and summary arrive after you save the
        lead.
      </Typography>
    </View>
  );
}

export const VoiceRecorder = memo(VoiceRecorderImpl);
