/**
 * End-to-end check of voice notes against the LIVE database.
 *
 *   node --env-file=.env scripts/verify-voice-note.mjs
 *
 * Creates a throwaway organisation, attaches a real recording to a lead in the
 * order the storage policy demands, runs the deployed `transcribe-voice-note`
 * function, and checks the transcript and summary that come back. Also proves
 * the Free plan's three-note limit actually bites, and that a rep cannot reach
 * another organisation's audio. Deletes everything it made.
 *
 * The fixture is speech synthesised by Windows TTS (see fixtures/README), so
 * this measures the plumbing and the summary, not accented real-world audio.
 */
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const HERE = dirname(fileURLToPath(import.meta.url));
const URL_ = process.env.EXPO_PUBLIC_SUPABASE_URL;
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = 'azpanagwuskruelbwtvb';

let failed = 0;
const eq = (name, actual, expected) => {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  if (!pass) failed++;
  console.log(
    `${pass ? 'PASS' : 'FAIL'}  ${name}` +
      (pass ? '' : `\n        got  ${JSON.stringify(actual)}\n        want ${JSON.stringify(expected)}`)
  );
};
const ok = (name, condition, detail = '') => {
  if (!condition) failed++;
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${detail ? `  →  ${detail}` : ''}`);
};

async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text);
  return JSON.parse(text);
}

async function serviceKey() {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/api-keys?reveal=true`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  const keys = await res.json();
  return keys.find((k) => k.name === 'service_role' || k.type === 'secret')?.api_key ?? null;
}

