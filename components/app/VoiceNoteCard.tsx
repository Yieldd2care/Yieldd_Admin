import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

import { Typography } from '../ui/Typography';
import { MicIcon, PlayIcon } from '../ui/icons';
import { signedUrl, VOICE_NOTES_BUCKET } from '../../lib/api/storage';
import { requestTranscription, type VoiceNote } from '../../lib/api/voiceNotes';

/**
 * A recorded note on the lead detail screen.
 *
 * The bucket is private, so playback needs a signed URL — which is exactly why
 * the row stores the object key rather than a URL. One saved months ago would
 * have expired, and after the project changed region it would have pointed at a
 * different database entirely.
 */
export function VoiceNoteCard({ note }: { note: VoiceNote }) {
  const [url, setUrl] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  const player = useAudioPlayer(url ? { uri: url } : null);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    let cancelled = false;
    void signedUrl(VOICE_NOTES_BUCKET, note.audioPath).then((value) => {
      if (!cancelled) setUrl(value);
    });
    return () => {
      cancelled = true;
    };
  }, [note.audioPath]);

  const duration = note.durationSeconds ?? 0;
  const label = `${String(Math.floor(duration / 60)).padStart(2, '0')}:${String(duration % 60).padStart(2, '0')}`;

  const retry = async () => {
    setRetrying(true);
    await requestTranscription(note.id);
    setRetrying(false);
  };

  return (
    <View className="bg-white border border-hairline rounded-2xl p-4 mt-[18px]">
      <View className="flex-row items-center gap-2 mb-3">
        <MicIcon size={14} color="#0B132B" strokeWidth={2} />
        <Typography className="text-[12.5px] font-bold text-navy">Voice note</Typography>
        <Typography className="text-[11.5px] text-slate ml-auto">{label}</Typography>
      </View>

      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={() => (status.playing ? player.pause() : player.play())}
          disabled={!url}
          className={`w-[38px] h-[38px] rounded-full bg-navy items-center justify-center ${url ? '' : 'opacity-40'}`}
        >
          {status.playing ? (
            <View className="w-[11px] h-[11px] rounded-[2px] bg-white" />
          ) : (
            <PlayIcon size={13} />
          )}
        </Pressable>

        {/* A real progress bar, not a decorative waveform. It tells the rep
            where they are in the recording, which the old fixed bars did not. */}
        <View className="flex-1 h-2 rounded-full bg-surface overflow-hidden">
          <View
            className="h-full rounded-full bg-gold"
            style={{
              width: `${
                status.duration ? Math.min(100, (status.currentTime / status.duration) * 100) : 0
              }%`,
            }}
          />
        </View>
      </View>

      {note.status === 'completed' && note.summary ? (
        <View className="bg-section rounded-[10px] px-[14px] py-3 mt-[14px]">
          <Typography className="text-[10px] font-bold tracking-[0.1em] text-blue mb-[6px]" style={{ textTransform: 'uppercase' }}>
            Summary
          </Typography>
          <Typography className="text-[12.5px] font-medium text-navy" style={{ lineHeight: 19 }}>
            {note.summary}
          </Typography>
        </View>
      ) : null}

      {note.status === 'completed' && note.transcript ? (
        <View className="mt-3">
          <Typography className="text-[10px] font-bold tracking-[0.1em] text-slate mb-[6px]" style={{ textTransform: 'uppercase' }}>
            Transcript
          </Typography>
          <Typography className="text-[12.5px] text-slate" style={{ lineHeight: 18.5 }}>
            {note.transcript}
          </Typography>
        </View>
      ) : null}

      {note.status === 'completed' && !note.transcript ? (
        <Typography className="text-[12.5px] text-slate mt-3 leading-[1.5]">
          Nothing audible in this recording. You can still play it back.
        </Typography>
      ) : null}

      {note.status === 'pending' || note.status === 'processing' ? (
        <View className="flex-row items-center gap-2 mt-3">
          <ActivityIndicator size="small" color="#F4B000" />
          <Typography className="text-[12.5px] text-slate">
            Writing up the transcript&#8230;
          </Typography>
        </View>
      ) : null}

      {note.status === 'failed' ? (
        <View className="mt-3">
          <Typography className="text-[12.5px] text-slate leading-[1.5]">
            The transcript didn&rsquo;t come through. The recording is safe &mdash; play it above.
          </Typography>
          <Pressable onPress={retry} disabled={retrying} className="mt-2">
            <Typography className="text-[12.5px] font-bold text-gold">
              {retrying ? 'Trying again…' : 'Try again'}
            </Typography>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
