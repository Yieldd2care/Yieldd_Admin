/**
 * End-to-end check of the digital business card against the LIVE database.
 *
 *   node --env-file=.env scripts/verify-business-card.mjs
 *
 * Two throwaway accounts, one card each, then everything is removed. The whole
 * point of this file is the boundary between them and the anonymous visitor:
 *
 *   - a stranger with the link can read the card, and ONLY the granted columns
 *   - a stranger cannot see an unpublished card at all
 *   - a signed-in stranger cannot edit somebody else's card or take their
 *     photo folder
 *
 * None of that is testable from the app, because the app is always signed in
 * as somebody. Needs SUPABASE_ACCESS_TOKEN for cleanup. Safe to re-run.
 */
import { createClient } from '@supabase/supabase-js';

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
const ok = (name, cond, detail = '') => eq(name + (detail ? ` — ${detail}` : ''), Boolean(cond), true);

async function adminSql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${text}`);
  return JSON.parse(text);
}

async function serviceKey() {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/api-keys?reveal=true`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  const keys = await res.json();
  return keys.find((k) => k.name === 'service_role' || k.type === 'secret')?.api_key ?? null;
}

const client = () =>
  createClient(URL_, ANON, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

const stamp = Date.now();
const password = `Test-${stamp}-aA1!`;
// Two people with the same name, which is the case the slug has to survive.
const NAME = 'Priya Sharma';

let aId = null;
let bId = null;
let photoPath = null;

try {
  // -------------------------------------------------------------------------
  // Two accounts
  // -------------------------------------------------------------------------
  const a = client();
  const { data: signUpA, error: errA } = await a.auth.signUp({
    email: `card-a-${stamp}@yieldd-test.local`,
    password,
    options: { data: { full_name: NAME, company_name: `Northline ${stamp}`, phone: '+919876500011' } },
  });
  if (errA) throw new Error(`signup A: ${errA.message}`);
  aId = signUpA.user.id;

  const b = client();
  const { data: signUpB, error: errB } = await b.auth.signUp({
    email: `card-b-${stamp}@yieldd-test.local`,
    password,
    options: { data: { full_name: NAME, company_name: `Sunrise ${stamp}`, phone: '+919876500012' } },
  });
  if (errB) throw new Error(`signup B: ${errB.message}`);
  bId = signUpB.user.id;

  // -------------------------------------------------------------------------
  // The link
  // -------------------------------------------------------------------------
  const { data: slugA, error: slugAError } = await a.rpc('suggest_card_slug', { p_base: NAME });
  if (slugAError) throw new Error(`suggest A: ${slugAError.message}`);
  eq('a Latin name becomes a readable link', slugA, 'priya-sharma');

  const { data: devanagari } = await a.rpc('suggest_card_slug', { p_base: 'महेश सिंह राजपूत' });
  ok('a Devanagari name still gets a valid link', /^card-[0-9a-f]{8}$/.test(devanagari ?? ''), devanagari);

  const { data: freeBefore } = await a.rpc('business_card_slug_available', { p_slug: slugA });
  eq('the link is free before anyone claims it', freeBefore, true);

  // -------------------------------------------------------------------------
  // A publishes a card
  // -------------------------------------------------------------------------
  const { error: insertError } = await a.from('business_cards').insert({
    profile_id: aId,
    slug: slugA,
    display_name: NAME,
    designation: 'Sales Manager',
    company_name: `Northline ${stamp}`,
    phone: '+91 98204 41720',
    email: `card-a-${stamp}@yieldd-test.local`,
    secondary_email: 'priya.personal@example.test',
    website_url: 'https://northline.test',
    linkedin_url: 'https://www.linkedin.com/in/priya-sharma',
    office_address: 'Plot 47, MIDC, Andheri East, Mumbai',
    bio: 'Twelve years in precision castings.',
    social_links: [{ label: 'Instagram', url: 'https://instagram.test/priya' }],
    is_published: true,
  });
  if (insertError) throw new Error(`insert A: ${insertError.message}`);

  const { data: takenForA } = await a.rpc('business_card_slug_available', { p_slug: slugA });
  eq('a person re-saving their own card is not in conflict with themselves', takenForA, true);

  const { data: takenForB } = await b.rpc('business_card_slug_available', { p_slug: slugA });
  eq('the same link is taken for everybody else', takenForB, false);

  const { data: slugB } = await b.rpc('suggest_card_slug', { p_base: NAME });
  eq('the second Priya Sharma gets the next link', slugB, 'priya-sharma-2');

  // The format rule the app mirrors, enforced where it actually counts.
  const { data: badCase } = await b.rpc('business_card_slug_available', { p_slug: 'Priya-Sharma' });
  eq('an uppercase link is refused', badCase, false);
  const { data: badDash } = await b.rpc('business_card_slug_available', { p_slug: '-priya-' });
  eq('a link cannot start or end with a dash', badDash, false);

  const { error: badSlugInsert } = await b
    .from('business_cards')
    .insert({ profile_id: bId, slug: 'Priya Sharma', display_name: NAME });
  eq('the database refuses a malformed link too', badSlugInsert?.code, '23514');

  const { error: dupInsert } = await b
    .from('business_cards')
    .insert({ profile_id: bId, slug: slugA, display_name: NAME });
  eq('two people cannot hold one link', dupInsert?.code, '23505');

  // -------------------------------------------------------------------------
  // The anonymous visitor — the whole reason the page exists
  // -------------------------------------------------------------------------
  const PUBLIC_COLUMNS =
    'slug, display_name, designation, company_name, phone, email, secondary_email, photo_path, website_url, linkedin_url, office_address, bio, social_links, is_published';

  const anon = client();
  const { data: seen, error: seenError } = await anon
    .from('business_cards')
    .select(PUBLIC_COLUMNS)
    .eq('slug', slugA)
    .eq('is_published', true)
    .maybeSingle();

  ok('a stranger with the link can read the card', !seenError && seen, seenError?.message);
  eq('they see the name', seen?.display_name, NAME);
  eq('they see the phone number the owner published', seen?.phone, '+91 98204 41720');
  // Compared field by field: jsonb does not preserve the key order it was
  // written in, so a whole-object comparison here would fail on the storage
  // format rather than on anything the page cares about.
  eq('they see one social link', seen?.social_links?.length, 1);
  eq('with its label', seen?.social_links?.[0]?.label, 'Instagram');
  eq('and its URL', seen?.social_links?.[0]?.url, 'https://instagram.test/priya');

  // The column grant is what keeps a column added later private by default.
  const { error: idError } = await anon.from('business_cards').select('id').eq('slug', slugA);
  eq('a stranger cannot read the row id', idError?.code, '42501');
  const { error: ownerError } = await anon.from('business_cards').select('profile_id').eq('slug', slugA);
  eq('a stranger cannot read who owns it', ownerError?.code, '42501');
  const { error: starError } = await anon.from('business_cards').select('*').eq('slug', slugA);
  ok('select * fails for a stranger, which is why the page lists its columns', Boolean(starError));

  const { error: anonRpcError } = await anon.rpc('suggest_card_slug', { p_base: 'someone' });
  eq('a stranger cannot claim links', anonRpcError?.code, '42501');
  const { error: anonAvailError } = await anon.rpc('business_card_slug_available', { p_slug: 'someone' });
  eq('a stranger cannot probe the link namespace', anonAvailError?.code, '42501');

  // -------------------------------------------------------------------------
  // Switching the page off
  // -------------------------------------------------------------------------
  const { error: unpublishError } = await a
    .from('business_cards')
    .update({ is_published: false })
    .eq('profile_id', aId);
  ok('the owner can switch their page off', !unpublishError, unpublishError?.message);

  const { data: hidden } = await anon.from('business_cards').select(PUBLIC_COLUMNS).eq('slug', slugA).maybeSingle();
  eq('an unpublished card is invisible to a stranger', hidden, null);

  await a.from('business_cards').update({ is_published: true }).eq('profile_id', aId);

  // -------------------------------------------------------------------------
  // One person cannot touch another's card
  // -------------------------------------------------------------------------
  const { data: bEdit } = await b
    .from('business_cards')
    .update({ display_name: 'Hijacked' })
    .eq('profile_id', aId)
    .select();
  eq("a signed-in stranger's edit changes nothing", bEdit ?? [], []);

  const { data: stillMine } = await a.from('business_cards').select('display_name').eq('profile_id', aId).single();
  eq('the card still says what its owner wrote', stillMine?.display_name, NAME);

  // -------------------------------------------------------------------------
  // The photo bucket
  // -------------------------------------------------------------------------
  const png = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
    0x42, 0x60, 0x82,
  ]);

  photoPath = `${aId}/verify.jpg`;
  const { error: uploadError } = await a.storage
    .from('card-photos')
    .upload(photoPath, png, { contentType: 'image/jpeg', upsert: true });
  ok('a person can upload into their own photo folder', !uploadError, uploadError?.message);

  const { error: intruderError } = await b
    .storage.from('card-photos')
    .upload(`${aId}/intruder.jpg`, png, { contentType: 'image/jpeg', upsert: true });
  ok("nobody can upload into someone else's folder", Boolean(intruderError), intruderError?.message);

  const { data: publicUrl } = anon.storage.from('card-photos').getPublicUrl(photoPath);
  const photoResponse = await fetch(publicUrl.publicUrl);
  eq('the photo is readable with no account at all', photoResponse.status, 200);
  eq('and it is served as an image', (photoResponse.headers.get('content-type') ?? '').startsWith('image/'), true);
} catch (e) {
  failed++;
  console.log('FAIL  threw:', e.message);
} finally {
  try {
    // storage.protect_delete() blocks removing objects through SQL, so the
    // file goes through the Storage API with the service role.
    if (photoPath) {
      const key = await serviceKey();
      if (key) {
        const admin = createClient(URL_, key, { auth: { persistSession: false } });
        await admin.storage.from('card-photos').remove([photoPath, `${aId}/intruder.jpg`]);
      }
    }

    for (const id of [bId, aId].filter(Boolean)) {
      await adminSql(`
        do $$
        declare v_org uuid;
        begin
          select organization_id into v_org from public.profiles where id = '${id}';
          delete from public.business_cards where profile_id = '${id}';
          if v_org is not null then
            delete from public.profiles where organization_id = v_org;
            delete from public.organizations where id = v_org;
          end if;
          delete from auth.users where id = '${id}';
        end $$;
      `);
    }

    const [state] = await adminSql(
      `select (select count(*) from auth.users) as users,
              (select count(*) from public.organizations) as orgs,
              (select count(*) from public.business_cards) as cards,
              (select count(*) from storage.objects where bucket_id = 'card-photos') as photos;`
    );
    console.log('\ncleaned up →', JSON.stringify(state));
  } catch (e) {
    console.log('\nCLEANUP FAILED — remove manually:', aId, bId, e.message);
  }

  console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nall checks passed');
  process.exit(failed ? 1 : 0);
}
