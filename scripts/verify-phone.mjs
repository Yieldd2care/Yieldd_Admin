/**
 * Checks for lib/phone.ts — specifically phoneMatchKey, the rule that decides
 * two numbers belong to the same person.
 *
 *   npm run verify:phone
 *
 * This mirrors SQL in migration 20260831090000. If the two ever disagree, a rep
 * either sees a duplicate warning the database will not corroborate, or misses
 * one it would have. The cases below are the ones a business card actually
 * carries in India: the same mobile written five ways, and the overseas buyer
 * whose number must NOT be treated as Indian.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const out = mkdtempSync(join(tmpdir(), 'yieldd-phone-'));
let m;
try {
  execFileSync(
    process.execPath,
    [
      'node_modules/typescript/bin/tsc',
      'lib/phone.ts',
      '--outDir', out,
      '--module', 'esnext',
      '--target', 'es2022',
      '--moduleResolution', 'bundler',
      '--skipLibCheck',
      '--typeRoots', out,
    ],
    { stdio: 'inherit' }
  );
  m = await import(pathToFileURL(join(out, 'phone.js')).href);
} finally {
  rmSync(out, { recursive: true, force: true });
}

let failed = 0;
const eq = (name, actual, expected) => {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  if (!pass) failed++;
  console.log(
    `${pass ? 'PASS' : 'FAIL'}  ${name}` +
      (pass ? '' : `\n        got  ${JSON.stringify(actual)}\n        want ${JSON.stringify(expected)}`)
  );
};

// --- one Indian mobile, written the ways people write it ---
// Every one of these is 98204 41720. Before this change, the duplicate check
// compared them as strings and matched none of them against each other.
const SAME = [
  '9820441720',
  '+91 98204 41720',
  '98204 41720',
  '098204 41720',
  '+919820441720',
  '(0982) 044-1720',
  '+91-98204-41720',
];
for (const written of SAME) {
  eq(`"${written}" keys to the same mobile`, m.phoneMatchKey(written), '9820441720');
}

// --- too little to identify anyone ---
// The gate that makes typing safe: a rep entering a number digit by digit must
// not flash a duplicate warning at the customer halfway through.
eq('3 digits is not a number yet', m.phoneMatchKey('982'), null);
eq('7 digits is still under the floor', m.phoneMatchKey('9820441'), null);
eq('empty string', m.phoneMatchKey(''), null);
eq('undefined', m.phoneMatchKey(undefined), null);
eq('null', m.phoneMatchKey(null), null);
eq('letters only', m.phoneMatchKey('call me'), null);
eq('8 digits is exactly at the floor', m.phoneMatchKey('24931234'), '24931234');

// --- the overseas buyer ---
// This is the case that killed the normalise-on-write approach. normalizePhone
// turns a bare US number into +914155550134 — a real Indian-looking number that
// is not this person. Comparing trailing digits gets both forms right without
// guessing at anyone's country.
eq('US number with country code', m.phoneMatchKey('+1 415-555-0134'), '4155550134');
eq('the same US number bare', m.phoneMatchKey('4155550134'), '4155550134');
eq(
  'both US forms agree',
  m.phoneMatchKey('+1 415-555-0134') === m.phoneMatchKey('4155550134'),
  true
);

// --- and they must NOT collide with the Indian one ---
eq(
  'a US number does not match an Indian one',
  m.phoneMatchKey('+1 415-555-0134') === m.phoneMatchKey('9820441720'),
  false
);

// --- normalizePhone is still lossy; this records WHY it is not used here ---
eq('normalizePhone would call a US number Indian', m.normalizePhone('4155550134'), '+914155550134');
eq('normalizePhone mangles a short landline', m.normalizePhone('2493 1234'), '+24931234');

console.log(`\n${failed === 0 ? 'All checks passed.' : `${failed} check(s) FAILED.`}`);
process.exit(failed ? 1 : 0);