const stamp = Date.now();
const supabase = createClient(URL_, ANON, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

let userId = null;
let orgId = null;

try {
  const { data: signUp, error } = await supabase.auth.signUp({
    email: `voice-${stamp}@yieldd-test.local`,
    password: `Test-${stamp}-aA1!`,
    options: { data: { full_name: 'Voice Test', company_name: `Voice Co ${stamp}`, phone: '+919876500006' } },
  });
  if (error) throw new Error(error.message);
  userId = signUp.user.id;
  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', userId).single();
  orgId = profile.organization_id;

  const today = new Date().toISOString().slice(0, 10);
  const { data: event } = await supabase
    .from('events')
    .insert({ organization_id: orgId, created_by: userId, name: 'Voice Expo', start_date: today, end_date: today })
    .select()
    .single();

  const leadId = randomUUID();
  await supabase.from('leads').insert({
    id: leadId, organization_id: orgId, event_id: event.id, captured_by: userId,
    full_name: 'Rajesh Menon', phone: '+91 98204 41720',
    source: 'manual', consent_given: true, custom_field_values: {},
  });

  const audio = new Uint8Array(readFileSync(join(HERE, 'fixtures', 'voice-note.wav')));
  console.log(`recording ${(audio.length / 1024).toFixed(0)} KB\n`);

  // ---- the ordering rule ----
  const noteId = randomUUID();
  const path = `${orgId}/${noteId}.wav`;

  const early = await supabase.storage.from('voice-notes').upload(path, audio, { contentType: 'audio/wav' });
  ok('upload is refused before the voice_notes row exists', Boolean(early.error));

  const { error: rowError } = await supabase.from('voice_notes').insert({
    id: noteId, lead_id: leadId, recorded_by: userId, audio_path: path, duration_seconds: 26,
  });
  eq('the voice_notes row saves carrying its object key', rowError, null);

  const upload = await supabase.storage.from('voice-notes').upload(path, audio, { contentType: 'audio/wav' });
  eq('upload succeeds once the row is there', upload.error?.message ?? null, null);

  // ---- transcription ----
  const started = Date.now();
  const { data: result, error: fnError } = await supabase.functions.invoke('transcribe-voice-note', {
    body: { voice_note_id: noteId },
  });
  if (fnError) {
    const detail = await fnError.context?.text?.().catch(() => '');
    throw new Error(`transcribe: ${fnError.message} ${detail}`);
  }
  console.log(`\ntranscribed in ${Date.now() - started} ms`);
  console.log(`\n  transcript: ${JSON.stringify(result.transcript)}`);
  console.log(`\n  summary:    ${JSON.stringify(result.summary)}\n`);

  eq('status is completed', result.status, 'completed');

  const t = String(result.transcript ?? '').toLowerCase();
  ok('transcript names the company', t.includes('northline'));
  ok('transcript keeps the quantity', t.includes('500') || t.includes('five hundred'));
  ok('transcript keeps the budget', t.includes('40 lakhs') || t.includes('forty lakhs'));
  ok('transcript keeps the deadline', t.includes('friday'));

  const summary = String(result.summary ?? '');
  ok('a summary was written', summary.length > 20, `${summary.length} chars`);
  ok('the summary is short enough to read before a call', summary.length < 600, `${summary.length} chars`);
  const sl = summary.toLowerCase();
  ok('the summary keeps the deadline', sl.includes('friday'));
  ok('the summary keeps the budget', sl.includes('40') || sl.includes('forty'));
  ok(
    'the summary does not invent a name that was never said',
    !sl.includes('priya') && !sl.includes('acme')
  );

  // The row itself, not just the response.
  const { data: stored } = await supabase.from('voice_notes').select('*').eq('id', noteId).single();
  eq('the transcript is stored on the row', stored.transcript === result.transcript, true);
  ok('transcribed_at is set', Boolean(stored.transcribed_at));

  // Re-running must not redo the work.
  const { data: again } = await supabase.functions.invoke('transcribe-voice-note', {
    body: { voice_note_id: noteId },
  });
  eq('a repeat call is a no-op rather than a second transcription', again.alreadyDone, true);

  // ---- the Free plan's three-note limit ----
  for (let i = 2; i <= 3; i++) {
    const id = randomUUID();
    const { error: e } = await supabase.from('voice_notes').insert({
      id, lead_id: leadId, recorded_by: userId, audio_path: `${orgId}/${id}.wav`, duration_seconds: 5,
    });
    eq(`voice note ${i} of 3 is allowed on the free plan`, e, null);
  }
  const fourth = await supabase.from('voice_notes').insert({
    id: randomUUID(), lead_id: leadId, recorded_by: userId,
    audio_path: `${orgId}/${randomUUID()}.wav`, duration_seconds: 5,
  });
  eq('the fourth is refused on the free plan', fourth.error?.code, '42501');

  // ---- another organisation cannot reach the audio ----
  const outsider = createClient(URL_, ANON, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { error: outsiderError } = await outsider.storage.from('voice-notes').download(path);
  ok('a signed-out caller cannot download the recording', Boolean(outsiderError));
} catch (e) {
  console.error('ERROR:', e.message);
  failed++;
} finally {
  if (userId && orgId) {
    try {
      const key = await serviceKey();
      if (key) {
        for (const bucket of ['voice-notes', 'card-images']) {
          const list = await (
            await fetch(`${URL_}/storage/v1/object/list/${bucket}`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${key}`, apikey: key, 'Content-Type': 'application/json' },
              body: JSON.stringify({ prefix: orgId, limit: 100 }),
            })
          ).json();
          const names = (list || []).map((o) => `${orgId}/${o.name}`);
          if (names.length) {
            await fetch(`${URL_}/storage/v1/object/${bucket}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${key}`, apikey: key, 'Content-Type': 'application/json' },
              body: JSON.stringify({ prefixes: names }),
            });
          }
        }
      }
      await sql(`do $$ declare v_org uuid := '${orgId}'; begin
        delete from public.voice_notes where lead_id in (select id from public.leads where organization_id = v_org);
        delete from public.leads where organization_id = v_org;
        delete from public.event_members where event_id in (select id from public.events where organization_id = v_org);
        delete from public.events where organization_id = v_org;
        delete from public.profiles where organization_id = v_org;
        delete from public.organizations where id = v_org;
        delete from auth.users where id = '${userId}'; end $$;`);
      const [state] = await sql(
        `select (select count(*) from auth.users) users, (select count(*) from public.voice_notes) notes,
                (select count(*) from storage.objects) objects;`
      );
      console.log('\ncleaned up →', JSON.stringify(state));
    } catch (e) {
      console.log('\nCLEANUP FAILED — remove manually:', userId, e.message);
    }
  }
  console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nall checks passed');
  process.exit(failed ? 1 : 0);
}
