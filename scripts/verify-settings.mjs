/**
 * Checks the Settings screen's data path against the LIVE database.
 *
 *   node --env-file=.env scripts/verify-settings.mjs
 *
 * Everything on that screen used to be local state or hardcoded: the plan badge
 * said "Pro plan · Renews 12 Mar 2027" to every account including free ones, the
 * notifications toggle was a useState that forgot on close, and the company
 * category lived on one device while `organizations.category` sat unused.
 *
 * The interesting assertions are the boundaries. A rep must be able to set their
 * OWN notification preference but must not be able to rename their employer's
 * category — and `org_admin_update` matches zero rows for a rep rather than
 * raising, so a screen that trusts `error` would report success on a write that
 * never happened. That is asserted by reading the value back, not by trusting
 * the absence of an error.
 *
 * Needs SUPABASE_ACCESS_TOKEN for cleanup. Safe to re-run.
 */
import { createClient } from '@supabase/supabase-js';

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
const adminEmail = `settings-admin-${stamp}@yieldd-test.local`;
const repEmail = `settings-rep-${stamp}@yieldd-test.local`;
const password = `Test-${stamp}-aA1!`;

let adminId = null;
let repId = null;

// The exact column list the app selects. If PROFILE_SELECT gains a column and
// this is not updated, the app reads something this never checked.
const PROFILE_COLS = 'notifications_enabled, role, status';

