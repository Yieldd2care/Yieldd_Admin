/**
 * Account deletion, run for real against the LIVE database.
 *
 *   node --env-file=.env scripts/verify-deletion-live.mjs
 *
 * `verify:deletion` is the pure companion to this: it reads the migrations and
 * checks every column pointing at `profiles` is handled. This one actually
 * DELETES throwaway accounts and inspects the wreckage, because that is the
 * only way to know the ordering works — the delete order is circular unless
 * done by hand, and the failure mode is a runtime error in front of someone who
 * has just typed DELETE.
 *
 * SAFETY: every account it touches is created by this script, with a
 * `deltest-<timestamp>@yieldd-test.local` address. It never signs in as, reads,
 * or deletes anything belonging to a real user. The three real accounts on this
 * project are asserted untouched at the end.
 *
 * Needs SUPABASE_ACCESS_TOKEN. Safe to re-run.
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
const ok = (name, cond, detail = '') => {
  if (!cond) failed++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond || !detail ? '' : `\n        ${detail}`}`);
};

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
const mk = (tag) => `deltest-${tag}-${stamp}@yieldd-test.local`;
const created = [];

/** Signs someone up and keeps the authenticated client for later. */
async function signUp(tag, extra = {}) {
  const c = client();
  const email = mk(tag);
  const { data, error } = await c.auth.signUp({
    email,
    password,
    options: { data: { full_name: `Del ${tag}`, phone: '+919876500061', ...extra } },
  });
  if (error) throw new Error(`signup ${tag}: ${error.message}`);
  created.push(data.user.id);
  return { client: c, id: data.user.id, email };
}

/** Calls the deployed Edge Function as that user, exactly as the app does. */
async function deleteAccount(session) {
  const res = await fetch(`${URL_}/functions/v1/delete-account`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: ANON,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ confirm: 'DELETE' }),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

const countOf = async (sql) => Number((await adminSql(sql))[0].n);

// The real accounts, captured before anything is deleted.
const realUsersBefore = await countOf(
  `select count(*)::int as n from auth.users where email not like 'deltest-%@yieldd-test.local';`
);

