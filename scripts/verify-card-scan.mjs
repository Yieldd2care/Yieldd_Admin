/**
 * End-to-end check of card reading and the card-image upload rules.
 *
 *   node --env-file=.env scripts/verify-card-scan.mjs
 *
 * Runs the deployed `extract-card` function against two fixtures — a clean
 * card and a deliberately bad photo (angled, dim, glare, cropped edge, low
 * JPEG quality) — then exercises the storage ordering rule that the bucket
 * policies impose. Creates a throwaway account and deletes it afterwards.
 *
 * Capitalisation of the company name is not asserted: a card printed in caps
 * may come back title-cased, and both are correct for the person reading it.
 * Digits are asserted exactly, because a misread phone number is a lead nobody
 * can call back.
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
      (pass ? `  →  ${JSON.stringify(actual)}` : `\n        got  ${JSON.stringify(actual)}\n        want ${JSON.stringify(expected)}`)
  );
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

const EXPECTED = {
  full_name: 'Rajesh Menon',
  designation: 'Purchase Head',
  phone: '+91 98204 41720',
  company_landline: '022 4915 8800',
  email: 'rajesh.menon@northline.co.in',
  company_website: 'www.northline.co.in',
  company_address: 'Plot 47, MIDC Industrial Area, Andheri East, Mumbai 400093',
};

const stamp = Date.now();
const supabase = createClient(URL_, ANON, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

let userId = null;
let orgId = null;

try {
  const { data: signUp, error } = await supabase.auth.signUp({
    email: `cardscan-${stamp}@yieldd-test.local`,
    password: `Test-${stamp}-aA1!`,
    options: { data: { full_name: 'Card Scan Test', company_name: `Scan Co ${stamp}`, phone: '+919876500005' } },
  });
  if (error) throw new Error(error.message);
  userId = signUp.user.id;
  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', userId).single();
  orgId = profile.organization_id;

  for (const [label, file] of [
    ['clean photo', 'card.jpeg'],
    ['bad photo (angled, dim, glare, cropped, low quality)', 'card-hard.jpeg'],
  ]) {
    const base64 = readFileSync(join(HERE, 'fixtures', file)).toString('base64');
    const started = Date.now();
    const { data, error: fnError } = await supabase.functions.invoke('extract-card', {
      body: { image_base64: base64, mime_type: 'image/jpeg' },
    });
    if (fnError) throw new Error(`${label}: ${fnError.message}`);

    console.log(`\n--- ${label} — ${Date.now() - started} ms ---`);
    const f = data.fields;
    for (const [key, want] of Object.entries(EXPECTED)) {
      eq(`${label}: ${key}`, f[key], want);
    }
    eq(`${label}: company (case-insensitive)`, f.company?.toLowerCase(), 'northline engineering');
    eq(`${label}: reported as read`, data.read, true);
  }

  // ---- the storage ordering rule ----
  console.log('\n--- card image upload ---');
  const today = new Date().toISOString().slice(0, 10);
  const { data: event } = await supabase
    .from('events')
    .insert({ organization_id: orgId, created_by: userId, name: 'Scan Expo', start_date: today, end_date: today })
    .select()
    .single();

  const leadId = randomUUID();
  const path = `${orgId}/${leadId}.jpg`;
  const bytes = new Uint8Array(readFileSync(join(HERE, 'fixtures', 'card.jpeg')));

  const before = await supabase.storage.from('card-images').upload(path, bytes, { contentType: 'image/jpeg' });
  eq('upload is refused before the lead row exists', Boolean(before.error), true);

  const { error: leadError } = await supabase.from('leads').insert({
    id: leadId, organization_id: orgId, event_id: event.id, captured_by: userId,
    full_name: 'Rajesh Menon', phone: '+91 98204 41720', card_image_path: path,
    source: 'card_scan', consent_given: true, custom_field_values: {},
  });
  eq('the lead saves carrying its object key', leadError, null);

  const after = await supabase.storage.from('card-images').upload(path, bytes, { contentType: 'image/jpeg', upsert: true });
  eq('upload succeeds once the row is there', after.error?.message ?? null, null);

  const retry = await supabase.storage.from('card-images').upload(path, bytes, { contentType: 'image/jpeg', upsert: true });
  eq('a retry overwrites rather than duplicating', retry.error?.message ?? null, null);

  const { data: listed } = await supabase.storage.from('card-images').list(orgId);
  eq('exactly one object for this lead', listed?.filter((o) => o.name === `${leadId}.jpg`).length, 1);

  const { data: signed } = await supabase.storage.from('card-images').createSignedUrl(path, 60);
  const fetched = await fetch(signed.signedUrl);
  eq('a signed URL returns the image', fetched.status, 200);
  eq('the bytes match what was uploaded', (await fetched.arrayBuffer()).byteLength, bytes.byteLength);

  const stray = await supabase.storage
    .from('card-images')
    .upload(`${orgId}/${randomUUID()}.jpg`, bytes, { contentType: 'image/jpeg' });
  eq('a key with no lead behind it is refused', Boolean(stray.error), true);

  const outsider = createClient(URL_, ANON, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { error: outsiderError } = await outsider.storage.from('card-images').download(path);
  eq('a signed-out caller cannot download it', Boolean(outsiderError), true);
} catch (e) {
  console.error('ERROR:', e.message);
  failed++;
} finally {
  if (userId && orgId) {
    try {
      // Storage objects must go through the Storage API — SQL deletion is
      // blocked by storage.protect_delete().
      const key = await serviceKey();
      if (key) {
        const list = await (
          await fetch(`${URL_}/storage/v1/object/list/card-images`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${key}`, apikey: key, 'Content-Type': 'application/json' },
            body: JSON.stringify({ prefix: orgId, limit: 100 }),
          })
        ).json();
        const names = (list || []).map((o) => `${orgId}/${o.name}`);
        if (names.length) {
          await fetch(`${URL_}/storage/v1/object/card-images`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${key}`, apikey: key, 'Content-Type': 'application/json' },
            body: JSON.stringify({ prefixes: names }),
          });
        }
      }
      await sql(`do $$ declare v_org uuid := '${orgId}'; begin
        delete from public.leads where organization_id = v_org;
        delete from public.event_members where event_id in (select id from public.events where organization_id = v_org);
        delete from public.events where organization_id = v_org;
        delete from public.profiles where organization_id = v_org;
        delete from public.organizations where id = v_org;
        delete from auth.users where id = '${userId}'; end $$;`);
      const [state] = await sql(
        `select (select count(*) from auth.users) users, (select count(*) from public.leads) leads,
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
