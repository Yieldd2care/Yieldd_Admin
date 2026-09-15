/**
 * The storage rules for a lead's SECOND photo.
 *
 *   node --env-file=.env scripts/verify-extra-photo.mjs
 *
 * Migration 20260915100000 added `leads.extra_photo_path` and widened all four
 * `card_images_*` policies from
 *
 *     where l.card_image_path = storage.objects.name
 * to
 *     where (l.card_image_path = storage.objects.name
 *            or l.extra_photo_path = storage.objects.name)
 *
 * Four policies on a bucket the whole product reads from were dropped and
 * recreated to do it, so this exists to prove three separate things:
 *
 *   1. the new key is accepted when a row carries it;
 *   2. the ORIGINAL key still works when `extra_photo_path` is null — the
 *      regression that would have taken down every existing card thumbnail,
 *      and the only reason this script is worth its runtime;
 *   3. the widening did not turn into a hole: an object key no row points at
 *      is still refused, which is what stops a rep enumerating the bucket.
 *
 * Creates a throwaway account and deletes it afterwards.
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
      (pass
        ? `  →  ${JSON.stringify(actual)}`
        : `\n        got  ${JSON.stringify(actual)}\n        want ${JSON.stringify(expected)}`)
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

const stamp = Date.now();
const supabase = createClient(URL_, ANON, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

let userId = null;
let orgId = null;

try {
  const { data: signUp, error } = await supabase.auth.signUp({
    email: `extraphoto-${stamp}@yieldd-test.local`,
    // Unique per run: profiles.phone is UNIQUE, so a fixed number would make a
    // second run fail inside handle_new_user() with GoTrue's opaque
    // "Database error saving new user" and look like a policy problem.
    password: `Test-${stamp}-aA1!`,
    options: {
      data: {
        full_name: 'Extra Photo Test',
        company_name: `Extra Co ${stamp}`,
        phone: `+9198765${String(stamp).slice(-5)}`,
      },
    },
  });
  if (error) throw new Error(error.message);
  userId = signUp.user.id;

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', userId)
    .single();
  orgId = profile.organization_id;

  const today = new Date().toISOString().slice(0, 10);
  const { data: event } = await supabase
    .from('events')
    .insert({
      organization_id: orgId,
      created_by: userId,
      name: 'Extra Photo Expo',
      start_date: today,
      end_date: today,
    })
    .select()
    .single();

  const bytes = new Uint8Array(readFileSync(join(HERE, 'fixtures', 'card.jpeg')));
  const bucket = supabase.storage.from('card-images');

  // ---- 1. a lead carrying BOTH keys ----
  console.log('\n--- a lead with a card and an extra photo ---');
  const bothId = randomUUID();
  const cardKey = `${orgId}/${bothId}.jpg`;
  const extraKey = `${orgId}/${bothId}-extra.jpg`;

  const beforeRow = await bucket.upload(extraKey, bytes, { contentType: 'image/jpeg' });
  eq('the extra photo is refused before the row exists', Boolean(beforeRow.error), true);

  const { error: bothError } = await supabase.from('leads').insert({
    id: bothId,
    organization_id: orgId,
    event_id: event.id,
    captured_by: userId,
    full_name: 'Rajesh Menon',
    phone: '+91 98204 41720',
    card_image_path: cardKey,
    extra_photo_path: extraKey,
    source: 'card_scan',
    consent_given: true,
    custom_field_values: {},
  });
  eq('the lead saves carrying both keys', bothError, null);

  const cardUp = await bucket.upload(cardKey, bytes, { contentType: 'image/jpeg', upsert: true });
  eq('the card uploads', cardUp.error?.message ?? null, null);

  const extraUp = await bucket.upload(extraKey, bytes, { contentType: 'image/jpeg', upsert: true });
  eq('the extra photo uploads', extraUp.error?.message ?? null, null);

  const { data: listed } = await bucket.list(orgId);
  const names = (listed ?? []).map((o) => o.name);
  eq('both objects exist, under distinct keys', [
    names.includes(`${bothId}.jpg`),
    names.includes(`${bothId}-extra.jpg`),
  ], [true, true]);

  const { data: signedExtra } = await bucket.createSignedUrl(extraKey, 60);
  const fetchedExtra = await fetch(signedExtra.signedUrl);
  eq('a signed URL returns the extra photo', fetchedExtra.status, 200);

  // ---- 2. THE REGRESSION GUARD ----
  // A lead with no extra photo at all. If the added `or extra_photo_path = ...`
  // disjunct mishandled NULL, this upload would be refused — and that is every
  // card image in the product, not just new ones.
  console.log('\n--- a card-only lead, with extra_photo_path NULL ---');
  const cardOnlyId = randomUUID();
  const cardOnlyKey = `${orgId}/${cardOnlyId}.jpg`;

  const { error: cardOnlyError } = await supabase.from('leads').insert({
    id: cardOnlyId,
    organization_id: orgId,
    event_id: event.id,
    captured_by: userId,
    full_name: 'Priya Nair',
    card_image_path: cardOnlyKey,
    source: 'card_scan',
    consent_given: true,
    custom_field_values: {},
  });
  eq('a card-only lead saves', cardOnlyError, null);

  const cardOnlyUp = await bucket.upload(cardOnlyKey, bytes, {
    contentType: 'image/jpeg',
    upsert: true,
  });
  eq('the card still uploads with a NULL extra_photo_path', cardOnlyUp.error?.message ?? null, null);

  const { data: signedCardOnly } = await bucket.createSignedUrl(cardOnlyKey, 60);
  const fetchedCardOnly = await fetch(signedCardOnly.signedUrl);
  eq('and is still readable back', fetchedCardOnly.status, 200);

  // ---- 3. the widening is not a hole ----
  console.log('\n--- keys nothing points at ---');
  const strayExtra = await bucket.upload(`${orgId}/${cardOnlyId}-extra.jpg`, bytes, {
    contentType: 'image/jpeg',
  });
  eq(
    'an -extra key is refused when the row does not carry it',
    Boolean(strayExtra.error),
    true
  );

  const stray = await bucket.upload(`${orgId}/${randomUUID()}-extra.jpg`, bytes, {
    contentType: 'image/jpeg',
  });
  eq('an -extra key with no lead at all is refused', Boolean(stray.error), true);

  const outsider = createClient(URL_, ANON, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { error: outsiderError } = await outsider.storage.from('card-images').download(extraKey);
  eq('a signed-out caller cannot download the extra photo', Boolean(outsiderError), true);

  // ---- 4. the policies still use an index ----
  console.log('\n--- the lookup the policies make ---');
  const [plan] = await sql(
    `explain (format json) select 1 from public.leads l
      where l.card_image_path = '${cardKey}' or l.extra_photo_path = '${cardKey}'`
  );
  const planText = JSON.stringify(plan);
  eq(
    'the path lookup is not a sequential scan',
    planText.includes('Seq Scan') && !planText.includes('Index'),
    false
  );
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
            headers: {
              Authorization: `Bearer ${key}`,
              apikey: key,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prefix: orgId, limit: 100 }),
          })
        ).json();
        const names = (list || []).map((o) => `${orgId}/${o.name}`);
        if (names.length) {
          await fetch(`${URL_}/storage/v1/object/card-images`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${key}`,
              apikey: key,
              'Content-Type': 'application/json',
            },
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
