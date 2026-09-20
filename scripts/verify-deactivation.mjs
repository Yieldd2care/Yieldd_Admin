/**
 * Deactivating a rep, run for real against the LIVE database.
 *
 *   node --env-file=.env scripts/verify-deactivation.mjs
 *
 * PENDING 70. The server side of deactivation has been right since migration
 * 20260827140000, which gates current_organization_id() and is_admin() on
 * `status = 'active'` — but nothing tested it, and that is precisely how the
 * client-side half stayed broken for so long. A revoked rep kept reading the
 * leads already cached on their handset, because refreshProfile() could not
 * tell "you have been deactivated" apart from "your profile is missing" and
 * did nothing at all for anyone holding a cached profile.
 *
 * So this asserts both halves:
 *
 *   - the server refuses a deactivated rep everything (cases 2-5, 7); and
 *   - THE CLIENT-SIDE REVOKED PATH IS ACTUALLY REACHABLE (case 6) — the one
 *     assertion that would have caught this class of bug. The app's own joined
 *     PROFILE_SELECT must return nothing for a deactivated rep, and the narrow
 *     status query the fix relies on must still return the row. If anyone
 *     "tidies" an embed into that query, or relaxes org_select_members, this
 *     fails loudly instead of the explanation screen quietly becoming
 *     unreachable again.
 *
 * Baseline assertions run while the rep is still ACTIVE (case 1), so a test
 * that stops exercising anything fails rather than passing vacuously.
 *
 * SAFETY: every account it touches is created by this script, with a
 * `deacttest-<tag>-<timestamp>@yieldd-test.local` address. It never signs in
 * as, reads, or modifies anything belonging to a real user, and the real
 * accounts are asserted untouched at the end.
 *
 * Needs SUPABASE_ACCESS_TOKEN. Safe to re-run.
 */
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const URL_ = process.env.EXPO_PUBLIC_SUPABASE_URL;
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = 'azpanagwuskruelbwtvb';

/**
 * A copy of PROFILE_SELECT from lib/mappers/profile.ts, on purpose.
 *
 * The point of case 6 is that THIS EXACT SHAPE goes blind for a deactivated
 * member. Importing it would mean pulling lib/supabase.ts into a plain node
 * script; restating it means the two can drift — so if this ever stops matching
 * the app, case 6 is testing the wrong string and should be updated with it.
 */
const PROFILE_SELECT =
  'id, full_name, email, role, status, designation, phone, avatar_url, notifications_enabled, ' +
  'created_at, tutorial_seen_at, organization_id, ' +
  'organizations!inner(name, plan_tier, onboarding_intent, referral_source)';

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
const mk = (tag) => `deacttest-${tag}-${stamp}@yieldd-test.local`;

/** Signs someone up through the anon client, so handle_new_user() really runs. */
async function signUp(tag, extra = {}) {
  const c = client();
  const email = mk(tag);
  const { data, error } = await c.auth.signUp({
    email,
    password,
    options: { data: { full_name: `Deact ${tag}`, ...extra } },
  });
  if (error) throw new Error(`signup ${tag}: ${error.message}`);
  return { client: c, id: data.user.id, email };
}

const countOf = async (sql) => Number((await adminSql(sql))[0].n);
const statusOf = async (id) =>
  (await adminSql(`select status::text from public.profiles where id = '${id}';`))[0]?.status ?? null;

const isoDay = (d) => d.toISOString().slice(0, 10);

// The real accounts, captured before anything runs.
const realUsersBefore = await countOf(
  `select count(*)::int as n from auth.users where email not like 'deacttest-%@yieldd-test.local';`
);

