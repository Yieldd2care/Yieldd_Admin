/**
 * End-to-end check of password reset against the LIVE project.
 *
 *   node --env-file=.env scripts/verify-password-reset.mjs
 *
 * The whole point of this feature is that someone locked out gets back in
 * WITHOUT an admin, so the assertions are about exactly that: the new password
 * works, and the old one stops working. A reset that leaves the old password
 * valid is not a reset — it is an extra password.
 *
 * The recovery link is produced with the admin API rather than read out of an
 * inbox, so this runs unattended. That the email actually leaves Gmail was
 * confirmed separately when SMTP was switched on.
 *
 * Needs SUPABASE_ACCESS_TOKEN. Safe to re-run; cleans up after itself.
 */
import { createClient } from '@supabase/supabase-js';

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
const email = `reset-${stamp}@yieldd-test.local`;
const OLD_PASSWORD = `Old-${stamp}-aA1!`;
const NEW_PASSWORD = `New-${stamp}-zZ9!`;
let userId = null;

try {
  // ---- a real account, signed in with the old password ----
  const a = client();
  const { data: signUp, error: signUpError } = await a.auth.signUp({
    email,
    password: OLD_PASSWORD,
    options: {
      data: { full_name: 'Reset Test', company_name: `Reset Co ${stamp}`, phone: '+919876500081' },
    },
  });
  if (signUpError) throw new Error(`signup: ${signUpError.message}`);
  userId = signUp.user.id;

  const { error: beforeError } = await client().auth.signInWithPassword({
    email,
    password: OLD_PASSWORD,
  });
  eq('the old password works to begin with', beforeError, null);

  // ---- 1. asking for a reset ----
  // The app calls exactly this. A non-2xx here means SMTP is misconfigured.
  const { error: requestError } = await client().auth.resetPasswordForEmail(email, {
    redirectTo: 'https://yieldd.co/auth/reset-password',
  });
  eq('requesting a reset is accepted', requestError, null);

  // ---- 2. an address with no account must look identical ----
  // Otherwise the form is a free membership check: type an email, learn whether
  // that person uses Yieldd.
  const { error: unknownError } = await client().auth.resetPasswordForEmail(
    `nobody-${stamp}@yieldd-test.local`,
    { redirectTo: 'https://yieldd.co/auth/reset-password' }
  );
  eq('an unknown address is answered the same way', unknownError, null);

  // ---- 3. follow the link ----
  const key = await serviceKey();
  ok('service role key available for the link', Boolean(key));
  const admin = createClient(URL_, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: 'https://yieldd.co/auth/reset-password' },
  });
  eq('a recovery link is issued', linkError, null);
  ok('  ...pointing at /auth/reset-password', String(link?.properties?.action_link ?? '').includes('reset-password'));

  // Clicking it is what detectSessionInUrl does on the web page: exchange the
  // token for a session. That session is what authorises the change.
  const recovering = client();
  const { data: verified, error: verifyError } = await recovering.auth.verifyOtp({
    type: 'recovery',
    token_hash: link.properties.hashed_token,
  });
  eq('following the link produces a session', verifyError, null);
  ok('  ...for the right account', verified?.user?.id === userId);

  // ---- 4. set the new password ----
  const { error: updateError } = await recovering.auth.updateUser({ password: NEW_PASSWORD });
  eq('the new password saves', updateError, null);

  // ---- 5. the two assertions that matter ----
  const { error: newLoginError } = await client().auth.signInWithPassword({
    email,
    password: NEW_PASSWORD,
  });
  eq('the NEW password signs in', newLoginError, null);

  const { error: oldLoginError } = await client().auth.signInWithPassword({
    email,
    password: OLD_PASSWORD,
  });
  ok('the OLD password no longer works', Boolean(oldLoginError), 'the old password still signs in');
  eq('  ...rejected as bad credentials', oldLoginError?.code, 'invalid_credentials');

  // ---- 6. the link is single-use ----
  // It arrives by email, and email gets forwarded, backed up and synced.
  const { error: replayError } = await client().auth.verifyOtp({
    type: 'recovery',
    token_hash: link.properties.hashed_token,
  });
  ok('the same link cannot be used twice', Boolean(replayError), 'a used recovery link still works');
} catch (err) {
  failed++;
  console.log(`FAIL  threw — ${err.message}`);
} finally {
  try {
    if (userId) {
      await adminSql(`
        do $$
        declare v_org uuid;
        begin
          select organization_id into v_org from public.profiles where id = '${userId}';
          if v_org is not null then
            delete from public.profiles where organization_id = v_org;
            delete from public.organizations where id = v_org;
          end if;
          delete from auth.users where id = '${userId}';
        end $$;
      `);
    }
    const [state] = await adminSql(
      `select (select count(*) from auth.users) as users,
              (select count(*) from public.organizations) as orgs;`
    );
    console.log('\ncleaned up →', JSON.stringify(state));
  } catch (e) {
    console.log('\nCLEANUP FAILED — remove manually:', userId, e.message);
  }
}

console.log(`\n${failed === 0 ? 'All checks passed.' : `${failed} check(s) FAILED.`}`);
process.exitCode = failed ? 1 : 0;
