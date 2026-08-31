/**
 * End-to-end check of the `summarise-company` Edge Function against the LIVE
 * project.
 *
 *   node --env-file=.env scripts/verify-summary.mjs
 *
 * The website this function fetches comes out of OCR on a photograph of a
 * business card. That makes it attacker-influenced input pointed at a
 * server-side fetch, so most of what is asserted here is the refusal: a private
 * IP, an internal hostname, a non-HTTP scheme and an odd port must all be turned
 * away rather than requested. The happy path is checked too, but the SSRF guard
 * is the reason this file exists.
 *
 * Also asserts the per-domain cache, which is what stops forty reps at one stall
 * each paying to read the same exhibitor's homepage.
 *
 * Needs SUPABASE_ACCESS_TOKEN for cleanup. Safe to re-run. Costs a few Anthropic
 * tokens on the cold read.
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

const stamp = Date.now();
const email = `summary-${stamp}@yieldd-test.local`;
const password = `Test-${stamp}-aA1!`;
let userId = null;

const client = () =>
  createClient(URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

const c = client();

/** Returns { status, body, ms } — never throws, so a refusal is inspectable. */
const call = async (body) => {
  const started = Date.now();
  const { data, error } = await c.functions.invoke('summarise-company', { body });
  const ms = Date.now() - started;
  if (error) {
    let parsed = null;
    try {
      parsed = await error.context.json();
    } catch {
      /* no JSON body */
    }
    return { status: error.context?.status ?? 0, body: parsed, ms };
  }
  return { status: 200, body: data, ms };
};

// The cache is keyed by domain, so a repeat run would otherwise read a summary
// left behind by the previous one and the "cold read" assertion would be a lie.
//
// Two different strings on purpose: the function is CALLED with the www form a
// business card would carry, but it stores the registrable domain. That is the
// point of the cache — www.acme.com and acme.com are one exhibitor, read once —
// so the row is looked up under the bare form.
const TEST_HOST = 'www.anthropic.com';
const TEST_DOMAIN = 'anthropic.com';

try {
  const { data: signUp, error: signUpError } = await c.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: 'Summary Test', company_name: `Summary Co ${stamp}`, phone: '+919876500099' },
    },
  });
  if (signUpError) throw new Error(`signup: ${signUpError.message}`);
  userId = signUp.user.id;

  await adminSql(`delete from public.company_summaries where domain = '${TEST_DOMAIN}';`);

  // ---- 1. the happy path: a real site, read cold ----
  const cold = await call({ website: `https://${TEST_HOST}`, company_name: 'Anthropic', refresh: false });
  ok('a real company website returns a summary', Boolean(cold.body?.summary), JSON.stringify(cold.body));
  if (cold.body?.summary) {
    console.log(`        "${cold.body.summary}"`);
    ok('  ...of a usable length', cold.body.summary.length > 40 && cold.body.summary.length < 1200);
    ok('  ...and it cites the pages it read', Array.isArray(cold.body.sources) && cold.body.sources.length > 0);
  }
  eq('  ...and the cold read is not marked cached', cold.body?.cached ?? false, false);

  // ---- 2. the cache ----
  // Forty reps at one stall must not each pay to read the same homepage.
  const warm = await call({ website: `https://${TEST_HOST}`, company_name: 'Anthropic', refresh: false });
  eq('the second read comes back cached', warm.body?.cached, true);
  ok(`  ...and is much faster (${cold.ms}ms cold vs ${warm.ms}ms cached)`, warm.ms < cold.ms);
  eq('  ...with the same text', warm.body?.summary, cold.body?.summary);

  const [cacheRow] = await adminSql(
    `select count(*)::int as n from public.company_summaries where domain = '${TEST_DOMAIN}';`
  );
  eq('exactly one cache row per domain', cacheRow.n, 1);

  // ---- 3. the SSRF guard ----
  // Every one of these is a URL that OCR could plausibly produce from a doctored
  // card, aimed at something the function's own network can reach.
  const mustRefuse = [
    ['a loopback address', 'http://127.0.0.1/admin'],
    ['a private LAN address', 'http://192.168.1.1/'],
    ['the cloud metadata endpoint', 'http://169.254.169.254/latest/meta-data/'],
    ['an internal single-label host', 'http://intranet/'],
    ['a .local hostname', 'http://printer.local/'],
    ['a file:// URL', 'file:///etc/passwd'],
    ['a javascript: URL', 'javascript:alert(1)'],
    ['an odd port', 'http://example.com:22/'],
  ];
  for (const [label, website] of mustRefuse) {
    const res = await call({ website, company_name: 'Probe', refresh: false });
    ok(`refuses ${label}`, !res.body?.summary, `got a summary back: ${JSON.stringify(res.body)}`);
  }

  // ---- 4. honest failures, not invented text ----
  // The whole reason this feature was rebuilt: the old version wrote a fluent
  // paragraph from the company NAME alone, about a company nobody looked up.
  const noSite = await call({ website: '', company_name: 'Northline Industries', refresh: false });
  ok('no website means no summary', !noSite.body?.summary, JSON.stringify(noSite.body));

  const dead = await call({
    website: 'https://this-domain-does-not-exist-9f8a7b.example',
    company_name: 'Northline Industries',
    refresh: false,
  });
  ok('an unreachable site means no summary', !dead.body?.summary, JSON.stringify(dead.body));

  // ---- 5. signed out ----
  const anon = client();
  const { error: anonError } = await anon.functions.invoke('summarise-company', {
    body: { website: `https://${TEST_HOST}`, company_name: 'Anthropic', refresh: false },
  });
  ok('an unauthenticated caller is refused', Boolean(anonError));
} catch (err) {
  failed++;
  console.log(`FAIL  threw — ${err.message}`);
} finally {
  try {
    await adminSql(`delete from public.company_summaries where domain = '${TEST_DOMAIN}';`);
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
              (select count(*) from public.organizations) as orgs,
              (select count(*) from public.company_summaries) as cached;`
    );
    console.log('\ncleaned up →', JSON.stringify(state));
  } catch (e) {
    console.log('\nCLEANUP FAILED — remove manually:', userId, e.message);
  }
}

console.log(`\n${failed === 0 ? 'All checks passed.' : `${failed} check(s) FAILED.`}`);
process.exitCode = failed ? 1 : 0;
