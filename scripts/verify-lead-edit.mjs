/**
 * Checks for lib/leadEdit.ts — what a save actually writes.
 *
 *   npm run verify:lead-edit
 *
 * The rule being protected is "only send what moved". `editLead` merges the
 * patch into an outbox entry and every key in it is written to the row, so a
 * field the rep never touched must not appear: if it does, opening the form
 * and pressing Save would quietly stamp the rep's stale copy over whatever
 * someone changed from the dashboard in the meantime. That failure leaves no
 * error behind and nobody would report it as an edit bug, which is exactly
 * why it is asserted here.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const out = mkdtempSync(join(tmpdir(), 'yieldd-leadedit-'));
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
      'lib/leadEdit.ts',
      '--outDir', out,
      '--module', 'commonjs',
      '--target', 'es2022',
      '--skipLibCheck',
      '--typeRoots', out,
      // The CustomFieldValue import pulls data/leads.ts into the program, so
      // tsc would otherwise widen the common root and emit to lib/. Pinning
      // the root makes the layout predictable and the file is read back from
      // its mirrored path — the same arrangement as verify-roi-pdf.
      '--rootDir', '.',
    ],
    { stdio: 'inherit' }
  );
  m = await import(pathToFileURL(join(out, 'lib', 'leadEdit.js')).href);
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

// A lead as the reader left it, with several fields never filled in.
const LEAD = {
  name: 'Rajesh Menon',
  phone: '+919820441720',
  company: 'Northline Engineering',
  email: 'rajesh.menon@northline.co.in',
  designation: 'Purchase Head',
  note: 'Wants the 40-tonne press quote.',
  customFieldValues: { budget: 'Over 10L', urgent: true },
};

/** The form as the screen fills it: every key present, blanks as ''. */
const formFrom = (lead, overrides = {}) => ({
  name: lead.name ?? '',
  phone: lead.phone ?? '',
  company: lead.company ?? '',
  email: lead.email ?? '',
  designation: lead.designation ?? '',
  companyLandline: lead.companyLandline ?? '',
  companyWebsite: lead.companyWebsite ?? '',
  companyAddress: lead.companyAddress ?? '',
  branchAddress: lead.branchAddress ?? '',
  note: lead.note ?? '',
  customFieldValues: lead.customFieldValues ?? {},
  ...overrides,
});

// --- the whole point: an untouched form writes nothing --------------------
eq('opening the form and closing it writes nothing', m.leadEditPatch(LEAD, formFrom(LEAD)), {});
mark(
  m.canSaveLeadEdits(m.leadEditPatch(LEAD, formFrom(LEAD)), formFrom(LEAD)) === false,
  '  ...and Save is not offered');

// Every field the lead never had shows as '' in the form. Without the trim
// rule each of those would read as a change and one save would null the row.
const SPARSE = { name: 'Front Desk' };
eq('a lead with almost nothing set still writes nothing', m.leadEditPatch(SPARSE, formFrom(SPARSE)), {});

// --- one field changed sends one field ------------------------------------
eq(
  'a corrected digit sends the phone alone',
  m.leadEditPatch(LEAD, formFrom(LEAD, { phone: '+919820441721' })),
  { phone: '+919820441721' }
);
eq(
  'a corrected name sends the name alone',
  m.leadEditPatch(LEAD, formFrom(LEAD, { name: 'Rajesh Menon Nair' })),
  { name: 'Rajesh Menon Nair' }
);
eq(
  'two changes send two keys',
  m.leadEditPatch(LEAD, formFrom(LEAD, { company: 'Northline Engg', designation: 'GM Purchase' })),
  { company: 'Northline Engg', designation: 'GM Purchase' }
);

// --- filling in something that was blank ----------------------------------
eq(
  'filling a field the card never had sends it',
  m.leadEditPatch(LEAD, formFrom(LEAD, { branchAddress: 'Plot 47, MIDC Bhosari' })),
  { branchAddress: 'Plot 47, MIDC Bhosari' }
);

