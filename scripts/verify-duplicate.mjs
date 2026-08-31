/**
 * End-to-end check of duplicate detection (E4, TASKS.md 2.14) against the LIVE
 * database.
 *
 *   node --env-file=.env scripts/verify-duplicate.mjs
 *
 * Two reps in one organisation, on one event. Rep A captures a contact; rep B
 * meets the same person an hour later and must be told — while learning nothing
 * else about A's leads. That boundary is the acceptance criterion, so it is
 * asserted here rather than assumed.
 *
 * The check that matters most is the anon one. find_duplicate_lead is SECURITY
 * DEFINER, and migration 20260831090000 had to DROP and recreate it to widen the
 * return type. CREATE FUNCTION grants EXECUTE to PUBLIC by default, so a
 * recreate silently reopens the function to unauthenticated callers unless the
 * revoke is re-applied. This project has hit that trap three times. Asserting
 * the refusal is the only way to know the revoke actually ran.
 *
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
const ok = (name, cond) => eq(name, Boolean(cond), true);

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
const aEmail = `dup-a-${stamp}@yieldd-test.local`;
const bEmail = `dup-b-${stamp}@yieldd-test.local`;
const outsiderEmail = `dup-out-${stamp}@yieldd-test.local`;
const password = `Test-${stamp}-aA1!`;

// One contact, stored the way a rep types it on a card scan: spaced, with a
// country code. Every lookup below is the SAME person written differently.
const STORED_PHONE = '+91 98204 41720';

let aId = null;
let bId = null;
let outsiderId = null;

const call = async (c, eventId, phone) => {
  const { data, error } = await c.rpc('find_duplicate_lead', {
    p_event_id: eventId,
    p_phone: phone,
  });
  if (error) throw new Error(`rpc: ${error.message}`);
  return data ?? [];
};

try {
  // ---- rep A: an org, an event, one lead ----
  const a = client();
  const { data: aSignUp, error: aError } = await a.auth.signUp({
    email: aEmail,
    password,
    options: { data: { full_name: 'Rajesh Menon', company_name: `Dup Co ${stamp}`, phone: '+919876500011' } },
  });
  if (aError) throw new Error(`signup a: ${aError.message}`);
  aId = aSignUp.user.id;

  const { data: aProfile } = await a.from('profiles').select('organization_id').eq('id', aId).single();
  const orgId = aProfile.organization_id;

  const isoDay = (d) => d.toISOString().slice(0, 10);
  const today = new Date();
  const end = new Date(today);
  end.setDate(end.getDate() + 2);

  const mkEvent = async (name) => {
    const { data, error } = await a
      .from('events')
      .insert({
        organization_id: orgId,
        created_by: aId,
        name,
        city: 'Mumbai',
        start_date: isoDay(today),
        end_date: isoDay(end),
        timezone: 'Asia/Kolkata',
      })
      .select()
      .single();
    if (error) throw new Error(`event ${name}: ${error.message}`);
    return data;
  };

  const event = await mkEvent('Dup Expo');

  // A second event needs Pro: events_admin_insert is `is_pro_user() OR
  // active_event_count() = 0`, so the database itself refuses a Free org a
  // second show. Flipped here rather than worked around, because plan_tier is
  // deliberately not client-writable and this org is thrown away at the end.
  await adminSql(`update public.organizations set plan_tier = 'pro' where id = '${orgId}';`);
  const otherEvent = await mkEvent('Dup Expo North');

  const leadId = randomUUID();
  const { error: leadError } = await a.from('leads').insert({
    id: leadId,
    organization_id: orgId,
    event_id: event.id,
    captured_by: aId,
    full_name: 'Priya Sharma',
    phone: STORED_PHONE,
    note: 'Wants a quote with lead times by next week.',
    source: 'card_scan',
    consent_given: true,
    custom_field_values: {},
  });
  if (leadError) throw new Error(`lead: ${leadError.message}`);

  // ---- rep B joins the same org and the same event ----
  const { data: invite, error: inviteError } = await a
    .from('invites')
    .insert({
      organization_id: orgId,
      invited_by: aId,
      event_id: event.id,
      full_name: 'Amit Shah',
      email: bEmail,
      phone: '+919876500012',
      role: 'rep',
    })
    .select()
    .single();
  if (inviteError) throw new Error(`invite: ${inviteError.message}`);

  const b = client();
  const { data: bSignUp, error: bError } = await b.auth.signUp({
    email: bEmail,
    password,
    options: { data: { full_name: 'Amit Shah', invite_token: invite.token } },
  });
  if (bError) throw new Error(`signup b: ${bError.message}`);
  bId = bSignUp.user.id;

  // ---- 1. the same number, written the ways a rep writes it ----
  // Every one of these failed before migration 20260831090000, which compared
  // `l.phone = p_phone` as raw strings.
  for (const typed of ['9820441720', '98204 41720', '+919820441720', '098204 41720', '+91-98204-41720']) {
    const rows = await call(b, event.id, typed);
    eq(`B typing "${typed}" finds A's capture`, rows.length, 1);
    if (rows.length === 1) {
      eq(`  ...and it is attributed to A`, rows[0].captured_by, aId);
      eq(`  ...by name`, rows[0].captured_by_name, 'Rajesh Menon');
      eq(`  ...with A's note`, rows[0].note, 'Wants a quote with lead times by next week.');
    }
  }

  // ---- 2. mid-typing must find nothing ----
  // The rep is standing in front of the customer. A warning that appears at
  // three digits and vanishes at ten is worse than no warning.
  for (const partial of ['9', '982', '9820441']) {
    eq(`"${partial}" is too short to match anyone`, (await call(b, event.id, partial)).length, 0);
  }

  // ---- 3. a different person ----
  eq('an unrelated number finds nothing', (await call(b, event.id, '9000011122')).length, 0);

  // ---- 4. scoped to the event ----
  // The same person at a different show is a different conversation.
  eq(
    'the right number on the WRONG event finds nothing',
    (await call(b, otherEvent.id, '9820441720')).length,
    0
  );

  // ---- 5. A matching their own earlier capture ----
  // On the Free plan an organisation has one user, so this is the ONLY case a
  // free account can ever hit. The app branches its copy on captured_by, so the
  // id has to come back correctly.
  const own = await call(a, event.id, '9820441720');
  eq('A finds their own earlier capture', own.length, 1);
  eq('  ...and captured_by is A themselves', own[0]?.captured_by, aId);

  // ---- 6. the boundary the whole feature is allowed to exist under ----
  const { data: bDirect } = await b.from('leads').select('id');
  eq("B cannot read A's leads directly — the RPC is the only door", bDirect?.length ?? 0, 0);

  // ---- 7. a different organisation, same phone number ----
  const outsider = client();
  const { data: outSignUp, error: outError } = await outsider.auth.signUp({
    email: outsiderEmail,
    password,
    options: { data: { full_name: 'Other Org', company_name: `Other Co ${stamp}`, phone: '+919876500013' } },
  });
  if (outError) throw new Error(`signup outsider: ${outError.message}`);
  outsiderId = outSignUp.user.id;

  eq(
    'another organisation gets nothing for the same number',
    (await call(outsider, event.id, '9820441720')).length,
    0
  );

  // ---- 8. THE ONE THAT GUARDS THE DROP+CREATE ----
  // A recreated SECURITY DEFINER function is granted to PUBLIC by default. If
  // the revoke in the migration were missing or misspelled, everything above
  // would still pass and this would be the only failure.
  const anon = client();
  const { error: anonError } = await anon.rpc('find_duplicate_lead', {
    p_event_id: event.id,
    p_phone: '9820441720',
  });
  ok('an unauthenticated caller is refused', anonError);
  eq('  ...with insufficient_privilege (42501)', anonError?.code, '42501');
} catch (err) {
  failed++;
  console.log(`FAIL  threw — ${err.message}`);
} finally {
  try {
    for (const id of [bId, aId, outsiderId].filter(Boolean)) {
      await adminSql(`
        do $$
        declare v_org uuid;
        begin
          select organization_id into v_org from public.profiles where id = '${id}';
          if v_org is not null then
            delete from public.lead_activity where lead_id in (select id from public.leads where organization_id = v_org);
            delete from public.voice_notes where lead_id in (select id from public.leads where organization_id = v_org);
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
    console.log('\nCLEANUP FAILED — remove manually:', aId, bId, outsiderId, e.message);
  }
}

console.log(`\n${failed === 0 ? 'All checks passed.' : `${failed} check(s) FAILED.`}`);
process.exitCode = failed ? 1 : 0;
