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

// --- describePhoneProblem: the live warning on the two invite screens ---
//
// A WARNING, NEVER A GATE (PENDING 52). It is recomputed on every keystroke, so
// the first thing to protect is the silent half: a number written in any of the
// ordinary ways must go quiet the moment its tenth digit lands, or the screen is
// nagging about numbers that work.
const SILENT = [
  ['a bare Indian mobile', '9820441720'],
  ['the same with a country code', '+91 98204 41720'],
  // The country code is taken off before counting, exactly as normalizePhone
  // takes it off. Otherwise every number typed in full reads as "too long" —
  // including the dashboard's own placeholder.
  ['a country code with the plus forgotten', '919820441720'],
  ['the domestic STD form with its leading zero', '098204 41720'],
  ['brackets, dots and a leading zero', '(0982) 044.1720'],
  ['a unicode non-breaking hyphen', '+91 98204‑41720'],
  ['an en dash', '+91 98204–41720'],
  // A visiting buyer. There is no honest way to tell someone from another
  // country that their national number is the wrong length, so an explicit
  // + that is not +91 is only measured against E.164.
  ['a US number', '+1 415-555-0134'],
  ['a Singapore number', '+65 8123 4567'],
  ['a UK mobile', '+44 7700 900123'],
  // Empty is not ready to send, but it is not wrong either, and saying so to
  // someone who has not typed anything yet helps nobody.
  ['an empty box', ''],
  ['spaces only', '   '],
];
for (const [what, written] of SILENT) {
  eq(`${what} says nothing`, m.describePhoneProblem(written), null);
}

// --- too short ---
const SHORT = 'That looks too short for a phone number.';
eq('three digits', m.describePhoneProblem('982'), SHORT);
eq('nine digits, one short', m.describePhoneProblem('982044172'), SHORT);
// normalizePhone turns this into +24931234 (asserted above), which belongs to
// nobody — the STD code is genuinely missing, not merely terse.
eq('a landline without its STD code', m.describePhoneProblem('2493 1234'), SHORT);
eq('an overseas number under the E.164 floor', m.describePhoneProblem('+1 415'), SHORT);

// --- too long ---
//
// Everything below is a real thing people write and a dialler copes with. The
// wa.me link does not: it is built from the digits run together, so an extension
// or a second number is carried into it and the message reaches nobody. Hence
// warned about — and, as everywhere here, still sent if that is what they want.
const LONG = 'That looks too long for a phone number.';
eq('eleven digits, one over', m.describePhoneProblem('98204417201'), LONG);
eq('an extension written with x', m.describePhoneProblem('022 2493 1234 x 204'), LONG);
eq('an extension written with ext', m.describePhoneProblem('+91 22 2493 1234 ext 45'), LONG);
eq('a dial pause', m.describePhoneProblem('9820441720,,123'), LONG);
eq('two numbers separated by a slash', m.describePhoneProblem('98204 41720 / 22 2493 1234'), LONG);
eq('an overseas number past the E.164 ceiling', m.describePhoneProblem('+1 4155550134555555'), LONG);

// --- not a number at all ---
const warns = (written) => typeof m.describePhoneProblem(written) === 'string';
eq('a USSD service code warns', warns('*123#'), true);
eq('a voicemail shortcut warns', warns('*99*1#'), true);
eq('letters with no number warns', warns('call me'), true);
eq(
  'a dial code is called a dial code',
  m.describePhoneProblem('*123#'),
  'That looks like a dial code, not a number a message can reach.'
);

// The tenth digit is the moment it goes quiet, and the eleventh the moment it
// speaks again. This is the whole behaviour someone sees while typing.
eq('nine digits speaks', warns('982044172'), true);
eq('ten digits is silent', warns('9820441720'), false);
eq('eleven digits speaks again', warns('98204417201'), true);

// Item 37 took em dashes out of everything a user reads; this is new such text.
for (const written of ['982', '98204417201', '*123#', 'call me']) {
  eq(`no em dash in the warning for "${written}"`, m.describePhoneProblem(written).includes('—'), false);
}

// The normalised form is what the created-invite rows re-check, so the same
// function has to read what was stored the way it read what was typed.
eq('the warning survives normalisation', warns(m.normalizePhone('*123#')), true);
eq('a good number is still silent once normalised', warns(m.normalizePhone('9820441720')), false);

// --- the two checks are deliberately different, and that is the point ---
// isValidPhone is a gate and stays strict: it REFUSES a value, so its callers
// depend on it. describePhoneProblem only ever produces a sentence. If these are
// ever collapsed into one, a gate inherits a warning's tolerance or a warning
// inherits a gate's refusal, and both are wrong.
eq('isValidPhone refuses an extension outright', m.isValidPhone('022 2493 1234 x 204'), false);
eq('the warning only describes it', typeof m.describePhoneProblem('022 2493 1234 x 204'), 'string');
eq('isValidPhone accepts a 15-digit string', m.isValidPhone('+123456789012345'), true);

console.log(`\n${failed === 0 ? 'All checks passed.' : `${failed} check(s) FAILED.`}`);
process.exit(failed ? 1 : 0);
