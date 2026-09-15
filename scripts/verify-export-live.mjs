/**
 * End-to-end check of the export's money gate against the LIVE database.
 *
 *   node --env-file=.env scripts/verify-export-live.mjs
 *
 * PENDING 47. The export offered a "Deal value" tick with no admin check
 * anywhere in the path, so a rep could export deal values for every lead RLS
 * let them read. `public.export_leads` now decides that in SQL, and this is the
 * script that proves it — an admin cannot reveal the bug, so the rep half is
 * the whole point.
 *
 * Three things are asserted here that no offline test can reach:
 *
 *   1. A rep gets money_visible false and NULL in all three money columns, even
 *      on their OWN qualified lead which really does carry a value.
 *   2. The function is `security invoker`, so it must not widen what a rep can
 *      see: the rep gets their own row and none of the admin's.
 *   3. A lead with two voice notes comes back ONCE. The transcript join is a
 *      LATERAL ... limit 1 for exactly this reason; a plain left join would
 *      duplicate the row and nobody would read that as an export bug.
 *
 * Creates a throwaway organisation, asserts, then deletes everything it made.
 * Needs SUPABASE_ACCESS_TOKEN for cleanup. Safe to re-run.
 */
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
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
  createClient(URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

const stamp = Date.now();
const adminEmail = `export-admin-${stamp}@yieldd-test.local`;
const repEmail = `export-rep-${stamp}@yieldd-test.local`;
const password = `Test-${stamp}-aA1!`;

// Pinned to one instant for the whole run. Calling Date.now() afresh would
// make the boundary passed to p_from later than the created_at it was built
// from, and the range assertion below would fail on the clock, not the filter.
const daysAgo = (n) => new Date(stamp - n * 86400_000).toISOString();

let adminId = null;
let repId = null;
let orgId = null;

try {
  const admin = client();
  const { data: signUp, error: signUpError } = await admin.auth.signUp({
    email: adminEmail,
    password,
    options: {
      data: { full_name: 'Export Admin', company_name: `Export Co ${stamp}`, phone: '+919876510001' },
    },
  });
  if (signUpError) throw new Error(`signup: ${signUpError.message}`);
  adminId = signUp.user.id;

  const { data: profile } = await admin
    .from('profiles')
    .select('organization_id')
    .eq('id', adminId)
    .single();
  orgId = profile.organization_id;

  // Seats for the rep, and Pro so the voice notes below are insertable.
  // Test setup, not a way round either rule: verify:plan is what covers those.
  await adminSql(`
    update public.organizations
       set seats_purchased = 4,
           plan_tier = 'pro'
     where id = '${orgId}';
  `);

  const isoDay = (d) => d.slice(0, 10);
  const { data: event, error: eventError } = await admin
    .from('events')
    .insert({
      organization_id: orgId,
      created_by: adminId,
      name: 'Export Expo',
      city: 'Pune',
      start_date: isoDay(daysAgo(4)),
      end_date: isoDay(daysAgo(0)),
      timezone: 'Asia/Kolkata',
    })
    .select()
    .single();
  if (eventError) throw new Error(`event: ${eventError.message}`);

  // One lead per status that matters, each with a value the report must place
  // correctly. The Lost lead's ₹50,000 must appear in NEITHER column.
  const qualifiedId = randomUUID();
  const wonId = randomUUID();
  const lostId = randomUUID();
  const newId = randomUUID();

  const { error: leadsError } = await admin.from('leads').insert([
    {
      id: qualifiedId,
      organization_id: orgId,
      event_id: event.id,
      captured_by: adminId,
      full_name: 'Qualified Lead',
      phone: '+919800000001',
      status: 'qualified',
      deal_value_paisa: 40000000,
      source: 'manual',
      created_at: daysAgo(3),
      custom_field_values: {},
    },
    {
      id: wonId,
      organization_id: orgId,
      event_id: event.id,
      captured_by: adminId,
      full_name: 'Won Lead',
      phone: '+919800000002',
      status: 'won',
      deal_value_paisa: 85000000,
      deal_closed_at: daysAgo(1),
      source: 'manual',
      created_at: daysAgo(2),
      custom_field_values: {},
    },
    {
      id: lostId,
      organization_id: orgId,
      event_id: event.id,
      captured_by: adminId,
      full_name: 'Lost Lead',
      phone: '+919800000003',
      status: 'lost',
      deal_value_paisa: 5000000,
      source: 'manual',
      created_at: daysAgo(1),
      custom_field_values: {},
    },
    {
      id: newId,
      organization_id: orgId,
      event_id: event.id,
      captured_by: adminId,
      full_name: 'New Lead',
      phone: '+919800000004',
      status: 'new',
      source: 'manual',
      created_at: daysAgo(0),
      custom_field_values: {},
    },
  ]);
  if (leadsError) throw new Error(`leads: ${leadsError.message}`);

  // TWO notes on one lead. This is the duplicate-row trap the LATERAL exists for.
  const { error: voiceError } = await admin.from('voice_notes').insert([
    {
      lead_id: wonId,
      recorded_by: adminId,
      audio_path: `${orgId}/first.m4a`,
      transcript: 'the first note',
      summary: 'first summary',
      created_at: daysAgo(2),
    },
    {
      lead_id: wonId,
      recorded_by: adminId,
      audio_path: `${orgId}/second.m4a`,
      transcript: 'the second note',
      summary: 'second summary',
      created_at: daysAgo(1),
    },
  ]);
  if (voiceError) throw new Error(`voice notes: ${voiceError.message}`);

  // ---------------------------------------------------------------- as admin
  const { data: adminRows, error: adminExportError } = await admin.rpc('export_leads', {
    p_event_id: event.id,
    p_with_transcript: true,
  });
  if (adminExportError) throw new Error(`admin export_leads: ${adminExportError.message}`);

  const byName = (rows, name) => rows.filter((r) => r.full_name === name);
  const one = (rows, name) => byName(rows, name)[0];

  eq('the admin gets every lead on the event', adminRows.length, 4);
  eq('the admin is allowed the money columns', adminRows.every((r) => r.money_visible === true), true);

  eq(
    'a qualified lead fills Expected only, and has no close date',
    [one(adminRows, 'Qualified Lead').expected_value_paisa, one(adminRows, 'Qualified Lead').won_value_paisa, one(adminRows, 'Qualified Lead').deal_closed_at],
    [40000000, null, null]
  );
  eq(
    'a won lead fills BOTH columns and carries the close date',
    [one(adminRows, 'Won Lead').expected_value_paisa, one(adminRows, 'Won Lead').won_value_paisa, one(adminRows, 'Won Lead').deal_closed_at !== null],
    [85000000, 85000000, true]
  );
  eq(
    'a lost lead is in neither column, even though it carries a value',
    [one(adminRows, 'Lost Lead').expected_value_paisa, one(adminRows, 'Lost Lead').won_value_paisa],
    [null, null]
  );
  eq(
    'a new lead is in neither column',
    [one(adminRows, 'New Lead').expected_value_paisa, one(adminRows, 'New Lead').won_value_paisa],
    [null, null]
  );

  // The regression the LATERAL prevents.
  eq('a lead with TWO voice notes comes back exactly once', byName(adminRows, 'Won Lead').length, 1);
  eq('and carries the earlier of its two notes', one(adminRows, 'Won Lead').voice_transcript, 'the first note');

  const { data: noTranscript } = await admin.rpc('export_leads', {
    p_event_id: event.id,
    p_with_transcript: false,
  });
  eq(
    'the transcript is not fetched when it was not asked for',
    noTranscript.every((r) => r.voice_transcript === null && r.voice_summary === null),
    true
  );
  eq('and the row count is unchanged by that', noTranscript.length, 4);

  // ---- the scopes the two export screens offer ----
  const { data: wonOnly } = await admin.rpc('export_leads', { p_event_id: event.id, p_won_only: true });
  eq('won-only returns just the won lead', wonOnly.map((r) => r.full_name), ['Won Lead']);

  const { data: ranged } = await admin.rpc('export_leads', {
    p_event_id: event.id,
    p_from: daysAgo(3),
    p_to: daysAgo(2),
  });
  eq('a date range returns only what it covers', ranged.map((r) => r.full_name), ['Qualified Lead', 'Won Lead']);

  const { data: everything } = await admin.rpc('export_leads', {});
  eq('no event id means everything the caller may see', everything.length, 4);

  // ------------------------------------------------------------------ as rep
  const { data: invite, error: inviteError } = await admin
    .from('invites')
    .insert({
      organization_id: orgId,
      invited_by: adminId,
      event_id: event.id,
      full_name: 'Export Rep',
      email: repEmail,
      phone: '+919876510002',
      role: 'rep',
    })
    .select()
    .single();
  if (inviteError) throw new Error(`invite: ${inviteError.message}`);

  const rep = client();
  const { data: repSignUp, error: repError } = await rep.auth.signUp({
    email: repEmail,
    password,
    options: { data: { full_name: 'Export Rep', invite_token: invite.token } },
  });
  if (repError) throw new Error(`rep signup: ${repError.message}`);
  repId = repSignUp.user.id;

  // The rep's OWN lead, qualified, carrying a real value. This is the row that
  // makes the gate meaningful: it is theirs, they entered the number, and the
  // export must still refuse to print it.
  const repLeadId = randomUUID();
  const { error: repLeadError } = await rep.from('leads').insert({
    id: repLeadId,
    organization_id: orgId,
    event_id: event.id,
    captured_by: repId,
    full_name: 'Rep Own Lead',
    phone: '+919800000005',
    status: 'qualified',
    deal_value_paisa: 11110000,
    source: 'manual',
    custom_field_values: {},
  });
  if (repLeadError) throw new Error(`rep lead: ${repLeadError.message}`);

  const { data: repRows, error: repExportError } = await rep.rpc('export_leads', {
    p_event_id: event.id,
    p_with_transcript: true,
  });
  if (repExportError) throw new Error(`rep export_leads: ${repExportError.message}`);

  // security invoker: leads_select_own_or_admin still applies, so the function
  // must not have widened anything.
  eq('the rep gets their OWN lead and none of the admin\'s', repRows.map((r) => r.full_name), ['Rep Own Lead']);

  eq('the rep is told the money was withheld', repRows[0].money_visible, false);
  eq(
    'and all three money columns are NULL, on the rep\'s own qualified lead',
    [repRows[0].expected_value_paisa, repRows[0].won_value_paisa, repRows[0].deal_closed_at],
    [null, null, null]
  );
  eq('the rest of the rep\'s own row still comes through', repRows[0].status, 'qualified');

  // The honest limit, asserted so it is recorded rather than only described:
  // a rep CAN still read the raw value off their own lead. The leads list shows
  // it and the deal-value sheet is how they enter it, so revoking the column
  // would break both screens. What is closed is the EXPORT path.
  const { data: rawOwn } = await rep.from('leads').select('deal_value_paisa').eq('id', repLeadId).single();
  eq('a rep can still read their own lead\'s value directly, by design', rawOwn.deal_value_paisa, 11110000);

  const { data: rawOthers } = await rep.from('leads').select('id').eq('captured_by', adminId);
  eq('but none of the admin\'s leads, in the export or out of it', rawOthers?.length ?? 0, 0);

  // ---- nobody signed in at all ----
  const outsider = client();
  const { error: outsiderError } = await outsider.rpc('export_leads', { p_event_id: event.id });
  ok('a signed-out caller is refused', Boolean(outsiderError), 'anon holds no EXECUTE');
} catch (e) {
  eq('run completed', e.message, 'no error');
} finally {
  try {
    for (const id of [repId, adminId].filter(Boolean)) {
      await adminSql(`
        do $$
        declare v_org uuid;
        begin
          select organization_id into v_org from public.profiles where id = '${id}';
          if v_org is not null then
            delete from public.voice_notes where lead_id in (select id from public.leads where organization_id = v_org);
            delete from public.lead_activity where lead_id in (select id from public.leads where organization_id = v_org);
            delete from public.leads where organization_id = v_org;
            delete from public.invites where organization_id = v_org;
            delete from public.message_templates where organization_id = v_org;
            delete from public.event_members where event_id in (select id from public.events where organization_id = v_org);
            delete from public.events where organization_id = v_org;
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
              (select count(*) from public.leads) as leads,
              (select count(*) from public.events) as events;`
    );
    console.log('\ncleaned up →', JSON.stringify(state));
  } catch (e) {
    console.log('\nCLEANUP FAILED — remove manually:', adminId, repId, e.message);
  }

  console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nall checks passed');
  // process.exitCode, never process.exit(): Node 25 on Windows trips a libuv
  // assertion when the process is torn down with a just-settled fetch handle
  // still open — and the cleanup above is exactly that — which would make a
  // PASSING run report 127. Same reasoning as scripts/rehearse-migration.mjs.
  process.exitCode = failed ? 1 : 0;
}
