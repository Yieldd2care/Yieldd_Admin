/**
 * Checks for lib/leadSearch.ts — what the lead list's search box will and will
 * not find.
 *
 *   npm run verify:lead-search
 *
 * The phone cases are the reason this exists. Numbers are stored normalised
 * (`+919820441720`) and typed as they are printed (`98204 41720`), so a plain
 * substring match finds nothing and looks like a broken feature rather than a
 * literal one. The assertions below are written as the things a rep would
 * actually type while holding a card.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const out = mkdtempSync(join(tmpdir(), 'yieldd-leadsearch-'));
let m;
try {
  // CommonJS, because leadSearch.ts imports ./phone and tsc emits that specifier
  // without a .js extension, which Node's ESM resolver rejects.
  writeFileSync(join(out, 'package.json'), '{"type":"commonjs"}\n');
  execFileSync(
    process.execPath,
    [
      'node_modules/typescript/bin/tsc',
      // TypeScript 6 makes it an error to have a tsconfig.json present while
      // naming files on the command line. This compile is deliberately
      // standalone — the flag says so instead of letting tsc refuse.
      '--ignoreConfig',
      'lib/leadSearch.ts',
      '--outDir', out,
      '--module', 'commonjs',
      '--target', 'es2022',
      '--skipLibCheck',
      '--typeRoots', out,
    ],
    { stdio: 'inherit' }
  );
  m = await import(pathToFileURL(join(out, 'leadSearch.js')).href);
} finally {
  rmSync(out, { recursive: true, force: true });
}

let failed = 0;
const mark = (pass, name) => {
  if (!pass) failed++;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}`);
};
const hit = (name, query, lead) => mark(m.leadMatchesQuery(lead, query) === true, name);
const miss = (name, query, lead) => mark(m.leadMatchesQuery(lead, query) === false, name);

// A lead as the card scanner leaves it: numbers already normalised to E.164.
const LEAD = {
  name: 'Rajesh Menon',
  company: 'Northline Engineering',
  phone: '+919820441720',
  companyLandline: '+912224931234',
  email: 'rajesh.menon@northline.co.in',
};

// --- name and company, the two that already worked ------------------------
hit('full name', 'Rajesh Menon', LEAD);
hit('just the surname', 'menon', LEAD);
hit('  ...case-insensitively', 'MENON', LEAD);
hit('a fragment mid-word', 'ajes', LEAD);
hit('company', 'northline', LEAD);
hit('surrounding spaces are trimmed', '  menon  ', LEAD);
miss('a name that is not there', 'priya', LEAD);

// --- email, new -----------------------------------------------------------
hit('the whole email', 'rajesh.menon@northline.co.in', LEAD);
hit('the local part', 'rajesh.menon', LEAD);
hit('the domain', 'northline.co.in', LEAD);
hit('  ...case-insensitively', 'RAJESH.MENON@NORTHLINE.CO.IN', LEAD);
miss('a different domain', '@acme.com', LEAD);

// --- mobile number, new. The formatting must not have to match. -----------
hit('the number as printed, with a space', '98204 41720', LEAD);
hit('the number with no spaces', '9820441720', LEAD);
hit('the number with the country code', '+91 98204 41720', LEAD);
hit('the number hyphenated', '98204-41720', LEAD);
hit('the number bracketed', '(+91) 98204 41720', LEAD);
hit('the domestic form with its leading zero', '098204 41720', LEAD);
hit('the last few digits', '41720', LEAD);
hit('the first few digits', '98204', LEAD);
miss('a different number', '9999999999', LEAD);

// --- the company landline counts as a number too --------------------------
hit('the landline', '22249 31234', LEAD);
hit('  ...by its tail', '31234', LEAD);

// --- where a digit search must NOT fire ----------------------------------
// Too short to be a search: a single digit would return every Indian mobile.
miss('one digit is ignored rather than matching everything', '9', LEAD);
miss('two digits are ignored too', '98', LEAD);
// A text query that happens to contain digits must not drag numbers in.
miss('digits inside an address-ish query do not match a number', 'Plot 47', LEAD);

// --- leads missing the optional fields ------------------------------------
const SPARSE = { name: 'Front Desk', company: 'Acme' };
hit('a lead with no phone or email still matches on name', 'front', SPARSE);
miss('  ...and a number search does not crash on it', '9820441720', SPARSE);
miss('  ...nor does an email search', 'a@b.com', SPARSE);

// --- the empty query shows everything -------------------------------------
// The box starts empty, so this is the default state of the screen, not an edge
// case. Returning false here would show an empty list on arrival.
hit('an empty query matches every lead', '', LEAD);
hit('  ...and so does whitespace alone', '   ', LEAD);
hit('  ...even for a lead with almost no fields', '', SPARSE);

console.log(`\n${failed === 0 ? 'All checks passed.' : `${failed} check(s) FAILED.`}`);
process.exitCode = failed ? 1 : 0;
