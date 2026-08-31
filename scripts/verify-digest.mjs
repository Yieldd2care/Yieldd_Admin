/**
 * Checks the weekly digest against the LIVE project.
 *
 *   node --env-file=.env scripts/verify-digest.mjs
 *
 * Builds an organisation with a KNOWN set of leads, then asserts the numbers
 * the email would carry — because the whole value of this message is that the
 * recipient trusts the figures without opening the app. A digest that quietly
 * miscounts is worse than no digest.
 *
 * Runs the function in dry_run, so nothing is emailed and nobody's once-a-week
 * slot is consumed. The claim/idempotency logic is exercised directly against
 * the database instead, where it can be tested without sending.
 *
 * Needs SUPABASE_ACCESS_TOKEN. Safe to re-run; cleans up after itself.
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
const adminEmail = `digest-admin-${stamp}@yieldd-test.local`;
const password = `Test-${stamp}-aA1!`;
let adminId = null;
let orgId = null;

try {
  const admin = client();
  const { data: signUp, error: signUpError } = await admin.auth.signUp({
    email: adminEmail,
    password,
    options: {
      data: { full_name: 'Digest Admin', company_name: `Digest Co ${stamp}`, phone: '+919876500091' },
    },
  });
  if (signUpError) throw new Error(`signup: ${signUpError.message}`);
  adminId = signUp.user.id;

  const { data: profile } = await admin.from('profiles').select('organization_id').eq('id', adminId).single();
  orgId = profile.organization_id;

  // Event costing ₹1,00,000, so ROI is a round number to check against.
  const isoDay = (d) => d.toISOString().slice(0, 10);
  const today = new Date();
  const { data: event, error: eventError } = await admin
    .from('events')
    .insert({
      organization_id: orgId,
      created_by: adminId,
      name: 'Digest Expo',
      city: 'Mumbai',
      start_date: isoDay(today),
      end_date: isoDay(today),
      timezone: 'Asia/Kolkata',
      cost_stall_paisa: 10000000, // ₹1,00,000
    })
    .select()
    .single();
  if (eventError) throw new Error(`event: ${eventError.message}`);

  /*
    10 leads, chosen so every number in the email is distinguishable:
      - 2 won, worth ₹35,000 total  -> ROI 35% of the ₹1,00,000 spend
      - 3 with a follow-up date in the past and still open -> "3 pending"
      - 1 with a past follow-up but WON -> must NOT count as pending
      - 1 with a follow-up next week    -> must NOT count as pending
  */
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const spec = [
    { status: 'won', deal: 2000000, follow: null },
    { status: 'won', deal: 1500000, follow: yesterday }, // won AND overdue: not pending
    { status: 'new', deal: null, follow: yesterday },
    { status: 'contacted', deal: null, follow: yesterday },
    { status: 'qualified', deal: null, follow: yesterday },
    { status: 'new', deal: null, follow: nextWeek }, // future: not pending
    { status: 'lost', deal: 500000, follow: yesterday }, // lost: not pending, not won
    { status: 'new', deal: null, follow: null },
    { status: 'new', deal: null, follow: null },
    { status: 'contacted', deal: null, follow: null },
  ];

  const rows = spec.map((s, i) => ({
    id: randomUUID(),
    organization_id: orgId,
    event_id: event.id,
    captured_by: adminId,
    full_name: `Digest Lead ${i + 1}`,
    phone: `+9198000009${String(i).padStart(2, '0')}`,
    status: s.status,
    deal_value_paisa: s.deal,
    follow_up_date: s.follow,
    consent_given: true,
    source: 'manual',
    custom_field_values: {},
  }));

  const { error: leadsError } = await admin.from('leads').insert(rows);
  if (leadsError) throw new Error(`leads: ${leadsError.message}`);

  // "Contacted this week" is activity in the last 7 days, so give exactly 4 of
  // them activity and leave the rest alone.
  const contacted = rows.slice(0, 4).map((r) => ({
    lead_id: r.id,
    actor_id: adminId,
    activity_type: 'note_added',
    metadata: {},
  }));
  const { error: actError } = await admin.from('lead_activity').insert(contacted);
  if (actError) throw new Error(`activity: ${actError.message}`);

  // ---- the aggregate ----
  const [row] = await adminSql(
    `select * from public.weekly_digest_rows() where organization_id = '${orgId}';`
  );
  ok('the organisation appears in the digest', Boolean(row), 'no row returned');

  if (row) {
    eq('total leads', Number(row.total_leads), 10);
    eq('contacted this week counts only recent activity', Number(row.contacted_week), 4);
    eq('pending excludes won, lost and future dates', Number(row.pending_followups), 3);
    eq('deals won', Number(row.deals_won), 2);
    eq('won value excludes the lost lead', Number(row.won_value_paisa), 3500000);
    eq('spend comes from the event cost', Number(row.spend_paisa), 10000000);
    eq('  ...so ROI is 35%', Math.round((row.won_value_paisa / row.spend_paisa) * 100), 35);
    eq('the event named is the one with leads', row.event_name, 'Digest Expo');
  }

  // ---- an org with no leads is not emailed at all ----
  const [empty] = await adminSql(
    `select count(*)::int as n from public.weekly_digest_rows()
     where organization_id in (
       select id from public.organizations where id not in (
         select distinct organization_id from public.leads
       )
     );`
  );
  eq('organisations with no leads are skipped entirely', empty.n, 0);

  // ---- the idempotency guard ----
  const [first] = await adminSql(`select public.claim_weekly_digest('${orgId}') as claimed;`);
  eq('the first claim succeeds', first.claimed, true);

  const [second] = await adminSql(`select public.claim_weekly_digest('${orgId}') as claimed;`);
  eq('an immediate second claim is refused', second.claimed, false);

  // This is the safeguard that protects the support inbox: a retry, a duplicate
  // schedule or two concurrent runs must not each send.
  const [third] = await adminSql(`select public.claim_weekly_digest('${orgId}') as claimed;`);
  eq('  ...and so is a third', third.claimed, false);

  // Once a week has passed it is allowed again.
  await adminSql(
    `update public.organizations set last_digest_sent_at = now() - interval '8 days' where id = '${orgId}';`
  );
  const [later] = await adminSql(`select public.claim_weekly_digest('${orgId}') as claimed;`);
  eq('a week later it sends again', later.claimed, true);

  // ---- the functions are service-role only ----
  const { error: anonRpc } = await client().rpc('weekly_digest_rows');
  ok('an unauthenticated caller cannot read every org\'s figures', Boolean(anonRpc));
  const { error: userRpc } = await admin.rpc('weekly_digest_rows');
  ok('nor can an ordinary signed-in admin', Boolean(userRpc));

  // ---- the function itself, rendering real data, sending nothing ----
  await adminSql(`update public.organizations set last_digest_sent_at = null where id = '${orgId}';`);
  const svc = await serviceKey();
  const res = await fetch(`${URL_}/functions/v1/weekly-digest`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${svc}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ dry_run: true, organization_id: orgId }),
  });
  const body = await res.json();
  eq('the function runs', res.status, 200);
  eq('  ...and considers this organisation', body.considered, 1);
  ok('  ...addressed to the opted-in admin', body.preview?.[0]?.includes(adminEmail), JSON.stringify(body));
  ok(
    '  ...with the summary line MVP_PLAN specifies',
    body.preview?.[0]?.includes('Digest Expo: 10 leads · 4 contacted this week · 3 pending · 2 won (₹35,000) · ROI 35% recovered'),
    JSON.stringify(body.preview)
  );

  const [afterDry] = await adminSql(
    `select last_digest_sent_at from public.organizations where id = '${orgId}';`
  );
  eq('a dry run does NOT consume the weekly slot', afterDry.last_digest_sent_at, null);

  // ---- opting out is honoured ----
  await adminSql(
    `update public.profiles set notifications_enabled = false where id = '${adminId}';`
  );
  const res2 = await fetch(`${URL_}/functions/v1/weekly-digest`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${svc}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ dry_run: true, organization_id: orgId }),
  });
  const body2 = await res2.json();
  eq('someone who turned notifications off gets nothing', body2.preview?.length ?? 0, 0);
  ok(
    '  ...and the reason is recorded',
    body2.skipped?.[0]?.why === 'no opted-in admin',
    JSON.stringify(body2.skipped)
  );
} catch (err) {
  failed++;
  console.log(`FAIL  threw — ${err.message}`);
} finally {
  try {
    if (adminId) {
      await adminSql(`
        do $$
        declare v_org uuid;
        begin
          select organization_id into v_org from public.profiles where id = '${adminId}';
          if v_org is not null then
            delete from public.lead_activity where lead_id in (select id from public.leads where organization_id = v_org);
            delete from public.leads where organization_id = v_org;
            delete from public.event_members where event_id in (select id from public.events where organization_id = v_org);
            delete from public.events where organization_id = v_org;
            delete from public.profiles where organization_id = v_org;
            delete from public.organizations where id = v_org;
          end if;
          delete from auth.users where id = '${adminId}';
        end $$;
      `);
    }
    const [state] = await adminSql(
      `select (select count(*) from auth.users) as users,
              (select count(*) from public.leads) as leads,
              (select count(*) from public.events) as events;`
    );
    console.log('\ncleaned up →', JSON.stringify(state));
  } catch (e) {
    console.log('\nCLEANUP FAILED — remove manually:', adminId, e.message);
  }
}

console.log(`\n${failed === 0 ? 'All checks passed.' : `${failed} check(s) FAILED.`}`);
process.exitCode = failed ? 1 : 0;
