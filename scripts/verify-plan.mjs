/**
 * Checks for lib/plan.ts — which features are locked, how the plan is read,
 * and the two things a lock sheet must never grow.
 *
 *   npm run verify:plan
 *
 * The last group is the point of this file. Selling moves to the website only
 * (PENDING #27a), and the price is undecided (PENDING #11), so the catalogue
 * must not quote a figure or offer a way to pay. Both are easy to add back in
 * a hurry and neither shows up in a typecheck; an in-app purchase path for a
 * subscription is also the thing Play rejects builds over. So they are
 * asserted rather than left to memory.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const out = mkdtempSync(join(tmpdir(), 'yieldd-plan-'));
let m;
try {
  writeFileSync(join(out, 'package.json'), '{"type":"commonjs"}\n');
  execFileSync(
    process.execPath,
    [
      'node_modules/typescript/bin/tsc',
      // TypeScript 6 makes it an error to have a tsconfig.json present while
      // naming files on the command line. This compile is deliberately
      // standalone — the flag says so instead of letting tsc refuse.
      '--ignoreConfig',
      'lib/plan.ts',
      '--outDir', out,
      '--module', 'commonjs',
      '--target', 'es2022',
      '--skipLibCheck',
      '--typeRoots', out,
    ],
    { stdio: 'inherit' }
  );
  m = await import(pathToFileURL(join(out, 'plan.js')).href);
} finally {
  rmSync(out, { recursive: true, force: true });
}

let failed = 0;
const mark = (pass, name) => {
  if (!pass) failed++;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}`);
};

// --- reading the plan -----------------------------------------------------
// The organisation is the authority. The copy on the profile is a snapshot
// taken at sign-in, so an upgrade bought on the website lands on the
// organisation first and the profile stays stale until the next refresh.
mark(m.isProPlan('pro', 'free') === true, 'the organisation wins over a stale profile');
mark(m.isProPlan('free', 'pro') === false, '  ...in both directions');
mark(m.isProPlan(undefined, 'pro') === true, 'the profile is used when the org has not loaded');
mark(m.isProPlan(null, 'pro') === true, '  ...whether it is undefined or null');
mark(m.isProPlan(undefined, undefined) === false, 'knowing nothing means Free, not Pro');
mark(m.isProPlan('', '') === false, '  ...and so does an empty tier');
// Free is the safe direction to be wrong in: it shows an explanation, where
// the other way round hands out a paid feature and no one finds out.
mark(m.isProPlan('Pro', undefined) === false, 'the tier is matched exactly, not loosely');

// --- what is in the catalogue --------------------------------------------
const ids = Object.keys(m.PRO_FEATURES);
const LOCKED = [
  'follow-ups',
  'roi',
  'team',
  'custom-fields',
  'event-templates',
  'lead-status',
  'reassign',
];
for (const id of LOCKED) {
  mark(ids.includes(id), `${id} is locked`);
}

// Everything MVP_PLAN names under "What Free gets" must stay out of here.
// Excel export is the one that keeps being argued about: the published terms
// promise it at any time, so a lock on it would contradict the website.
const MUST_STAY_FREE = ['export', 'excel-export', 'card-scan', 'digital-card', 'save-contact', 'whatsapp', 'email'];
for (const id of MUST_STAY_FREE) {
  mark(!ids.includes(id), `${id} is NOT locked — it is in "What Free gets"`);
}

// --- every entry is usable as a sheet ------------------------------------
for (const id of ids) {
  const f = m.PRO_FEATURES[id];
  mark(typeof f.title === 'string' && f.title.trim().length > 0, `${id} has a title`);
  mark(typeof f.what === 'string' && f.what.trim().length > 10, `  ...and says what it does`);
  // Never left empty. A lock that only says "no" is the version reps hate;
  // saying what they can do today is what makes it an explanation.
  mark(
    typeof f.insteadOnFree === 'string' && f.insteadOnFree.trim().length > 10,
    `  ...and what to do instead on Free`
  );
}

// --- an id that is not in the catalogue ----------------------------------
// The sheet falls back to generic copy rather than rendering blank, so a typo
// in a call site is visible rather than silent.
mark(m.proFeature('roi') !== null, 'a known id resolves');
mark(m.proFeature('not-a-feature') === null, 'an unknown id resolves to null, not a crash');
mark(m.proFeature(undefined) === null, '  ...and so does a missing one');

// --- no price, no purchase ------------------------------------------------
const copy = Object.values(m.PRO_FEATURES)
  .flatMap((f) => [f.title, f.what, f.insteadOnFree])
  .join(' ');

mark(!/\d[\d,]{2,}/.test(copy), 'no price figure appears in the catalogue');
mark(!/₹|&#8377;|Rs\.?\s*\d/i.test(copy), '  ...nor a rupee amount in any spelling');
mark(
  !/\b(buy|purchase|pay|checkout|upi|subscribe)\b/i.test(copy),
  'no wording that promises a way to pay inside the app'
);
mark(
  typeof m.PRO_SITE_URL === 'string' && m.PRO_SITE_URL.startsWith('https://'),
  'the site link is https'
);
mark(
  typeof m.PRO_CONTACT_EMAIL === 'string' && m.PRO_CONTACT_EMAIL.includes('@'),
  'there is a real address to write to'
);

console.log(`\n${failed === 0 ? 'All checks passed.' : `${failed} check(s) FAILED.`}`);
process.exitCode = failed ? 1 : 0;
