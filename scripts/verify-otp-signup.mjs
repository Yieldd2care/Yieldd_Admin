/**
 * Checks signing up with an emailed code (PENDING #33a), against the LIVE
 * project.
 *
 *   npm run verify:otp
 *
 * Every assertion here guards something that fails SILENTLY — no type error, no
 * failing build, nothing visible until a stranger tries to create an account.
 *
 * The first one is the reason the file exists. On 2026-09-14 both email
 * templates contained only {{ .ConfirmationURL }} and no {{ .Token }} — so the
 * email arrived with a link and nothing to type, and a code-entry screen would
 * have sat there waiting for a code that was never sent. Nothing in the
 * codebase would have caught that. Someone editing the template back in the
 * dashboard would reintroduce it just as quietly.
 *
 * Creates throwaway users and deletes them again. Needs SUPABASE_ACCESS_TOKEN.
 */
import { createClient } from '@supabase/supabase-js';

const REF = 'azpanagwuskruelbwtvb';
const MGMT = process.env.SUPABASE_ACCESS_TOKEN;
const URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!MGMT || !URL || !ANON) {
  console.error('Needs SUPABASE_ACCESS_TOKEN, EXPO_PUBLIC_SUPABASE_URL and the anon key.');
  console.error('Run with: node --env-file=.env scripts/verify-otp-signup.mjs');
  process.exit(1);
}