try {
  // =======================================================================
  // Setup — an admin, an event, an invited rep, and a lead from each.
  // =======================================================================
  console.log('\n--- Setup ---');
  const owner = await signUp('owner', {
    company_name: `Deact Co ${stamp}`,
    phone: '+919876500071',
  });
  const { data: ownerProfile } = await owner.client
    .from('profiles')
    .select('organization_id')
    .eq('id', owner.id)
    .single();
  const org = ownerProfile.organization_id;

  // The seat limit (migration 20260910100000) refuses any invite on a one-seat
  // plan, and this test needs two people in one organisation. Billing is not
  // what is under test, so the seat is granted directly here rather than by
  // simulating a purchase. Note it is `seats_purchased`, not the plan tier:
  // an admin cannot write either column themselves — organizations only grants
  // UPDATE on `name` — which is itself worth knowing if this ever moves.
  await adminSql(`update public.organizations set seats_purchased = 2 where id = '${org}';`);

  const { data: event } = await owner.client
    .from('events')
    .insert({
      organization_id: org,
      created_by: owner.id,
      name: 'Deact Expo',
      city: 'Mumbai',
      start_date: isoDay(new Date()),
      end_date: isoDay(new Date()),
      timezone: 'Asia/Kolkata',
    })
    .select()
    .single();

  const { data: invite, error: inviteError } = await owner.client
    .from('invites')
    .insert({
      organization_id: org,
      invited_by: owner.id,
      event_id: event.id,
      full_name: 'Deact rep',
      email: mk('rep'),
      phone: '+919876500072',
      role: 'rep',
    })
    .select()
    .single();
  if (inviteError) throw new Error(`invite insert: ${inviteError.message}`);

  const repClient = client();
  const { data: repSignUp, error: repErr } = await repClient.auth.signUp({
    email: mk('rep'),
    password,
    options: { data: { full_name: 'Deact rep', invite_token: invite.token } },
  });
  if (repErr) throw new Error(`rep signup: ${repErr.message}`);
  const repId = repSignUp.user.id;

  const repLeadId = randomUUID();
  const { error: repLeadError } = await repClient.from('leads').insert({
    id: repLeadId,
    organization_id: org,
    event_id: event.id,
    captured_by: repId,
    full_name: 'Rep Lead',
    phone: '+919800000071',
    source: 'manual',
    consent_given: true,
    custom_field_values: {},
  });
  eq('the rep can capture a lead while active', repLeadError, null);

  await owner.client.from('leads').insert({
    id: randomUUID(),
    organization_id: org,
    event_id: event.id,
    captured_by: owner.id,
    full_name: 'Owner Lead',
    phone: '+919800000072',
    source: 'manual',
    consent_given: true,
    custom_field_values: {},
  });

  // =======================================================================
  // CASE 1 — the baseline, while the rep is still ACTIVE.
  //
  // Without this, every assertion below would also pass against a rep who
  // could never read anything in the first place.
  // =======================================================================
  console.log('\n--- Case 1: baseline, rep still active ---');
  // ONE, not two. leads_select_own_or_admin scopes a rep to the leads they
  // captured themselves, so the owner's lead is invisible to them even while
  // active. Asserting the exact number rather than "more than none" is what
  // keeps this honest: if that policy ever widened, this would notice.
  const { data: activeLeads } = await repClient.from('leads').select('id');
  eq('an active rep reads the lead they captured', activeLeads?.length ?? 0, 1);
  eq('  ...and it is theirs', activeLeads?.[0]?.id ?? null, repLeadId);

  const { data: activeEvents } = await repClient.from('events').select('id');
  eq('  ...and the event it belongs to', activeEvents?.length ?? 0, 1);

  const { data: activeExport } = await repClient.rpc('export_leads', {});
  eq('  ...and exports that one row', activeExport?.length ?? 0, 1);

  const { data: activeProfile } = await repClient
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('id', repId)
    .maybeSingle();
  ok("  ...and the app's joined profile fetch returns a row", Boolean(activeProfile));

  // =======================================================================
  // The admin revokes them.
  // =======================================================================
  console.log('\n--- The admin deactivates the rep ---');
  const { error: deactivateError } = await owner.client
    .from('profiles')
    .update({ status: 'deactivated' })
    .eq('id', repId);
  eq('an admin can deactivate a rep', deactivateError, null);
  eq('  ...and it is stored', await statusOf(repId), 'deactivated');

  // =======================================================================
  // CASE 2-4 — the server refuses them everything.
  //
  // No token refresh is needed for any of this: RLS reads auth.uid() at query
  // time, so the rep's existing session is already powerless.
  // =======================================================================
  console.log('\n--- Cases 2-4: the server refuses a deactivated rep ---');
  const { data: goneLeads } = await repClient.from('leads').select('id');
  eq('a deactivated rep reads ZERO leads', goneLeads?.length ?? 0, 0);

  const { data: goneEvents } = await repClient.from('events').select('id');
  eq('  ...zero events', goneEvents?.length ?? 0, 0);

  const { data: goneExport, error: exportError } = await repClient.rpc('export_leads', {});
  // An outright error is an equally acceptable refusal — the assertion is
  // "exports nothing", not "returns an empty array".
  ok('  ...and exports nothing', (goneExport?.length ?? 0) === 0,
    exportError ? `errored: ${exportError.message}` : `${goneExport?.length ?? 0} rows`);

  // =======================================================================
  // CASE 5 — they cannot let themselves back in.
  // =======================================================================
  console.log('\n--- Case 5: they cannot restore themselves ---');
  const { error: selfRestore } = await repClient
    .from('profiles')
    .update({ status: 'active' })
    .eq('id', repId);
  ok('a deactivated rep cannot set their own status back to active',
    Boolean(selfRestore), 'the update was ACCEPTED');
  eq('  ...and the stored status is untouched', await statusOf(repId), 'deactivated');

  // =======================================================================
  // CASE 6 — the assertion that would have caught the bug.
  //
  // This is the whole reason the device-side fix needs a second query. If the
  // first of these ever starts returning a row, refreshProfile() can read
  // `status` straight off it and the narrow query is redundant. If the second
  // ever stops returning one, the revoked path is unreachable and a revoked
  // rep silently keeps their cached leads again.
  // =======================================================================
  console.log('\n--- Case 6: the client-side revoked path is reachable ---');
  const { data: joinedProfile } = await repClient
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('id', repId)
    .maybeSingle();
  eq("the app's joined PROFILE_SELECT goes blind (organizations!inner)", joinedProfile, null);

  const { data: narrowProfile, error: narrowError } = await repClient
    .from('profiles')
    .select('status')
    .eq('id', repId)
    .maybeSingle();
  eq('  ...but the narrow status query still answers', narrowError, null);
  eq('  ...and it says deactivated', narrowProfile?.status ?? null, 'deactivated');

  // =======================================================================
  // CASE 7 — their work stays with the company. J3's promise.
  // =======================================================================
  console.log('\n--- Case 7: the leads stay with the organisation ---');
  const { data: adminLeads } = await owner.client.from('leads').select('id, captured_by');
  eq('the admin still reads both leads', adminLeads?.length ?? 0, 2);
  ok("  ...including the deactivated rep's",
    Boolean(adminLeads?.some((l) => l.id === repLeadId && l.captured_by === repId)));

  // =======================================================================
  // CASE 8 — reactivation really works, so the notice screen's "sign in
  // again" is a real path and not a one-way door.
  // =======================================================================
  console.log('\n--- Case 8: reactivation restores access ---');
  const { error: restoreError } = await owner.client
    .from('profiles')
    .update({ status: 'active' })
    .eq('id', repId);
  eq('an admin can reactivate them', restoreError, null);

  const { data: backLeads } = await repClient.from('leads').select('id');
  eq('  ...and the rep reads their lead again', backLeads?.length ?? 0, 1);

  const { data: backProfile } = await repClient
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('id', repId)
    .maybeSingle();
  ok('  ...and the joined profile fetch works again', Boolean(backProfile));

  // =======================================================================
  console.log('\n--- Safety ---');
  eq(
    'every real account is untouched',
    await countOf(
      `select count(*)::int as n from auth.users where email not like 'deacttest-%@yieldd-test.local';`
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
                 where email like 'deacttest-%@yieldd-test.local' loop
          delete from public.lead_activity where lead_id in (select id from public.leads where organization_id = r.organization_id);
          delete from public.leads where organization_id = r.organization_id;
          delete from public.invites where organization_id = r.organization_id;
          delete from public.message_templates where organization_id = r.organization_id;
          delete from public.event_members where event_id in (select id from public.events where organization_id = r.organization_id);
          delete from public.events where organization_id = r.organization_id;
          delete from public.profiles where organization_id = r.organization_id;
          delete from public.organizations where id = r.organization_id;
        end loop;
        delete from auth.users where email like 'deacttest-%@yieldd-test.local';
      end $$;
    `);
    const [state] = await adminSql(
      `select (select count(*) from auth.users) as users,
              (select count(*) from public.organizations) as orgs,
              (select count(*) from auth.users where email like 'deacttest-%') as leftover_test;`
    );
    console.log('\ncleaned up →', JSON.stringify(state));
  } catch (e) {
    console.log('\nCLEANUP FAILED — check for deacttest- accounts:', e.message);
  }
}

console.log(`\n${failed === 0 ? 'All checks passed.' : `${failed} check(s) FAILED.`}`);
process.exitCode = failed ? 1 : 0;
