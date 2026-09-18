/**
 * What the play button on a voice note should do next.
 *
 * Split out of the card because the interesting part is a three-state decision
 * that a screenshot cannot show and a device test can only show one case at a
 * time. `scripts/verify-voice-replay.mjs` walks all of them.
 *
 * The bug this exists for: a note played to the end leaves the playhead at the
 * end of the file, and `play()` there finishes before it starts. The button
 * looked dead, and only leaving the screen fixed it — because that unmounted
 * the card and built a fresh player at position zero.
 */

/** The fields of expo-audio's `AudioStatus` that playback decisions read. */
export type VoicePlaybackStatus = {
  playing: boolean;
  /** Playback position in seconds. */
  currentTime: number;
  /** Total length in seconds, or 0 before the source has loaded. */
  duration: number;
  didJustFinish: boolean;
};

/**
 * `restart` has to seek to zero before playing. `resume` must not — a note
 * paused half way through carries on from where it stopped.
 */
export type VoicePressAction = 'pause' | 'resume' | 'restart';

/**
 * Reported positions stop a little short of the duration often enough to
 * matter, so the last quarter second counts as the end.
 */
const END_SLACK_SECONDS = 0.25;

/**
 * Whether the note is sitting at the end, and so needs rewinding before it
 * will play again.
 *
 * Both conditions are load-bearing, and which one fires depends on the
 * platform. Every expo-audio status event carries a full status with
 * `didJustFinish: false`, overlaid with whatever that event changed, and
 * `useAudioPlayerStatus` keeps the last event rather than merging — so the
 * flag survives only until the next event:
 *
 *   - Android emits it once on the transition into `STATE_ENDED` and then goes
 *     quiet, because the `playing: false` that follows is suppressed as
 *     transient. The flag stays true, so it is what fires
 *     (`BaseAudioPlayer.kt`, `onPlaybackStateChanged`).
 *   - iOS emits it from `AVPlayerItemDidPlayToEndTime`, but a periodic time
 *     observer fires when playback stops and sends `currentTime` over a fresh
 *     status — which clears the flag. There the position check is the only
 *     thing left (`AudioPlayer.swift`, `registerTimeObserver`).
 *   - Web maps it to `media.ended`, which is sticky until a seek.
 *
 * `didJustFinish` is trusted without a check on `playing`, since a player
 * claiming both has still reached the end. The position check has to require
 * `!playing`, or the last quarter second of every note would read as finished
 * while it is still playing.
 */
export function hasFinished(status: VoicePlaybackStatus): boolean {
  if (status.didJustFinish) return true;
  if (status.playing) return false;
  return status.duration > 0 && status.currentTime >= status.duration - END_SLACK_SECONDS;
}

export function pressAction(status: VoicePlaybackStatus): VoicePressAction {
  if (hasFinished(status)) return 'restart';
  return status.playing ? 'pause' : 'resume';
}

/**
 * How full the progress bar should be, 0 to 1. A finished note reads empty
 * rather than full, so the bar agrees with the play triangle about what the
 * next press will do.
 */
export function progressRatio(status: VoicePlaybackStatus): number {
  if (hasFinished(status)) return 0;
  if (!(status.duration > 0)) return 0;
  return Math.min(1, Math.max(0, status.currentTime / status.duration));
}
