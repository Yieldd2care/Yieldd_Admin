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

/**
 * The form as the screen fills it: every key present, blanks as ''.
 *
 * The three families are ONE list each with the primary at [0], which is what
 * the screen holds and what listFrom() in leads/edit.tsx builds. The split back
 * into phone + extra_phones happens inside leadEditPatch and is what most of
 * the cases below are checking.
 */
const formFrom = (lead, overrides = {}) => ({
  name: lead.name ?? '',
  phones: [lead.phone ?? '', ...(lead.extraPhones ?? [])],
  company: lead.company ?? '',
  emails: [lead.email ?? '', ...(lead.extraEmails ?? [])],
  designations: [lead.designation ?? '', ...(lead.extraDesignations ?? [])],
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
  m.leadEditPatch(LEAD, formFrom(LEAD, { phones: ['+919820441721'] })),
  { phone: '+919820441721' }
);
eq(
  'a corrected name sends the name alone',
  m.leadEditPatch(LEAD, formFrom(LEAD, { name: 'Rajesh Menon Nair' })),
  { name: 'Rajesh Menon Nair' }
);
eq(
  'two changes send two keys',
  m.leadEditPatch(LEAD, formFrom(LEAD, { company: 'Northline Engg', designations: ['GM Purchase'] })),
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
  m.leadEditPatch(LEAD, formFrom(LEAD, { phones: [''] })),
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

// --- several numbers, emails and titles on one lead -----------------------
//
// The form holds one list per family. leadEditPatch splits it back into the
// primary column and the extras column, and each half is sent ONLY if it
// moved - the same "only what actually moved" rule as every case above, which
// matters more here because the extras are written whole.

const MANY = {
  ...LEAD,
  extraPhones: ['+912240001234'],
  extraDesignations: ['Director'],
};

eq('opening a lead with extras and closing it writes nothing', m.leadEditPatch(MANY, formFrom(MANY)), {});

// The screen always shows a spare empty row to type the next value into.
// Without dropping blanks, merely looking at the form would write one.
eq(
  'a blank row left at the end is not an edit',
  m.leadEditPatch(MANY, formFrom(MANY, { phones: [LEAD.phone, '+912240001234', ''] })),
  {}
);

// The primary did not move, so it must not be resent: doing so would
// overwrite whatever the dashboard did to it while this form was open.
eq(
  'adding a second number sends the extras alone',
  m.leadEditPatch(LEAD, formFrom(LEAD, { phones: [LEAD.phone, '+912240001234'] })),
  { extraPhones: ['+912240001234'] }
);

// Both halves genuinely moved here, so two keys is correct minimality.
eq(
  'deleting the primary promotes the second and sends both halves',
  m.leadEditPatch(MANY, formFrom(MANY, { phones: ['', '+912240001234'] })),
  { phone: '+912240001234', extraPhones: [] }
);

eq(
  'removing the only extra sends an empty list, not undefined',
  m.leadEditPatch(MANY, formFrom(MANY, { phones: [LEAD.phone] })),
  { extraPhones: [] }
);

// A text[] has an order, Postgres and PostgREST both preserve it, and row 2
// is visibly above row 3. Unlike the custom answers above, this is NOT sorted.
const TWO_EXTRAS = { ...LEAD, extraPhones: ['+912240001234', '+912240009999'] };
eq(
  'reordering two extras is a real edit',
  m.leadEditPatch(TWO_EXTRAS, formFrom(TWO_EXTRAS, {
    phones: [LEAD.phone, '+912240009999', '+912240001234'],
  })),
  { extraPhones: ['+912240009999', '+912240001234'] }
);

// Typing the primary again in a later row is a duplicate the database is
// deliberately not asked to refuse - a CHECK it could trip is classified a
// permanent failure and would strand the capture. It is dropped here instead.
eq(
  'repeating the primary in a later row is dropped, not stored twice',
  m.leadEditPatch(LEAD, formFrom(LEAD, { phones: [LEAD.phone, LEAD.phone] })),
  {}
);

// A caller built before a family existed leaves the key off entirely. Writing
// [] over extras the form never showed is the one unrecoverable direction.
const withoutPhones = formFrom(MANY);
delete withoutPhones.phones;
eq('an absent list key never clobbers the stored extras', m.leadEditPatch(MANY, withoutPhones), {});

// Emails and titles take the same path, so one case each is enough to catch a
// family that was wired up for phones and forgotten for the other two.
eq(
  'a second email sends the email extras alone',
  m.leadEditPatch(LEAD, formFrom(LEAD, { emails: [LEAD.email, 'accounts@northline.co.in'] })),
  { extraEmails: ['accounts@northline.co.in'] }
);
eq(
  'a second job title sends the designation extras alone',
  m.leadEditPatch(LEAD, formFrom(LEAD, { designations: [LEAD.designation, 'Director'] })),
  { extraDesignations: ['Director'] }
);

// The name is the only field that may not be emptied. That rule must NOT have
// quietly extended to the number when the families were introduced.
mark(
  m.canSaveLeadEdits({ phone: '', extraPhones: [] }, formFrom(MANY, { phones: [''] })) === true,
  'a lead may still be left with no number at all'
);

console.log(`\n${failed === 0 ? 'All checks passed.' : `${failed} check(s) FAILED.`}`);
process.exitCode = failed ? 1 : 0;
