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
      // TypeScript 6 makes it an error to have a tsconfig.json present while
      // naming files on the command line. This compile is deliberately
      // standalone — the flag says so instead of letting tsc refuse.
      '--ignoreConfig',
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

// --- describePhoneProblem: the warning on the two invite screens ---
//
// A WARNING, NEVER A GATE (PENDING 52, decided 2026-09-15). So the half that
// matters most is the silent half: every shape below is one a real address book
// holds and a dialler copes with, and every one of them creates an invite today.
// If any of these starts warning, the screen is nagging about working numbers.
const SILENT = [
  ['a bare Indian mobile', '9820441720'],
  ['the same with a country code', '+91 98204 41720'],
  ['an extension written with x', '022 2493 1234 x 204'],
  ['an extension written with ext', '+91 22 2493 1234 ext 45'],
  ['a dial pause', '9820441720,,123'],
  ['a semicolon pause', '9820441720;123'],
  ['two numbers separated by a slash', '98204 41720 / 22 2493 1234'],
  ['a unicode non-breaking hyphen', '+91 98204‑41720'],
  ['an en dash', '+91 98204–41720'],
  ['a US number', '+1 415-555-0134'],
  ['brackets and dots', '(0982) 044.1720'],
  // Empty is not ready to send, but it is not wrong either, and saying so to
  // someone who has not typed anything yet helps nobody.
  ['an empty box', ''],
  ['spaces only', '   '],
];
for (const [what, written] of SILENT) {
  eq(`${what} says nothing`, m.describePhoneProblem(written), null);
}

// --- and the half that must speak up ---
const warns = (written) => typeof m.describePhoneProblem(written) === 'string';
eq('a USSD service code warns', warns('*123#'), true);
eq('a voicemail shortcut warns', warns('*99*1#'), true);
eq('three digits warns', warns('982'), true);
eq('letters with no number warns', warns('call me'), true);
// 8 digits. normalizePhone turns it into +24931234 (asserted above), which
// belongs to nobody — so the STD code is genuinely missing, not merely terse.
eq('a landline without its STD code warns', warns('2493 1234'), true);
eq('nine digits is still under the floor', warns('982044172'), true);
eq('ten digits is exactly at the floor', warns('9820441720'), false);

// Plain words, not "invalid" — this text is read by an admin mid-invite.
eq(
  'the short warning names the problem',
  m.describePhoneProblem('982'),
  'That looks too short for a phone number.'
);
eq(
  'a dial code is called a dial code',
  m.describePhoneProblem('*123#'),
  'That looks like a dial code, not a number a message can reach.'
);
// Item 37 took em dashes out of everything a user reads; this is new such text.
for (const written of ['982', '*123#', 'call me']) {
  eq(`no em dash in the warning for "${written}"`, m.describePhoneProblem(written).includes('—'), false);
}

// The normalised form is what the created-invite rows re-check, so the same
// function has to read `+123` the same way it read `*123#`.
eq('the warning survives normalisation', warns(m.normalizePhone('*123#')), true);

// --- the two checks are deliberately different, and that is the point ---
// isValidPhone is a gate and stays strict; describePhoneProblem is a warning and
// stays loose. If these ever agree, one of them has been "tidied up" and invites
// that send today have started being refused.
eq('isValidPhone refuses an extension', m.isValidPhone('022 2493 1234 x 204'), false);
eq('the warning allows the same extension', m.describePhoneProblem('022 2493 1234 x 204'), null);

console.log(`\n${failed === 0 ? 'All checks passed.' : `${failed} check(s) FAILED.`}`);
process.exit(failed ? 1 : 0);