try {
  // =====================================================================
  // CASE 1 — a solo user. The whole organisation goes.
  // =====================================================================
  console.log('\n--- Case 1: solo admin, whole organisation goes ---');
  const solo = await signUp('solo', { company_name: `Solo Co ${stamp}` });
  const { data: soloProfile } = await solo.client
    .from('profiles')
    .select('organization_id')
    .eq('id', solo.id)
    .single();
  const soloOrg = soloProfile.organization_id;

  const isoDay = (d) => d.toISOString().slice(0, 10);
  const { data: soloEvent } = await solo.client
    .from('events')
    .insert({
      organization_id: soloOrg,
      created_by: solo.id,
      name: 'Solo Expo',
      city: 'Mumbai',
      start_date: isoDay(new Date()),
      end_date: isoDay(new Date()),
      timezone: 'Asia/Kolkata',
    })
    .select()
    .single();

  const soloLeadId = randomUUID();
  await solo.client.from('leads').insert({
    id: soloLeadId,
    organization_id: soloOrg,
    event_id: soloEvent.id,
    captured_by: solo.id,
    full_name: 'Solo Lead',
    phone: '+919800000061',
    source: 'manual',
    consent_given: true,
    custom_field_values: {},
  });

  const { data: soloSession } = await solo.client.auth.getSession();
  const soloResult = await deleteAccount(soloSession.session);
  eq('the function accepts a solo deletion', soloResult.status, 200);
  eq('  ...and reports it removed the organisation', soloResult.body?.mode, 'org');

  eq(
    'the organisation row is gone',
    await countOf(`select count(*)::int as n from public.organizations where id = '${soloOrg}';`),
    0
  );
  eq(
    '  ...its leads with it',
    await countOf(`select count(*)::int as n from public.leads where id = '${soloLeadId}';`),
    0
  );
  eq(
    '  ...its events too',
    await countOf(`select count(*)::int as n from public.events where id = '${soloEvent.id}';`),
    0
  );
  eq(
    '  ...the profile',
    await countOf(`select count(*)::int as n from public.profiles where id = '${solo.id}';`),
    0
  );
  eq(
    '  ...and the login itself',
    await countOf(`select count(*)::int as n from auth.users where id = '${solo.id}';`),
    0
  );

  // =====================================================================
  // CASE 2 — a rep leaving. Their work is handed over; the company stays.
  // =====================================================================
  console.log('\n--- Case 2: a rep leaves, work hands over ---');
  const owner = await signUp('owner', { company_name: `Team Co ${stamp}` });
  const { data: ownerProfile } = await owner.client
    .from('profiles')
    .select('organization_id')
    .eq('id', owner.id)
    .single();
  const teamOrg = ownerProfile.organization_id;

  const { data: teamEvent } = await owner.client
    .from('events')
    .insert({
      organization_id: teamOrg,
      created_by: owner.id,
      name: 'Team Expo',
      city: 'Pune',
      start_date: isoDay(new Date()),
      end_date: isoDay(new Date()),
      timezone: 'Asia/Kolkata',
    })
    .select()
    .single();

  const { data: repInvite } = await owner.client
    .from('invites')
    .insert({
      organization_id: teamOrg,
      invited_by: owner.id,
      event_id: teamEvent.id,
      full_name: 'Del rep',
      email: mk('rep'),
      phone: '+919876500062',
      role: 'rep',
    })
    .select()
    .single();

  const repClient = client();
  const { data: repSignUp, error: repErr } = await repClient.auth.signUp({
    email: mk('rep'),
    password,
    options: { data: { full_name: 'Del rep', invite_token: repInvite.token } },
  });
  if (repErr) throw new Error(`rep signup: ${repErr.message}`);
  const repId = repSignUp.user.id;
  created.push(repId);

  // The rep captures a lead — this is what has to survive them.
  const repLeadId = randomUUID();
  const { error: repLeadError } = await repClient.from('leads').insert({
    id: repLeadId,
    organization_id: teamOrg,
    event_id: teamEvent.id,
    captured_by: repId,
    full_name: 'Rep Lead',
    phone: '+919800000062',
    source: 'manual',
    consent_given: true,
    custom_field_values: {},
  });
  eq('the rep can capture a lead', repLeadError, null);

  const { data: repSession } = await repClient.auth.getSession();
  const repResult = await deleteAccount(repSession.session);
  eq('the function accepts the rep deletion', repResult.status, 200);
  eq('  ...as a handover, not a wipe', repResult.body?.mode, 'handover');

  eq(
    "the rep's login is gone",
    await countOf(`select count(*)::int as n from auth.users where id = '${repId}';`),
    0
  );
  eq(
    'the organisation survives',
    await countOf(`select count(*)::int as n from public.organizations where id = '${teamOrg}';`),
    1
  );
  // This is the assertion that matters commercially: a rep leaving must not
  // take the company's leads with them.
  eq(
    "the rep's lead SURVIVES",
    await countOf(`select count(*)::int as n from public.leads where id = '${repLeadId}';`),
    1
  );
  const [owned] = await adminSql(
    `select captured_by::text from public.leads where id = '${repLeadId}';`
  );
  eq('  ...now belonging to the admin', owned.captured_by, owner.id);

  // =====================================================================
  // CASE 3 — one of two admins leaves. Handover, not destruction.
  // =====================================================================
  console.log('\n--- Case 3: one of two admins leaves ---');
  const { data: admin2Invite } = await owner.client
    .from('invites')
    .insert({
      organization_id: teamOrg,
      invited_by: owner.id,
      full_name: 'Del admin2',
      email: mk('admin2'),
      phone: '+919876500063',
      role: 'admin',
    })
    .select()
    .single();

  const admin2Client = client();
  const { data: a2, error: a2err } = await admin2Client.auth.signUp({
    email: mk('admin2'),
    password,
    options: { data: { full_name: 'Del admin2', invite_token: admin2Invite.token } },
  });
  if (a2err) throw new Error(`admin2 signup: ${a2err.message}`);
  created.push(a2.user.id);

  const { data: a2Session } = await admin2Client.auth.getSession();
  const a2Result = await deleteAccount(a2Session.session);
  eq('a second admin leaving is accepted', a2Result.status, 200);
  // The refinement that matters: with another admin present this is a handover,
  // so one of two admins cannot destroy the other's company data.
  eq('  ...as a handover, NOT an org wipe', a2Result.body?.mode, 'handover');
  eq(
    'the organisation is still there',
    await countOf(`select count(*)::int as n from public.organizations where id = '${teamOrg}';`),
    1
  );
  eq(
    "and so is the other admin's login",
    await countOf(`select count(*)::int as n from auth.users where id = '${owner.id}';`),
    1
  );

  // =====================================================================
  // CASE 4 — the last admin. Now the organisation does go.
  // =====================================================================
  console.log('\n--- Case 4: the last admin leaves ---');
  const { data: ownerSession } = await owner.client.auth.getSession();
  const ownerResult = await deleteAccount(ownerSession.session);
  eq('the last admin leaving is accepted', ownerResult.status, 200);
  eq('  ...and NOW it is an org wipe', ownerResult.body?.mode, 'org');
  eq(
    'the organisation is gone',
    await countOf(`select count(*)::int as n from public.organizations where id = '${teamOrg}';`),
    0
  );
  eq(
    '  ...and the lead handed to them with it',
    await countOf(`select count(*)::int as n from public.leads where id = '${repLeadId}';`),
    0
  );

  // =====================================================================
  // The guard, and the real accounts
  // =====================================================================
  console.log('\n--- Safety ---');
  const stray = await signUp('guard', { company_name: `Guard Co ${stamp}` });
  const { data: strayS } = await stray.client.auth.getSession();
  const wrongWord = await fetch(`${URL_}/functions/v1/delete-account`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${strayS.session.access_token}`,
      apikey: ANON,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ confirm: 'delete please' }),
  });
  ok('a wrong confirmation word is refused', wrongWord.status !== 200, `status ${wrongWord.status}`);
  eq(
    '  ...and the account still exists',
    await countOf(`select count(*)::int as n from auth.users where id = '${stray.id}';`),
    1
  );

  const noAuth = await fetch(`${URL_}/functions/v1/delete-account`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirm: 'DELETE' }),
  });
  ok('an unauthenticated caller is refused', noAuth.status !== 200, `status ${noAuth.status}`);

  eq(
    'every real account is untouched',
    await countOf(
      `select count(*)::int as n from auth.users where email not like 'deltest-%@yieldd-test.local';`
    ),
    realUsersBefore
  );
} catch (err) {
  failed++;
  console.log(`FAIL  threw — ${err.message}`);
} finally {
  // Only ever removes this script's own accounts.
  try {
    await adminSql(`
      do $$
      declare r record;
      begin
        for r in select id, organization_id from public.profiles
                 where email like 'deltest-%@yieldd-test.local' loop
          delete from public.lead_activity where lead_id in (select id from public.leads where organization_id = r.organization_id);
          delete from public.leads where organization_id = r.organization_id;
          delete from public.invites where organization_id = r.organization_id;
          delete from public.message_templates where organization_id = r.organization_id;
          delete from public.event_members where event_id in (select id from public.events where organization_id = r.organization_id);
          delete from public.events where organization_id = r.organization_id;
          delete from public.profiles where organization_id = r.organization_id;
          delete from public.organizations where id = r.organization_id;
        end loop;
        delete from auth.users where email like 'deltest-%@yieldd-test.local';
      end $$;
    `);
    const [state] = await adminSql(
      `select (select count(*) from auth.users) as users,
              (select count(*) from public.organizations) as orgs,
              (select count(*) from auth.users where email like 'deltest-%') as leftover_test;`
    );
    console.log('\ncleaned up →', JSON.stringify(state));
  } catch (e) {
    console.log('\nCLEANUP FAILED — check for deltest- accounts:', e.message);
  }
}

console.log(`\n${failed === 0 ? 'All checks passed.' : `${failed} check(s) FAILED.`}`);
process.exitCode = failed ? 1 : 0;
