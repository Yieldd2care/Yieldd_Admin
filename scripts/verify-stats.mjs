/**
 * End-to-end check of the event figures against the LIVE database.
 *
 *   node --env-file=.env scripts/verify-stats.mjs
 *
 * Creates a throwaway organisation with a known set of leads, asserts every
 * number the ROI screen and the dashboard show, then deletes everything it
 * made. It exercises the case that cannot be tested any other way: a rep can
 * only read their own leads, so the totals MUST come from the server or
 * cost-per-lead divides the full event cost by a fraction of the leads.
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
const adminEmail = `stats-admin-${stamp}@yieldd-test.local`;
const repEmail = `stats-rep-${stamp}@yieldd-test.local`;
const password = `Test-${stamp}-aA1!`;

// IST hours 0 and 1 today. Both are always in the past for anyone in IST, and
// they pin the hourly chart to an exact expected shape.
const istNow = new Date(Date.now() + 5.5 * 3600_000);
const istY = istNow.getUTCFullYear();
const istM = istNow.getUTCMonth();
const istD = istNow.getUTCDate();
const atIstHour = (hour) => new Date(Date.UTC(istY, istM, istD, hour - 5, -30)).toISOString();

let adminId = null;
let repId = null;
let orgId = null;

try {
  const admin = client();
  const { data: signUp, error: signUpError } = await admin.auth.signUp({
    email: adminEmail,
    password,
    options: { data: { full_name: 'Stats Admin', company_name: `Stats Co ${stamp}`, phone: '+919876500001' } },
  });
  if (signUpError) throw new Error(`signup: ${signUpError.message}`);
  adminId = signUp.user.id;

  const { data: profile } = await admin.from('profiles').select('organization_id').eq('id', adminId).single();
  orgId = profile.organization_id;

  // Event cost: stall ₹1,00,000 + travel ₹50,000 = ₹1,50,000.
  const today = new Date();
  const isoDay = (d) => d.toISOString().slice(0, 10);
  const end = new Date(today);
  end.setDate(end.getDate() + 2);

  const { data: event, error: eventError } = await admin
    .from('events')
    .insert({
      organization_id: orgId,
      created_by: adminId,
      name: 'Stats Expo',
      city: 'Mumbai',
      start_date: isoDay(today),
      end_date: isoDay(end),
      timezone: 'Asia/Kolkata',
      cost_stall_paisa: 10000000,
      cost_travel_paisa: 5000000,
      leaderboard_visible_to_reps: true,
    })
    .select()
    .single();
  if (eventError) throw new Error(`event: ${eventError.message}`);
  eq('event cost sums to ₹1,50,000', event.total_cost_paisa, 15000000);

  // 10 leads: 4 new, 2 contacted, 1 qualified, 2 won, 1 lost.
  // Won values ₹1,00,000 + ₹2,00,000 = ₹3,00,000.
  // The Lost lead carries ₹50,000 that must NOT be counted.
  const spec = [
    ...Array.from({ length: 4 }, () => ({ status: 'new', deal: null, hour: 0 })),
    ...Array.from({ length: 2 }, () => ({ status: 'contacted', deal: null, hour: 0 })),
    { status: 'qualified', deal: null, hour: 1 },
    { status: 'won', deal: 10000000, hour: 1 },
    { status: 'won', deal: 20000000, hour: 1 },
    { status: 'lost', deal: 5000000, hour: 1 },
  ];

  const rows = spec.map((item, i) => ({
    id: randomUUID(),
    organization_id: orgId,
    event_id: event.id,
    captured_by: adminId,
    full_name: `Lead ${i + 1}`,
    phone: `+9198000000${String(i).padStart(2, '0')}`,
    status: item.status,
    deal_value_paisa: item.deal,
    consent_given: i % 2 === 0,
    note: i < 3 ? 'spoke at the stall' : null,
    source: 'manual',
    created_at: atIstHour(item.hour),
    custom_field_values: {},
  }));

  const { error: leadsError } = await admin.from('leads').insert(rows);
  if (leadsError) throw new Error(`leads: ${leadsError.message}`);

  // ---- as the admin ----
  const { data: statsRows, error: statsError } = await admin.rpc('event_stats', { p_event_id: event.id });
  if (statsError) throw new Error(`event_stats: ${statsError.message}`);
  const st = statsRows[0];

  eq('total leads', Number(st.total_leads), 10);
  eq('leads today', Number(st.leads_today), 10);
  eq('deals won', Number(st.deals_won), 2);
  eq('pipeline counts [new, contacted, qualified, won, lost]',
    [st.count_new, st.count_contacted, st.count_qualified, st.count_won, st.count_lost].map(Number),
    [4, 2, 1, 2, 1]);
  eq('pipeline sums to the total',
    [st.count_new, st.count_contacted, st.count_qualified, st.count_won, st.count_lost]
      .reduce((s, n) => s + Number(n), 0),
    10);
  eq('won value EXCLUDES the ₹50,000 on the Lost lead', Number(st.won_value_paisa), 30000000);
  eq('spend is the generated event total', Number(st.spend_paisa), 15000000);
  eq('leads needing a note', Number(st.needs_note), 7);
  eq('consent given', Number(st.consent_given), 5);

  // The formulas the screen applies to those inputs.
  const roi = ((Number(st.won_value_paisa) - Number(st.spend_paisa)) / Number(st.spend_paisa)) * 100;
  eq('ROI is +100% (₹3L won on ₹1.5L spent)', roi, 100);
  eq('cost per lead is ₹15,000', Math.round(Number(st.spend_paisa) / 10), 1500000);
  eq('cost per won deal is ₹75,000', Math.round(Number(st.spend_paisa) / 2), 7500000);
  eq('conversion is 20%', (2 / 10) * 100, 20);

  const { data: hours, error: hourlyError } = await admin.rpc('event_hourly_capture', { p_event_id: event.id });
  if (hourlyError) throw new Error(`hourly: ${hourlyError.message}`);
  eq('all 24 hours come back, empty ones included', hours.length, 24);
  eq('6 leads at 12am IST', Number(hours.find((h) => h.hour_of_day === 0).lead_count), 6);
  eq('4 leads at 1am IST', Number(hours.find((h) => h.hour_of_day === 1).lead_count), 4);
  eq('hours sum to leads captured today',
    hours.reduce((s, h) => s + Number(h.lead_count), 0), 10);

  const { data: board, error: boardError } = await admin.rpc('event_leaderboard', { p_event_id: event.id });
  if (boardError) throw new Error(`leaderboard: ${boardError.message}`);
  eq('leaderboard has the one member', board.length, 1);
  eq('their lead count', Number(board[0].lead_count), 10);
  eq('their won count', Number(board[0].deals_won), 2);

  // ---- as a rep who can only see their own leads (none) ----
  const { data: invite, error: inviteError } = await admin
    .from('invites')
    .insert({ organization_id: orgId, invited_by: adminId, event_id: event.id, full_name: 'Stats Rep', email: repEmail, phone: '+919876500002', role: 'rep' })
    .select()
    .single();
  if (inviteError) throw new Error(`invite: ${inviteError.message}`);

  const rep = client();
  const { data: repSignUp, error: repError } = await rep.auth.signUp({
    email: repEmail,
    password,
    options: { data: { full_name: 'Stats Rep', invite_token: invite.token } },
  });
  if (repError) throw new Error(`rep signup: ${repError.message}`);
  repId = repSignUp.user.id;

  const { data: repProfile } = await rep.from('profiles').select('role, organization_id').eq('id', repId).single();
  eq('the invited rep joins the same org as a rep',
    [repProfile.role, repProfile.organization_id === orgId], ['rep', true]);

  // This is the whole reason the aggregate is server-side.
  const { data: repLeads } = await rep.from('leads').select('id');
  eq('the rep can read NONE of the admin\'s leads directly', repLeads?.length ?? 0, 0);

  const { data: repStatsRows, error: repStatsError } = await rep.rpc('event_stats', { p_event_id: event.id });
  if (repStatsError) throw new Error(`rep event_stats: ${repStatsError.message}`);
  const rs = repStatsRows[0];

  eq('but the rep still gets the REAL total, not 0', Number(rs.total_leads), 10);
  eq('and the real pipeline',
    [rs.count_new, rs.count_contacted, rs.count_qualified, rs.count_won, rs.count_lost].map(Number),
    [4, 2, 1, 2, 1]);
  eq('money is withheld from the rep: won value', rs.won_value_paisa, null);
  eq('money is withheld from the rep: event spend', rs.spend_paisa, null);

  const { data: repBoard, error: repBoardError } = await rep.rpc('event_leaderboard', { p_event_id: event.id });
  // Two members now: the admin who built the event and the rep who just joined.
  eq('the rep sees the leaderboard while the event shares it',
    [Boolean(repBoardError), repBoard?.length], [false, 2]);
  eq('the rep appears on it with zero captures so far',
    Number(repBoard?.find((r) => r.profile_id === repId)?.lead_count), 0);
  eq('the admin still shows all 10',
    Number(repBoard?.find((r) => r.profile_id === adminId)?.lead_count), 10);

  await admin.from('events').update({ leaderboard_visible_to_reps: false }).eq('id', event.id);
  const { error: hiddenError } = await rep.rpc('event_leaderboard', { p_event_id: event.id });
  ok('turning the toggle off hides it from the rep', Boolean(hiddenError));

  // An outsider must not reach any of it.
  const outsider = client();
  const { error: outsiderError } = await outsider.rpc('event_stats', { p_event_id: event.id });
  ok('a signed-out caller is refused', Boolean(outsiderError));
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
  process.exit(failed ? 1 : 0);
}