let failed = 0;
const mark = (pass, name) => {
  if (!pass) failed++;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}`);
};

async function mgmt(path, init = {}) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${MGMT}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}
const sql = (query) => mgmt('/database/query', { method: 'POST', body: JSON.stringify({ query }) });

const stamp = Date.now();
const probe = `otp-verify-${stamp}@yieldd.co`;
const invited = `otp-invited-${stamp}@yieldd.co`;

try {
  // --- the email actually contains a code ---------------------------------
  const cfg = await mgmt('/config/auth');
  const hasToken = (t) => /\{\{\s*\.Token\s*\}\}/.test(t ?? '');

  mark(hasToken(cfg.mailer_templates_magic_link_content),
    'the magic-link email contains {{ .Token }} — something to type');
  mark(hasToken(cfg.mailer_templates_confirmation_content),
    'the confirmation email contains {{ .Token }} too');
  mark(cfg.mailer_otp_length === 6,
    `the code is 6 digits (Supabase's minimum), got ${cfg.mailer_otp_length}`);
  // Password reset is a LINK, not a code, and must stay that way — the screen
  // it opens lives on the website. See lib/auth/passwordReset.ts.
  mark(/ConfirmationURL/.test(cfg.mailer_templates_recovery_content ?? ''),
    'password reset is still a link, not a code');

  // --- a new address does not get in without the code ---------------------
  const anon = createClient(URL, ANON);
  const { data: sent, error: sendErr } = await anon.auth.signInWithOtp({
    email: probe,
    options: { shouldCreateUser: true },
  });
  mark(!sendErr, `a code can be requested for a new address${sendErr ? ` (${sendErr.message})` : ''}`);
  mark(sent?.session == null,
    'no session is handed back before the code is entered — the code really gates it');

  // --- signing IN with a code cannot quietly create an account ------------
  const { error: noCreate } = await anon.auth.signInWithOtp({
    email: `otp-nobody-${stamp}@yieldd.co`,
    options: { shouldCreateUser: false },
  });
  mark(Boolean(noCreate), 'shouldCreateUser:false refuses an unknown address');
  const nobody = await sql(`select count(*) as n from auth.users where email = 'otp-nobody-${stamp}@yieldd.co'`);
  mark(Number(nobody?.[0]?.n ?? 1) === 0, '  ...and creates no user while refusing');

  // --- handle_new_user() copes with an email-only signup ------------------
  const row = await sql(`
    select p.full_name, p.phone, p.role::text as role, o.name as org
      from auth.users u
      join public.profiles p on p.id = u.id
      join public.organizations o on o.id = p.organization_id
     where u.email = '${probe}'`);
  const p = row?.[0];
  mark(p?.full_name === 'New user', `an email-only signup is named "New user", got ${JSON.stringify(p?.full_name)}`);
  mark(p?.org === 'My workspace', `  ...in an org called "My workspace", got ${JSON.stringify(p?.org)}`);
  mark(p?.role === 'admin', '  ...as an admin of their own organisation');
  mark(p?.phone === null, '  ...with no number yet, which is what sends them to complete-profile');

  // --- the code verifies, with type 'email' -------------------------------
  const keys = await mgmt('/api-keys');
  const service = keys.find((k) => k.name === 'service_role')?.api_key ?? null;
  mark(Boolean(service), 'a service_role key is available for the admin checks');

  if (service) {
    const link = await fetch(`${URL}/auth/v1/admin/generate_link`, {
      method: 'POST',
      headers: { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'magiclink', email: probe }),
    }).then((r) => r.json());

    // GoTrue returns email_otp at the TOP level here, not under `properties`
    // as the docs' older examples show. Both are read so a version bump in
    // either direction does not silently return undefined and make every
    // assertion below meaningless.
    const otp = link?.email_otp ?? link?.properties?.email_otp ?? null;
    mark(typeof otp === 'string' && otp.length === 6, `the issued code is 6 digits, got ${otp?.length}`);

    // A wrong code is refused. Same length, so this tests the code and not the
    // length check in front of it.
    const wrong = String(otp === '000000' ? '111111' : '000000');
    const { error: wrongErr } = await createClient(URL, ANON).auth.verifyOtp({
      email: probe, token: wrong, type: 'email',
    });
    mark(Boolean(wrongErr), 'a wrong code is refused');

    const c = createClient(URL, ANON);
    const { data: ok, error: okErr } = await c.auth.verifyOtp({ email: probe, token: otp, type: 'email' });
    mark(!okErr && Boolean(ok?.session), `type:'email' is what verifies the code${okErr ? ` (${okErr.message})` : ''}`);

    // Replay. A code that still works after being used is a real vulnerability
    // — verify-password-reset.mjs tests the same thing for reset links.
    const { error: replay } = await createClient(URL, ANON).auth.verifyOtp({
      email: probe, token: otp, type: 'email',
    });
    mark(Boolean(replay), 'a used code cannot be used a second time');
  }

  // --- an invite token survives the code path -----------------------------
  // This is the highest-value assertion here. The account is created when the
  // code is SENT, so the token has to be attached to that call. Get it wrong
  // and every invited rep lands in a brand new org of their own, silently.
  // `invites.invited_by` is NOT NULL, so the row needs a real admin to hang
  // off — pick an existing one rather than inventing an id.
  const host = await sql(`
    select p.id::text as admin_id, p.organization_id::text as org_id
      from public.profiles p
      join public.organizations o on o.id = p.organization_id
     where p.role = 'admin' and o.name <> 'My workspace'
     order by p.created_at
     limit 1`);
  const orgId = host?.[0]?.org_id ?? null;
  const adminId = host?.[0]?.admin_id ?? null;

  if (orgId && adminId) {
    const token = `verify-otp-${stamp}`;
    await sql(`
      insert into public.invites (organization_id, invited_by, email, role, token, status, expires_at, phone)
      values ('${orgId}', '${adminId}', '${invited}', 'rep', '${token}', 'pending', now() + interval '1 hour', null)`);

    const { error: invErr } = await createClient(URL, ANON).auth.signInWithOtp({
      email: invited,
      options: { shouldCreateUser: true, data: { invite_token: token } },
    });
    mark(!invErr, `an invited rep can request a code${invErr ? ` (${invErr.message})` : ''}`);

    const joined = await sql(`
      select p.role::text as role, p.organization_id::text as org_id
        from auth.users u join public.profiles p on p.id = u.id
       where u.email = '${invited}'`);
    mark(joined?.[0]?.org_id === orgId,
      'the invite token carried through signInWithOtp — they joined the INVITING org');
    mark(joined?.[0]?.role === 'rep', '  ...as a rep, not an admin');
  } else {
    mark(false, 'could not find a real organisation to test the invite path against');
  }
} catch (e) {
  console.log('FAIL  suite threw:', e.message);
  failed++;
} finally {
  try {
    await sql(`delete from public.invites where token like 'verify-otp-%'`);

    // The organisation has to be collected BEFORE the user goes: deleting a
    // user cascades to their profile but leaves the org standing, and an org
    // with no members is invisible junk that nothing else will ever clear up.
    // Captured by id rather than matched on 'My workspace' afterwards, so this
    // can never delete a real signup that happens to be mid-flight.
    const orgs = await sql(`
      select distinct p.organization_id::text as id
        from auth.users u join public.profiles p on p.id = u.id
       where u.email like 'otp-verify-%' or u.email like 'otp-invited-%' or u.email like 'otp-nobody-%'`);

    const gone = await sql(`
      delete from auth.users
       where email like 'otp-verify-%' or email like 'otp-invited-%' or email like 'otp-nobody-%'
       returning email`);

    let orgsRemoved = 0;
    for (const { id } of orgs ?? []) {
      // Only if it is now empty — the invited rep joins a REAL organisation and
      // that one must obviously survive.
      const res = await sql(`
        delete from public.organizations o
         where o.id = '${id}'
           and not exists (select 1 from public.profiles p where p.organization_id = o.id)
         returning o.id`);
      orgsRemoved += res?.length ?? 0;
    }

    console.log(`\ncleanup: removed ${gone?.length ?? 0} throwaway account(s) and ${orgsRemoved} empty org(s)`);
  } catch (e) {
    console.log(`\nCLEANUP FAILED — remove ${probe} and ${invited} by hand:`, e.message);
    failed++;
  }
}

console.log(`\n${failed === 0 ? 'All checks passed.' : `${failed} check(s) FAILED.`}`);
process.exitCode = failed ? 1 : 0;