// --- clearing a field is a real edit --------------------------------------
// A number the reader got wrong is better absent than wrong, so emptying has
// to reach the server rather than being mistaken for "unchanged".
eq(
  'clearing a wrong number sends the empty value',
  m.leadEditPatch(LEAD, formFrom(LEAD, { phone: '' })),
  { phone: '' }
);

// --- whitespace is not a change -------------------------------------------
eq(
  'trailing spaces alone are not an edit',
  m.leadEditPatch(LEAD, formFrom(LEAD, { name: 'Rajesh Menon   ' })),
  {}
);
eq(
  'a field that was blank and is now spaces is not an edit',
  m.leadEditPatch(LEAD, formFrom(LEAD, { companyWebsite: '   ' })),
  {}
);

// --- custom answers -------------------------------------------------------
eq(
  'the same answers in a different order are not an edit',
  m.leadEditPatch(LEAD, formFrom(LEAD, { customFieldValues: { urgent: true, budget: 'Over 10L' } })),
  {}
);
eq(
  'a changed answer sends the whole map, because the column is written whole',
  m.leadEditPatch(LEAD, formFrom(LEAD, { customFieldValues: { budget: 'Under 5L', urgent: true } })),
  { customFieldValues: { budget: 'Under 5L', urgent: true } }
);
eq(
  'an added answer counts',
  m.leadEditPatch(LEAD, formFrom(LEAD, { customFieldValues: { budget: 'Over 10L', urgent: true, demo: false } })),
  { customFieldValues: { budget: 'Over 10L', urgent: true, demo: false } }
);
eq(
  'a removed answer counts',
  m.leadEditPatch(LEAD, formFrom(LEAD, { customFieldValues: { budget: 'Over 10L' } })),
  { customFieldValues: { budget: 'Over 10L' } }
);
// `false` and `0` are answers, not absences — a checkbox ticked off is a
// deliberate act and must not be swallowed by a truthiness test.
eq(
  'an answer of false is still an answer',
  m.leadEditPatch({ name: 'A', customFieldValues: { urgent: true } }, formFrom({ name: 'A' }, { customFieldValues: { urgent: false } })),
  { customFieldValues: { urgent: false } }
);

// --- status and the other paid fields can never come out of this form -----
// They have their own sheets and their own locks; a key for one of them
// appearing here would be a way around the paywall as well as a surprise.
const FORBIDDEN = ['status', 'dealValue', 'followUpDate', 'assignedToId', 'temperature', 'reviewedAt'];
const everything = m.leadEditPatch(
  LEAD,
  formFrom(LEAD, {
    name: 'X',
    phone: 'Y',
    company: 'Z',
    email: 'a@b.c',
    designation: 'D',
    companyLandline: 'L',
    companyWebsite: 'W',
    companyAddress: 'A',
    branchAddress: 'B',
    note: 'N',
    customFieldValues: { other: 1 },
  })
);
for (const key of FORBIDDEN) {
  mark(!(key in everything), `${key} is never written by the edit form`);
}

// --- saving is allowed only with a name and a change ----------------------
const withChange = m.leadEditPatch(LEAD, formFrom(LEAD, { company: 'Other' }));
mark(m.canSaveLeadEdits(withChange, formFrom(LEAD, { company: 'Other' })) === true, 'a real change can be saved');
const noName = formFrom(LEAD, { name: '' });
mark(
  m.canSaveLeadEdits(m.leadEditPatch(LEAD, noName), noName) === false,
  'a lead cannot be left with no name');
const spacesName = formFrom(LEAD, { name: '   ' });
mark(
  m.canSaveLeadEdits(m.leadEditPatch(LEAD, spacesName), spacesName) === false,
  '  ...and spaces do not count as one');

console.log(`\n${failed === 0 ? 'All checks passed.' : `${failed} check(s) FAILED.`}`);
process.exitCode = failed ? 1 : 0;