try {
  const admin = client();
  const { data: signUp, error: signUpError } = await admin.auth.signUp({
    email: adminEmail,
    password,
    options: {
      data: { full_name: 'Settings Admin', company_name: `Settings Co ${stamp}`, phone: '+919876500071' },
    },
  });
  if (signUpError) throw new Error(`signup: ${signUpError.message}`);
  adminId = signUp.user.id;

  const { data: profile } = await admin.from('profiles').select('organization_id').eq('id', adminId).single();
  const orgId = profile.organization_id;

  // ---- 1. a brand-new organisation is on Free ----
  // The badge used to say Pro to everyone. This is the state it must render for.
  const { data: freshOrg } = await admin
    .from('organizations')
    .select('plan_tier, seats_included, seats_purchased, category')
    .eq('id', orgId)
    .single();
  eq('a new organisation starts on the free plan', freshOrg.plan_tier, 'free');
  eq('  ...with one seat', freshOrg.seats_included + freshOrg.seats_purchased, 1);
  eq('  ...and no category set', freshOrg.category, null);

  // ---- 2. notifications default on, and persist ----
  const { data: beforeToggle } = await admin.from('profiles').select(PROFILE_COLS).eq('id', adminId).single();
  eq('notifications default to on', beforeToggle.notifications_enabled, true);

  const { error: offError } = await admin
    .from('profiles')
    .update({ notifications_enabled: false })
    .eq('id', adminId);
  eq('turning notifications off is allowed', offError, null);

  const { data: afterOff } = await admin.from('profiles').select(PROFILE_COLS).eq('id', adminId).single();
  eq('  ...and it actually persisted', afterOff.notifications_enabled, false);
  eq('  ...without changing the role', afterOff.role, 'admin');

  await admin.from('profiles').update({ notifications_enabled: true }).eq('id', adminId);
  const { data: afterOn } = await admin.from('profiles').select(PROFILE_COLS).eq('id', adminId).single();
  eq('and back on again', afterOn.notifications_enabled, true);

  // ---- 3. an admin sets the company category ----
  const { data: catRows, error: catError } = await admin
    .from('organizations')
    .update({ category: 'Machine Tools' })
    .eq('id', orgId)
    .select('category');
  eq('an admin can set the category', catError, null);
  eq('  ...and the write matched a row', catRows?.length, 1);
  eq('  ...with the value stored', catRows?.[0]?.category, 'Machine Tools');

  // ---- 4. a rep joins ----
  const { data: invite, error: inviteError } = await admin
    .from('invites')
    .insert({
      organization_id: orgId,
      invited_by: adminId,
      full_name: 'Settings Rep',
      email: repEmail,
      phone: '+919876500072',
      role: 'rep',
    })
    .select()
    .single();
  if (inviteError) throw new Error(`invite: ${inviteError.message}`);

  const rep = client();
  const { data: repSignUp, error: repError } = await rep.auth.signUp({
    email: repEmail,
    password,
    options: { data: { full_name: 'Settings Rep', invite_token: invite.token } },
  });
  if (repError) throw new Error(`rep signup: ${repError.message}`);
  repId = repSignUp.user.id;

  // ---- 5. the rep controls their OWN notifications ----
  const { error: repOwnError } = await rep
    .from('profiles')
    .update({ notifications_enabled: false })
    .eq('id', repId);
  eq('a rep can set their own notification preference', repOwnError, null);
  const { data: repAfter } = await rep.from('profiles').select(PROFILE_COLS).eq('id', repId).single();
  eq('  ...and it persisted', repAfter.notifications_enabled, false);

  // ---- 6. but NOT the admin's ----
  const { data: crossRows } = await rep
    .from('profiles')
    .update({ notifications_enabled: false })
    .eq('id', adminId)
    .select('id');
  eq("a rep cannot change someone else's preference", crossRows?.length ?? 0, 0);
  const { data: adminStill } = await admin.from('profiles').select(PROFILE_COLS).eq('id', adminId).single();
  eq('  ...the admin is untouched', adminStill.notifications_enabled, true);

  // ---- 7. and NOT the company category ----
  // The screen tells a rep this is admins-only up front, because the write is a
  // silent no-op rather than an error.
  const { data: repCatRows, error: repCatError } = await rep
    .from('organizations')
    .update({ category: 'Something Else' })
    .eq('id', orgId)
    .select('category');
  eq('a rep changing the category matches zero rows', repCatRows?.length ?? 0, 0);
  eq('  ...and does NOT raise, which is why the screen must not trust `error`', repCatError, null);

  const { data: categoryNow } = await admin
    .from('organizations')
    .select('category')
    .eq('id', orgId)
    .single();
  eq('  ...the category is unchanged', categoryNow.category, 'Machine Tools');

  // ---- 8. message templates: the ones the send path actually reads ----
  // The settings editor used to write to a device-local store while every
  // WhatsApp and email send read this table, so a rewritten follow-up changed
  // nothing about what the customer received.
  const { data: created, error: createError } = await admin
    .from('message_templates')
    .insert({
      organization_id: orgId,
      created_by: adminId,
      channel: 'whatsapp',
      name: 'Post-show follow-up',
      body: 'Hi {{name}}, great meeting you at {{event}}.',
      is_default: true,
    })
    .select()
    .single();
  eq('an admin can create a template', createError, null);
  eq('  ...stored against the organisation', created?.organization_id, orgId);
  eq('  ...as the default', created?.is_default, true);

  // A WhatsApp template must not carry a subject — there is a CHECK for it.
  const { error: subjectError } = await admin
    .from('message_templates')
    .insert({
      organization_id: orgId,
      created_by: adminId,
      channel: 'whatsapp',
      name: 'Bad one',
      subject: 'WhatsApp has no subject line',
      body: 'x',
    });
  eq('a WhatsApp template cannot have a subject line', Boolean(subjectError), true);

  // Only one default per channel — a partial unique index enforces it, which is
  // why the UI invalidates the whole list rather than patching one row.
  const { error: twoDefaultsError } = await admin.from('message_templates').insert({
    organization_id: orgId,
    created_by: adminId,
    channel: 'whatsapp',
    name: 'Second default',
    body: 'y',
    is_default: true,
  });
  eq('a channel cannot have two defaults', Boolean(twoDefaultsError), true);

  // The rep must be able to READ them — they are what their follow-ups send.
  const { data: repSees } = await rep.from('message_templates').select('id, name');
  eq('a rep can read the team templates', repSees?.length, 1);

  // ...but not rewrite what the whole team sends.
  const { data: repEditRows, error: repEditError } = await rep
    .from('message_templates')
    .update({ body: 'Buy my own thing instead' })
    .eq('id', created.id)
    .select('id');
  eq('a rep cannot edit a team template', repEditRows?.length ?? 0, 0);

  const { data: bodyNow } = await admin
    .from('message_templates')
    .select('body')
    .eq('id', created.id)
    .single();
  eq('  ...and the body is untouched', bodyNow.body, 'Hi {{name}}, great meeting you at {{event}}.');
  void repEditError;

  // ---- 9. a rep cannot promote themselves ----
  // Guarded by enforce_profile_update_rules(); asserted here because the
  // Settings screen is where a role is displayed.
  const { error: roleError } = await rep.from('profiles').update({ role: 'admin' }).eq('id', repId);
  eq('a rep cannot make themselves an admin', Boolean(roleError), true);
} catch (err) {
  failed++;
  console.log(`FAIL  threw — ${err.message}`);
} finally {
  try {
    for (const id of [repId, adminId].filter(Boolean)) {
      await adminSql(`
        do $$
        declare v_org uuid;
        begin
          select organization_id into v_org from public.profiles where id = '${id}';
          if v_org is not null then
            delete from public.invites where organization_id = v_org;
            delete from public.message_templates where organization_id = v_org;
            delete from public.profiles where organization_id = v_org;
            delete from public.organizations where id = v_org;
          end if;
          delete from auth.users where id = '${id}';
        end $$;
      `);
    }
    const [state] = await adminSql(
      `select (select count(*) from auth.users) as users,
              (select count(*) from public.organizations) as orgs;`
    );
    console.log('\ncleaned up →', JSON.stringify(state));
  } catch (e) {
    console.log('\nCLEANUP FAILED — remove manually:', adminId, repId, e.message);
  }
}

console.log(`\n${failed === 0 ? 'All checks passed.' : `${failed} check(s) FAILED.`}`);
process.exitCode = failed ? 1 : 0;
