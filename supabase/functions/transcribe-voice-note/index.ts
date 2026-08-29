// Turns a recorded voice note into a transcript and a short summary.
//
// Runs after the lead is already saved and the audio is already in the bucket,
// so nobody is waiting on it. MVP_PLAN is explicit about the bar here: judge it
// on whether the summary is useful, not on whether the transcript is
// word-perfect. A rep mumbling into a phone on a loud show floor will never
// transcribe cleanly, and that is fine as long as "wants a quote by Friday,
// budget around 40 lakhs" comes out the other end.
//
// Two clients are used deliberately:
//   - the CALLER's token, to check they are allowed to touch this voice note.
//     That check is row-level security doing its own job rather than this
//     function re-implementing it and getting it subtly wrong.
//   - the service role, to read the audio and write the result. The audio
//     bucket is private and the row's UPDATE is not something the app grants
//     to a rep.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

const DEEPGRAM_API_KEY = Deno.env.get('DEEPGRAM_API_KEY');
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

// `multi` rather than `en-IN`: reps at an Indian trade show switch between
// English and Hindi mid-sentence, and nova-3's multilingual mode handles that
// code-switching. On clean English it transcribed identically to `en-IN` in
// testing, so the only cost is a second or two on a job nobody waits for.
const DEEPGRAM_MODEL = Deno.env.get('DEEPGRAM_MODEL') ?? 'nova-3';
const DEEPGRAM_LANGUAGE = Deno.env.get('DEEPGRAM_LANGUAGE') ?? 'multi';

// Summarising a transcript is a plain text task with no reading-a-photo risk,
// so the cheap fast model is the right default here — unlike card extraction,
// where a misread digit is unrecoverable.
const SUMMARY_MODEL = Deno.env.get('VOICE_SUMMARY_MODEL') ?? 'claude-haiku-4-5-20251001';

const SUMMARY_PROMPT = `You summarise a sales rep's spoken note about someone they just met at a trade show stall.

Write two or three short sentences covering only what is actually in the note:
what the person wants, any quantity, budget or timeline mentioned, and what the
rep said they would do next.

Rules:
- Use only what is in the transcript. Never add a detail that is not there.
- Keep numbers, quantities and dates exactly as spoken.
- Write it for the rep to read in four seconds before they call. No preamble,
  no "the rep says", no bullet points, no heading.
- If the transcript is empty, inaudible, or has nothing about a customer in it,
  reply with exactly: No usable detail in this note.`;

type VoiceNoteRow = {
  id: string;
  lead_id: string;
  audio_path: string;
  transcription_status: string;
};

async function markFailed(service: ReturnType<typeof createClient>, id: string) {
  await service
    .from('voice_notes')
    .update({ transcription_status: 'failed' })
    .eq('id', id);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !serviceKey || !anonKey) {
    console.error('project environment is incomplete');
    return jsonResponse({ error: 'Transcription is not configured.' }, 503);
  }
  if (!DEEPGRAM_API_KEY) {
    console.error('DEEPGRAM_API_KEY is not set on this project');
    return jsonResponse({ error: 'Transcription is not configured.' }, 503);
  }

  let body: { voice_note_id?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Expected a JSON body.' }, 400);
  }
  const voiceNoteId = body.voice_note_id;
  if (!voiceNoteId) return jsonResponse({ error: 'No voice note was given.' }, 400);

  const authHeader = req.headers.get('Authorization') ?? '';
  const caller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const service = createClient(supabaseUrl, serviceKey);

  // Row-level security answers "may this person touch this note?" — the caller
  // simply cannot select a row they have no business seeing.
  const { data: visible, error: visibleError } = await caller
    .from('voice_notes')
    .select('id')
    .eq('id', voiceNoteId)
    .maybeSingle();

  if (visibleError || !visible) {
    return jsonResponse({ error: 'Voice note not found.' }, 404);
  }

  const { data: note, error: noteError } = await service
    .from('voice_notes')
    .select('id, lead_id, audio_path, transcription_status')
    .eq('id', voiceNoteId)
    .single<VoiceNoteRow>();

  if (noteError || !note) return jsonResponse({ error: 'Voice note not found.' }, 404);

  // Already done. Re-running would cost a Deepgram call and overwrite a good
  // transcript with a second, slightly different one for no reason.
  if (note.transcription_status === 'completed') {
    return jsonResponse({ status: 'completed', alreadyDone: true });
  }

  await service
    .from('voice_notes')
    .update({ transcription_status: 'processing' })
    .eq('id', voiceNoteId);

  try {
    const { data: audio, error: downloadError } = await service.storage
      .from('voice-notes')
      .download(note.audio_path);

    if (downloadError || !audio) {
      console.error('download', note.audio_path, downloadError);
      await markFailed(service, voiceNoteId);
      return jsonResponse({ error: 'The recording could not be read.' }, 404);
    }

    const params = new URLSearchParams({
      model: DEEPGRAM_MODEL,
      language: DEEPGRAM_LANGUAGE,
      smart_format: 'true',
      punctuate: 'true',
    });

    const dgResponse = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${DEEPGRAM_API_KEY}`,
        'Content-Type': audio.type || 'audio/m4a',
      },
      body: await audio.arrayBuffer(),
    });

    if (!dgResponse.ok) {
      console.error('deepgram', dgResponse.status, (await dgResponse.text()).slice(0, 400));
      await markFailed(service, voiceNoteId);
      return jsonResponse({ error: 'Transcription failed.', retryable: true }, 503);
    }

    const dg = await dgResponse.json();
    const alternative = dg?.results?.channels?.[0]?.alternatives?.[0];
    const transcript: string = (alternative?.transcript ?? '').trim();

    // Silence, or a recording of a noisy hall with no speech in it. Storing an
    // empty transcript and saying so is the honest outcome; inventing a summary
    // from nothing is the one thing this must never do.
    if (!transcript) {
      await service
        .from('voice_notes')
        .update({
          transcript: '',
          summary: null,
          transcription_status: 'completed',
          transcribed_at: new Date().toISOString(),
        })
        .eq('id', voiceNoteId);
      return jsonResponse({ status: 'completed', transcript: '', summary: null });
    }

    let summary: string | null = null;
    if (ANTHROPIC_API_KEY) {
      try {
        const summaryResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: SUMMARY_MODEL,
            max_tokens: 400,
            system: SUMMARY_PROMPT,
            messages: [{ role: 'user', content: transcript }],
          }),
        });

        if (summaryResponse.ok) {
          const payload = await summaryResponse.json();
          summary = (payload?.content?.[0]?.text ?? '').trim() || null;
        } else {
          console.error('anthropic', summaryResponse.status, (await summaryResponse.text()).slice(0, 300));
        }
      } catch (e) {
        // A failed summary must not lose the transcript — that is the part the
        // rep can still read for themselves.
        console.error('summary', e);
      }
    }

    await service
      .from('voice_notes')
      .update({
        transcript,
        summary,
        transcription_status: 'completed',
        transcribed_at: new Date().toISOString(),
      })
      .eq('id', voiceNoteId);

    return jsonResponse({ status: 'completed', transcript, summary });
  } catch (e) {
    console.error('transcribe-voice-note', e);
    await markFailed(service, voiceNoteId);
    return jsonResponse({ error: 'Transcription failed.', retryable: true }, 503);
  }
});
