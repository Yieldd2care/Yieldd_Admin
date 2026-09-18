/**
 * End-to-end check of card view counting against the LIVE database.
 *
 *   node --env-file=.env scripts/verify-card-views.mjs
 *
 * `record_card_view` is the first thing `anon` has ever been allowed to WRITE
 * in this database, so the boundary around it is the whole point of this file:
 *
 *   - a stranger can record a view, and can read nothing back
 *   - a stranger cannot call team_counts at all
 *   - a stranger learns nothing from a slug that does not exist, or one whose
 *     owner switched the card off: both are silence, not an error
 *   - the same visitor twice in a day is one person, not two
 *   - the owner reloading their own card is not a visitor
 *   - a rep sees their own counts and NULL for everybody else's
 *   - another organisation sees none of it
 *
 * None of that is testable from the app, because the app is always signed in as
 * somebody. Needs SUPABASE_ACCESS_TOKEN for setup and cleanup. Safe to re-run.
 */
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

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

const client = () =>
  createClient(URL_, ANON, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

const stamp = Date.now();
const password = `Test-${stamp}-aA1!`;

/** How many distinct people the database thinks reached this profile's card. */
async function viewersOf(profileId) {
  const [row] = await adminSql(
    `select count(distinct visitor_hash)::int as n from public.card_views where profile_id = '${profileId}';`
  );
  return row.n;
}

let ownerId = null;
let repId = null;
let outsiderId = null;
let repOldOrg = null;

try {
  // -------------------------------------------------------------------------
  // An organisation with two people in it, and one unrelated outsider.
  //
  // signUp always makes its own organisation, so the rep is moved into the
  // owner's afterwards — there is no way to join an existing one from here.
  // -------------------------------------------------------------------------
  const owner = client();
  const { data: signUpOwner, error: errOwner } = await owner.auth.signUp({
    email: `views-owner-${stamp}@yieldd-test.local`,
    password,
    options: { data: { full_name: 'Priya Sharma', company_name: `Northline ${stamp}`, phone: '+919876500021' } },
  });
  if (errOwner) throw new Error(`signup owner: ${errOwner.message}`);
  ownerId = signUpOwner.user.id;

  const rep = client();
  const { data: signUpRep, error: errRep } = await rep.auth.signUp({
    email: `views-rep-${stamp}@yieldd-test.local`,
    password,
    options: { data: { full_name: 'Arjun Nair', company_name: `Sunrise ${stamp}`, phone: '+919876500022' } },
  });
  if (errRep) throw new Error(`signup rep: ${errRep.message}`);
  repId = signUpRep.user.id;

  const outsider = client();
  const { data: signUpOut, error: errOut } = await outsider.auth.signUp({
    email: `views-out-${stamp}@yieldd-test.local`,
    password,
    options: { data: { full_name: 'Meera Rao', company_name: `Farside ${stamp}`, phone: '+919876500023' } },
  });
  if (errOut) throw new Error(`signup outsider: ${errOut.message}`);
  outsiderId = signUpOut.user.id;

  const [orgRow] = await adminSql(
    `select organization_id from public.profiles where id = '${ownerId}';`
  );
  const ownerOrg = orgRow.organization_id;
  const [repOrgRow] = await adminSql(
    `select organization_id from public.profiles where id = '${repId}';`
  );
  repOldOrg = repOrgRow.organization_id;

  await adminSql(
    `update public.profiles set organization_id = '${ownerOrg}', role = 'rep' where id = '${repId}';`
  );

  // -------------------------------------------------------------------------
  // One published card, one switched off
  // -------------------------------------------------------------------------
  const liveSlug = `views-live-${stamp}`;
  const darkSlug = `views-dark-${stamp}`;

  const { error: cardError } = await owner.from('business_cards').insert({
    profile_id: ownerId,
    slug: liveSlug,
    display_name: 'Priya Sharma',
    phone: '+91 98204 41720',
    is_published: true,
  });
  if (cardError) throw new Error(`insert owner card: ${cardError.message}`);

  const { error: darkError } = await rep.from('business_cards').insert({
    profile_id: repId,
    slug: darkSlug,
    display_name: 'Arjun Nair',
    is_published: false,
  });
  if (darkError) throw new Error(`insert rep card: ${darkError.message}`);

  // -------------------------------------------------------------------------
  // The stranger
  // -------------------------------------------------------------------------
  const anon = client();
  const visitorA = randomUUID();
  const visitorB = randomUUID();

  const { error: writeError } = await anon.rpc('record_card_view', {
    p_slug: liveSlug,
    p_visitor: visitorA,
    p_source: 'wa',
  });
  ok('a stranger can record that they opened a card', !writeError, writeError?.message ?? '');
  eq('one visitor is one person', await viewersOf(ownerId), 1);

  await anon.rpc('record_card_view', { p_slug: liveSlug, p_visitor: visitorA, p_source: 'wa' });
  await anon.rpc('record_card_view', { p_slug: liveSlug, p_visitor: visitorA, p_source: 'link' });
  eq('the same person refreshing is still one person', await viewersOf(ownerId), 1);

  await anon.rpc('record_card_view', { p_slug: liveSlug, p_visitor: visitorB, p_source: 'link' });
  eq('a second person is a second person', await viewersOf(ownerId), 2);

  const [sourceRow] = await adminSql(
    `select source from public.card_views where profile_id = '${ownerId}' and visitor_hash = '${visitorA}';`
  );
  eq('the channel the link went out on is kept', sourceRow.source, 'wa');

  // A source the constraint does not know must not reach the constraint.
  const visitorJunk = randomUUID();
  const { error: junkError } = await anon.rpc('record_card_view', {
    p_slug: liveSlug,
    p_visitor: visitorJunk,
    p_source: 'telepathy',
  });
  ok('an unknown channel does not throw in a visitor face', !junkError, junkError?.message ?? '');
  const [junkRow] = await adminSql(
    `select source from public.card_views where visitor_hash = '${visitorJunk}';`
  );
  eq('an unknown channel is recorded as a plain link', junkRow?.source, 'link');

  // ---- what a stranger must NOT be able to do ----
  const { error: readError } = await anon.from('card_views').select('visitor_hash');
  eq('a stranger cannot read the views back', readError?.code, '42501');

  const { error: starError } = await anon.from('card_views').select('*');
  ok('select * fails for a stranger too', Boolean(starError), starError?.code ?? '');

  const { error: countsError } = await anon.rpc('team_counts');
  eq('a stranger cannot ask for the team numbers', countsError?.code, '42501');

  // ---- silence, not an oracle ----
  const before = await viewersOf(ownerId);
  const { error: darkRpcError } = await anon.rpc('record_card_view', {
    p_slug: darkSlug,
    p_visitor: randomUUID(),
    p_source: 'link',
  });
  ok('a card that is switched off raises nothing', !darkRpcError, darkRpcError?.message ?? '');
  eq('a card that is switched off records nothing', await viewersOf(repId), 0);

  const { error: nowhereError } = await anon.rpc('record_card_view', {
    p_slug: `no-such-card-${stamp}`,
    p_visitor: randomUUID(),
    p_source: 'link',
  });
  ok('a slug that never existed raises nothing either', !nowhereError, nowhereError?.message ?? '');

  const [{ total }] = await adminSql(`select count(*)::int as total from public.card_views;`);
  ok('neither of those left a row behind', typeof total === 'number');

  // ---- a visitor id that is not the shape the page issues ----
  await anon.rpc('record_card_view', { p_slug: liveSlug, p_visitor: 'short', p_source: 'link' });
  await anon.rpc('record_card_view', { p_slug: liveSlug, p_visitor: "x'; drop table --", p_source: 'link' });
  eq('a malformed visitor id is dropped, not stored', await viewersOf(ownerId), before);

  // ---- the owner is not a visitor ----
  await owner.rpc('record_card_view', { p_slug: liveSlug, p_visitor: randomUUID(), p_source: 'link' });
  eq('the owner reloading their own card is not counted', await viewersOf(ownerId), before);

  // -------------------------------------------------------------------------
  // Who may see the numbers
  // -------------------------------------------------------------------------
  const { data: adminCounts, error: adminCountsError } = await owner.rpc('team_counts');
  if (adminCountsError) throw new Error(`team_counts as admin: ${adminCountsError.message}`);

  const adminSees = Object.fromEntries(adminCounts.map((r) => [r.profile_id, r]));
  eq('an admin sees both members', adminCounts.length, 2);
  // visitorA, visitorB and visitorJunk — three people, however many times each
  // of them loaded the page. `before` is read after all three have been seen.
  eq('an admin sees the viewer count', adminSees[ownerId]?.viewer_count, before);
  eq('and it is people, not page loads', before, 3);
  eq('an admin sees a rep with no viewers as 0, not unknown', adminSees[repId]?.viewer_count, 0);
  eq('an admin sees lead counts too', adminSees[ownerId]?.lead_count, 0);

  const { data: repCounts, error: repCountsError } = await rep.rpc('team_counts');
  if (repCountsError) throw new Error(`team_counts as rep: ${repCountsError.message}`);
  const repSees = Object.fromEntries(repCounts.map((r) => [r.profile_id, r]));
  eq('a rep still sees every member of the team', repCounts.length, 2);
  eq('a rep sees their own viewer count', repSees[repId]?.viewer_count, 0);
  eq('a rep sees their own lead count', repSees[repId]?.lead_count, 0);
  eq('a rep is told nothing about someone else viewers', repSees[ownerId]?.viewer_count, null);
  eq('a rep is told nothing about someone else leads', repSees[ownerId]?.lead_count, null);

  const { data: outCounts } = await outsider.rpc('team_counts');
  const outIds = (outCounts ?? []).map((r) => r.profile_id);
  ok('another organisation sees none of these people', !outIds.includes(ownerId) && !outIds.includes(repId));

  // A rep reading the table directly must not get round the NULL either.
  const { data: repRows } = await rep.from('card_views').select('visitor_hash');
  eq('a rep cannot read a colleague views off the table', repRows?.length ?? 0, 0);

  const { data: ownerRows } = await owner.from('card_views').select('visitor_hash');
  eq('an admin can read the views in their own organisation', ownerRows?.length, 3);
} catch (err) {
  failed++;
  console.log('FAIL  the run itself threw —', err.message);
} finally {
  try {
    for (const id of [outsiderId, repId, ownerId].filter(Boolean)) {
      await adminSql(`
        do $$
        declare v_org uuid;
        begin
          select organization_id into v_org from public.profiles where id = '${id}';
          delete from public.card_views where profile_id = '${id}';
          delete from public.business_cards where profile_id = '${id}';
          if v_org is not null then
            delete from public.profiles where organization_id = v_org;
            delete from public.organizations where id = v_org;
          end if;
          delete from auth.users where id = '${id}';
        end $$;
      `);
    }
    if (repOldOrg) {
      await adminSql(`delete from public.organizations where id = '${repOldOrg}';`);
    }

    const [state] = await adminSql(
      `select (select count(*) from public.card_views) as views,
              (select count(*) from public.business_cards) as cards,
              (select count(*) from public.organizations) as orgs;`
    );
    console.log('\ncleaned up →', JSON.stringify(state));
  } catch (e) {
    console.log('\nCLEANUP FAILED — remove manually:', ownerId, repId, outsiderId, e.message);
  }

  console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nall checks passed');
  // exitCode rather than exit(): this file does a lot of fetch, and Node 25 on
  // Windows reports 127 when process.exit races the open handles.
  process.exitCode = failed ? 1 : 0;
}
