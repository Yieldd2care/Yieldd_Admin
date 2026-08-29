import { randomUUID } from 'expo-crypto';

import { supabase } from '../supabase';
import type { Tables } from '../db';
import { uploadVoiceNote, voiceNotePath } from './storage';

type VoiceNoteRow = Tables<'voice_notes'>;

export type VoiceNote = {
  id: string;
  leadId: string;
  audioPath: string;
  durationSeconds: number | null;
  transcript: string | null;
  summary: string | null;
  status: VoiceNoteRow['transcription_status'];
  transcribedAt: string | null;
};

function toVoiceNote(row: VoiceNoteRow): VoiceNote {
  return {
    id: row.id,
    leadId: row.lead_id,
    audioPath: row.audio_path,
    durationSeconds: row.duration_seconds,
    transcript: row.transcript,
    summary: row.summary,
    status: row.transcription_status,
    transcribedAt: row.transcribed_at,
  };
}

/**
 * Whether this organisation may record another voice note.
 *
 * The Free plan includes three, org-wide. Asking first means the rep meets the
 * limit before they speak into the phone, rather than after — losing a recorded
 * note to an upsell would be an unforgivable way to learn about a price.
 *
 * Errs towards allowing it: if the check itself fails, the INSERT policy is
 * still the real gate, so the worst case is the refusal arriving a moment later.
 */
export async function canRecordVoiceNote(): Promise<boolean> {
  const { data, error } = await supabase.rpc('can_use_ai');
  if (error) {
    if (__DEV__) console.warn('[voiceNotes] can_use_ai', error);
    return true;
  }
  return data !== false;
}

export type AttachOutcome =
  | { ok: true; voiceNote: VoiceNote }
  | { ok: false; message: string; reason: 'limit' | 'permission' | 'network' | 'file' };

/**
 * Attaches a recording to a lead.
 *
 * Order is forced by the bucket policy, which joins back to the `voice_notes`
 * row: the row has to exist carrying its object key before storage will accept
 * the audio. So — row, then file, then transcription.
 *
 * The Free plan allows three voice notes per organisation, and that limit lives
 * in `can_use_ai()` inside the INSERT policy rather than in this file. A refusal
 * therefore arrives as a bare 42501, and the only honest way to tell "you've
 * used your three" from "you're not allowed" is to ask which one it was.
 */
export async function attachVoiceNote(input: {
  leadId: string;
  organizationId: string;
  recordedBy: string;
  uri: string;
  durationSeconds: number;
  /** `.m4a` on a phone, `.webm` in a browser. */
  extension?: string;
}): Promise<AttachOutcome> {
  const id = randomUUID();
  const path = voiceNotePath(input.organizationId, id, input.extension);

  const { data, error } = await supabase
    .from('voice_notes')
    .insert({
      id,
      lead_id: input.leadId,
      recorded_by: input.recordedBy,
      audio_path: path,
      duration_seconds: Math.max(1, Math.round(input.durationSeconds)),
    })
    .select()
    .single();

  if (error) {
    if (error.code === '42501') {
      // The policy is `recorded_by = auth.uid() AND same org AND can_use_ai()`.
      // The first two are true by construction here, so a refusal is the plan
      // limit — which is an upsell, not an error.
      return {
        ok: false,
        reason: 'limit',
        message:
          'Your free plan includes three voice notes. Upgrade to record them on every lead.',
      };
    }
    if (__DEV__) console.warn('[voiceNotes] insert', error);
    return { ok: false, reason: 'network', message: "That recording didn't attach. Try again." };
  }

  const upload = await uploadVoiceNote(input.organizationId, id, input.uri, input.extension);
  if (!upload.ok) {
    // The row without its audio is useless and would leave a lead claiming to
    // have a voice note that cannot be played. Take it back out.
    await supabase.from('voice_notes').delete().eq('id', id);
    return {
      ok: false,
      reason: upload.permanent ? 'file' : 'network',
      message: upload.message,
    };
  }

  return { ok: true, voiceNote: toVoiceNote(data as VoiceNoteRow) };
}

/**
 * Asks the server to transcribe it.
 *
 * Deliberately fire-and-forget. The rep has already walked away; if this call
 * never lands, the recording is still attached and playable, and the transcript
 * can be requested again from the lead.
 */
export async function requestTranscription(voiceNoteId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('transcribe-voice-note', {
    body: { voice_note_id: voiceNoteId },
  });
  if (error && __DEV__) console.warn('[voiceNotes] transcribe', error);
}

export async function fetchVoiceNotes(leadId: string): Promise<VoiceNote[]> {
  const { data, error } = await supabase
    .from('voice_notes')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data as VoiceNoteRow[]).map(toVoiceNote);
}

export async function deleteVoiceNote(id: string): Promise<void> {
  const { error } = await supabase.from('voice_notes').delete().eq('id', id);
  if (error) throw new Error('That recording could not be removed.');
}
