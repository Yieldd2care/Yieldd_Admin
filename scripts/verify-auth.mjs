// Confirms the error codes mapAuthError() switches on are the ones GoTrue
// actually returns for this project, and that a real sign-in round-trips a
// session + profile. Uses the publishable key exactly as the app does.
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const ENV = fs.readFileSync('d:/Sarfaraz/Yieldd App/.env', 'utf8');
const URL_ = ENV.match(/^EXPO_PUBLIC_SUPABASE_URL=(.*)$/m)[1].trim();
const ANON = ENV.match(/^EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)$/m)[1].trim();
const TOKEN = ENV.match(/^SUPABASE_ACCESS_TOKEN=(.*)$/m)[1].trim();

const sb = createClient(URL_, ANON, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const admin = (query) =>
  fetch('https://api.supabase.com/v1/projects/azpanagwuskruelbwtvb/database/query', {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  }).then((r) => r.text());

let pass = 0, fail = 0;
const check = (label, ok, detail) => {
  if (ok) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  ❌ ${label}\n        -> ${detail}`); }
};

// 1. wrong password
let r = await sb.auth.signInWithPassword({ email: 'care@yieldd.co', password: 'WrongPasswordEntirely' });
check(`wrong password -> code "${r.error?.code}"`, r.error?.code === 'invalid_credentials',
  JSON.stringify({ code: r.error?.code, msg: r.error?.message }));

// 2. unknown account (must look identical — no user enumeration)
r = await sb.auth.signInWithPassword({ email: 'nobody@yieldd.local', password: 'Whatever12345' });
check(`unknown email -> also "invalid_credentials" (no enumeration)`, r.error?.code === 'invalid_credentials',
  JSON.stringify({ code: r.error?.code }));

// 3. duplicate signup
r = await sb.auth.signUp({ email: 'care@yieldd.co', password: 'AnotherPassword123' });
const dupCode = r.error?.code ?? (r.data?.user && !r.data.session ? 'obfuscated_no_session' : 'none');
check(`duplicate email -> code "${dupCode}"`, ['user_already_exists', 'email_exists', 'obfuscated_no_session'].includes(dupCode),
  JSON.stringify({ code: r.error?.code, msg: r.error?.message, hasSession: Boolean(r.data?.session) }));

// 4. weak password
r = await sb.auth.signUp({ email: `weak_${Date.now()}@yieldd.local`, password: 'abc' });
check(`short password -> code "${r.error?.code}"`, r.error?.code === 'weak_password',
  JSON.stringify({ code: r.error?.code, msg: r.error?.message }));

// 5. invalid invite token must raise from the trigger, not create a stray org
const before = await admin('select count(*) as n from public.organizations');
r = await sb.auth.signUp({
  email: `invite_${Date.now()}@yieldd.local`,
  password: 'ValidPassword123',
  options: { data: { full_name: 'Bad Invite', invite_token: 'not-a-real-token' } },
});
const after = await admin('select count(*) as n from public.organizations');
check(`bad invite token -> signup rejected, org count unchanged (${before.trim()} -> ${after.trim()})`,
  Boolean(r.error) && before === after,
  JSON.stringify({ code: r.error?.code, msg: r.error?.message, before, after }));
console.log(`     (mapAuthError renders "${r.error?.code}" as the setup-failure message)`);

// 6. a real sign-in returns a session AND the profile join the app relies on
//    (password unknown to us, so this only runs if one is supplied)
const devPass = process.env.YIELDD_TEST_PASSWORD;
if (devPass) {
  r = await sb.auth.signInWithPassword({ email: 'care@yieldd.co', password: devPass });
  check('real sign-in returns a session', Boolean(r.data?.session), JSON.stringify(r.error));
  if (r.data?.session) {
    const { data, error } = await sb
      .from('profiles')
      .select('id, full_name, email, role, status, designation, phone, avatar_url, created_at, organization_id, organizations!inner(name, plan_tier, onboarding_intent)')
      .eq('id', r.data.session.user.id)
      .single();
    check('the profile+organization join the app uses returns a row',
      Boolean(data) && !error, JSON.stringify(error ?? data));
    if (data) console.log('     ', JSON.stringify(data));
    await sb.auth.signOut();
  }
} else {
  console.log('  ⏭  real sign-in check skipped (set YIELDD_TEST_PASSWORD to run it)');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail === 0 ? 0 : 1;
