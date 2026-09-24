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
 * It also covers removal (migration 20260923100000). A rep may delete their own
 * FLAGGED duplicate and nothing else, which is what keeps the keep-or-remove
 * prompt from being a general delete. Two of those assertions carry most of the
 * weight: that a rep cannot set duplicate_of_lead_id themselves (otherwise the
 * policy authorises anything they captured), and that an unflagged delete comes
 * back as zero rows WITHOUT an error — the shape deleteLead() detects, and the
 * one that would otherwise let the app report a removal that never happened.
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
  // Pro AND seats. `enforce_invite_seats` (migration 20260910100000) counts
  // seats_included + seats_purchased, not the plan tier, so raising the tier
  // alone still leaves this org on one seat and the invite below is refused.
  await adminSql(`
    update public.organizations
       set plan_tier = 'pro',
           seats_purchased = greatest(seats_purchased, 4)
     where id = '${orgId}';
  `);
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

  // ---- 9. removal: the policy shape ----
  // Cheap, and it catches a migration that did not deploy before anything
  // behavioural below has a chance to fail confusingly.
  const policies = await adminSql(`
    select policyname, qual from pg_policies
    where schemaname = 'public' and tablename = 'leads' and cmd = 'DELETE'
    order by policyname;
  `);
  const names = policies.map((r) => r.policyname);
  ok('leads_delete_own_duplicate exists', names.includes('leads_delete_own_duplicate'));
  ok('leads_delete_admin_only still exists', names.includes('leads_delete_admin_only'));
  const dupQual = policies.find((r) => r.policyname === 'leads_delete_own_duplicate')?.qual ?? '';
  ok('  ...narrowed on duplicate_of_lead_id', /duplicate_of_lead_id IS NOT NULL/i.test(dupQual));
  ok('  ...and on captured_by', /captured_by = auth\.uid\(\)/i.test(dupQual));

  // ---- 10. B captures the same person, and the flag lands ----
  const bDupId = randomUUID();
  const { error: bDupError } = await b.from('leads').insert({
    id: bDupId,
    organization_id: orgId,
    event_id: event.id,
    captured_by: bId,
    full_name: 'Priya Sharma',
    phone: '98204 41720',
    source: 'card_scan',
    consent_given: true,
    custom_field_values: {},
    duplicate_of_lead_id: leadId,
  });
  if (bDupError) throw new Error(`b duplicate lead: ${bDupError.message}`);

  // A second B lead that is NOT a duplicate, for the refusal cases below.
  const bPlainId = randomUUID();
  const { error: bPlainError } = await b.from('leads').insert({
    id: bPlainId,
    organization_id: orgId,
    event_id: event.id,
    captured_by: bId,
    full_name: 'Someone Else',
    phone: '9000011111',
    source: 'manual',
    consent_given: true,
    custom_field_values: {},
  });
  if (bPlainError) throw new Error(`b plain lead: ${bPlainError.message}`);

  // ---- 11. a rep CANNOT self-authorise by setting the flag ----
  // The whole delete policy rests on duplicate_of_lead_id being insert-only.
  // If this PATCH succeeded, "remove a duplicate" would become "delete
  // anything I captured".
  const { error: selfAuthError } = await b
    .from('leads')
    .update({ duplicate_of_lead_id: leadId })
    .eq('id', bPlainId);
  ok('a rep cannot set duplicate_of_lead_id after capture', selfAuthError);

  // ---- 12. THE SHAPE THE CLIENT DEPENDS ON ----
  // An RLS-filtered DELETE is not an error — it removes zero rows and reports
  // success. deleteLead() adds .select('id') precisely so it can tell the two
  // apart. If this ever came back as an error instead, that code would be
  // wrong in the other direction, so assert the exact shape.
  const plainDelete = await b.from('leads').delete().eq('id', bPlainId).select('id');
  eq('deleting an unflagged lead is not an error', plainDelete.error, null);
  eq('  ...it silently removes zero rows', plainDelete.data?.length ?? 0, 0);

  // ---- 13. B cannot delete A's lead, flagged or not ----
  const aDelete = await b.from('leads').delete().eq('id', leadId).select('id');
  eq("B cannot delete A's lead", aDelete.data?.length ?? 0, 0);

  // ---- 14. the original is never REP-deletable ----
  // Asserted through B, deliberately. A created the organisation and is
  // therefore an ADMIN, so A deletes their own lead under the untouched
  // leads_delete_admin_only — testing the guarantee through A would be
  // measuring the wrong policy, and the cascade from that delete would null
  // B's flag and quietly disarm the tests below.
  //
  // Every original has a null duplicate_of_lead_id, so case 12 above — B's own
  // unflagged lead, zero rows removed — IS this guarantee: a rep can never
  // reach the first copy of anyone, only a redundant second one.
  eq('the original is untouched so far', (await adminSql(
    `select count(*)::int as n from public.leads where id = '${leadId}';`
  ))[0]?.n, 1);

  // ---- 15. and the one thing that IS allowed ----
  const goodDelete = await b.from('leads').delete().eq('id', bDupId).select('id');
  eq('B CAN delete their own flagged duplicate', goodDelete.data?.map((r) => r.id) ?? [], [bDupId]);
  const stillThere = await adminSql(
    `select count(*)::int as n from public.leads where id = '${bDupId}';`
  );
  eq('  ...and the row is really gone', stillThere[0]?.n, 0);

  // ---- 16. the cascade trap ----
  // duplicate_of_lead_id is a self-reference with ON DELETE SET NULL, and
  // Postgres runs that as an UPDATE, which fires the immutability trigger. A
  // blanket "is distinct from" guard would make this fail.
  const cascadeChild = randomUUID();
  await adminSql(`
    insert into public.leads (id, organization_id, event_id, captured_by, full_name, phone,
                              source, consent_given, custom_field_values, duplicate_of_lead_id)
    values ('${cascadeChild}', '${orgId}', '${event.id}', '${bId}', 'Cascade Child',
            '98204 41720', 'card_scan', true, '{}', '${leadId}');
  `);
  let cascadeOk = true;
  try {
    await adminSql(`delete from public.leads where id = '${leadId}';`);
  } catch (e) {
    cascadeOk = false;
    console.log(`        cascade delete threw: ${e.message}`);
  }
  ok('deleting an original with a live duplicate succeeds', cascadeOk);
  const cleared = await adminSql(
    `select duplicate_of_lead_id from public.leads where id = '${cascadeChild}';`
  );
  eq("  ...and the duplicate's flag was cleared", cleared[0]?.duplicate_of_lead_id, null);

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
