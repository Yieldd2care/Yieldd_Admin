/**
 * Checks lib/referral.ts — the two option lists for "where did you hear about
 * us?" (#33b), and the one thing about them that fails at runtime rather than
 * at compile time.
 *
 *   npm run verify:referral
 *
 * That one thing is the last group below. referral_source carries a CHECK
 * constraint listing its allowed values, so an option added to lib/referral.ts
 * and not to the migration is not a type error, not a test failure, and not
 * visible anywhere until a real person taps it during signup and the database
 * rejects the write. So this file reads the migration, parses the constraint,
 * and asserts the two lists are the same set.
 *
 * The order assertions matter too: the lists were decided by the user on
 * 2026-09-14 and the order is theirs, not alphabetical. A well-meaning tidy-up
 * is exactly the kind of change nobody notices in review.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const MIGRATION = 'supabase/migrations/20260914120000_org_referral_source.sql';

const out = mkdtempSync(join(tmpdir(), 'yieldd-referral-'));
let m;
try {
  writeFileSync(join(out, 'package.json'), '{"type":"commonjs"}\n');
  execFileSync(
    process.execPath,
    [
      'node_modules/typescript/bin/tsc',
      // Standalone compile, same arrangement as verify-plan.mjs. lib/referral.ts
      // has no imports, so the output lands flat in the tmpdir root.
      '--ignoreConfig',
      'lib/referral.ts',
      '--outDir', out,
      '--module', 'commonjs',
      '--target', 'es2022',
      '--skipLibCheck',
      '--typeRoots', out,
    ],
    { stdio: 'inherit' }
  );
  m = await import(pathToFileURL(join(out, 'referral.js')).href);
} finally {
  rmSync(out, { recursive: true, force: true });
}

let failed = 0;
const mark = (pass, name) => {
  if (!pass) failed++;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}`);
};
const eq = (name, actual, expected) =>
  mark(JSON.stringify(actual) === JSON.stringify(expected), name);

// --- the seven, in the order the user decided -----------------------------
eq(
  'the top-level options are the seven that were decided, in order',
  m.REFERRAL_SOURCES.map((o) => o.id),
  ['google', 'social', 'ai', 'friends', 'colleague', 'event', 'other']
);
eq(
  '  ...and their wording is unchanged',
  m.REFERRAL_SOURCES.map((o) => o.label),
  ['Google', 'Social media', 'AI discovery', 'Friends', 'Colleague', 'Event or conference', 'Other']
);

// --- the two sub-lists ----------------------------------------------------
eq('the social platforms are in the decided order', m.SOCIAL_PLATFORMS, [
  'LinkedIn', 'Instagram', 'YouTube', 'WhatsApp', 'Facebook', 'X',
]);
eq('the AI platforms are in the decided order', m.AI_PLATFORMS, [
  'ChatGPT', 'Gemini', 'Perplexity', 'Claude', 'Copilot',
]);

// --- nothing duplicated, nothing empty ------------------------------------
const ids = m.REFERRAL_SOURCES.map((o) => o.id);
mark(new Set(ids).size === ids.length, 'no id appears twice');
mark(
  new Set(m.SOCIAL_PLATFORMS).size === m.SOCIAL_PLATFORMS.length &&
    new Set(m.AI_PLATFORMS).size === m.AI_PLATFORMS.length,
  '  ...and no platform appears twice within its list'
);
for (const o of m.REFERRAL_SOURCES) {
  mark(typeof o.label === 'string' && o.label.trim().length > 0, `${o.id} has a label`);
}

// Every stored string has to fit the column. referral_detail is checked at
// 60 characters in the migration; a longer platform name is a rejected write.
for (const p of [...m.SOCIAL_PLATFORMS, ...m.AI_PLATFORMS]) {
  mark(p.trim().length > 0 && p.length <= 60, `"${p}" fits referral_detail's 60-char limit`);
}
for (const id of ids) {
  mark(id.length <= 60, `  ...and the id "${id}" fits referral_source's`);
}

// --- which answers open a second list -------------------------------------
mark(m.detailOptionsFor('social') === m.SOCIAL_PLATFORMS, 'Social media opens the social list');
mark(m.detailOptionsFor('ai') === m.AI_PLATFORMS, 'AI discovery opens the AI list');
for (const id of ids.filter((i) => i !== 'social' && i !== 'ai')) {
  mark(m.detailOptionsFor(id) === null, `${id} opens no second list`);
}
mark(m.detailOptionsFor(null) === null, 'no answer opens no second list');
mark(m.detailOptionsFor('not-an-option') === null, 'an unknown id opens none either, not a crash');

// --- the two values that are storable but never offered -------------------
// Both are real values of the column. Neither is an answer a person can pick,
// and keeping them out of REFERRAL_SOURCES is the only thing guaranteeing the
// screen cannot render "skipped" or "predates" as a tappable card.
mark(!ids.includes(m.REFERRAL_SKIPPED), "'skipped' is never offered as an option");
mark(!ids.includes(m.REFERRAL_PREDATES), "'predates' is never offered as an option");
mark(m.REFERRAL_SKIPPED !== m.REFERRAL_PREDATES, 'a skip is recorded differently from never having been asked');

// --- what counts as an answer worth saving --------------------------------
mark(m.isCompleteAnswer('google', null) === true, 'Google alone is a complete answer');
mark(m.isCompleteAnswer('social', null) === false, 'Social media alone is not — it needs a platform');
mark(m.isCompleteAnswer('ai', null) === false, '  ...and neither is AI discovery');
mark(m.isCompleteAnswer('social', 'LinkedIn') === true, 'Social media plus a platform is');
mark(m.isCompleteAnswer('social', 'ChatGPT') === false, 'a platform from the wrong list is not accepted');
mark(m.isCompleteAnswer(null, null) === false, 'answering nothing is not a complete answer');
mark(m.isCompleteAnswer('skipped', null) === false, 'a skip is not submitted through the Continue button');
mark(m.isCompleteAnswer('not-an-option', null) === false, 'an unknown id is not a complete answer');

// --- the app and the database agree on the value list ---------------------
// This is the point of the file. See the header.
const sql = readFileSync(MIGRATION, 'utf8');
const constraint = sql.match(/organizations_referral_source_valid[\s\S]*?in\s*\(([\s\S]*?)\)/);
mark(Boolean(constraint), 'the migration still declares organizations_referral_source_valid');

if (constraint) {
  const inDatabase = [...constraint[1].matchAll(/'([^']+)'/g)].map((x) => x[1]).sort();
  const inApp = [...ids, m.REFERRAL_SKIPPED, m.REFERRAL_PREDATES].sort();

  eq('every value lib/referral.ts can store is allowed by the CHECK constraint', inApp, inDatabase);

  for (const id of inApp) {
    mark(inDatabase.includes(id), `  ${id} would be accepted by the database`);
  }
  for (const id of inDatabase) {
    mark(inApp.includes(id), `  the constraint's "${id}" is still a value the app knows`);
  }
}

// The grant is the other half that fails at runtime rather than at build time.
mark(
  /grant\s+update\s*\(\s*referral_source\s*,\s*referral_detail\s*\)\s+on\s+public\.organizations\s+to\s+authenticated/i.test(sql),
  'the migration grants UPDATE on both columns — column ACLs do not extend to new columns'
);
mark(
  /update\s+public\.organizations[\s\S]*?set\s+referral_source\s*=\s*'predates'/i.test(sql),
  'organisations that predate the question are backfilled, so nobody existing is asked'
);

console.log(`\n${failed === 0 ? 'All checks passed.' : `${failed} check(s) FAILED.`}`);
process.exitCode = failed ? 1 : 0;
