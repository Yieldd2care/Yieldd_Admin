/**
 * Checks for lib/exportRows.ts — what the export file actually says about money.
 *
 *   npm run verify:export
 *
 * Deal value is two columns, and which one a lead lands in is the whole point
 * of PENDING 47: a finance team handed one combined column reads a forecast as
 * revenue. Expected is qualified plus won, won is won alone, lost is in
 * neither, and a won lead appears in BOTH. Those four sentences are the report,
 * so they are asserted here rather than left to a screenshot.
 *
 * The other half is the gate. `money_visible` comes from the database and says
 * whether the caller was allowed the money at all; when it is false the three
 * headers must be absent, not present and empty.
 *
 * The live half — that a rep really does get money_visible false from the
 * server — is scripts/verify-export-live.mjs, which needs .env.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const out = mkdtempSync(join(tmpdir(), 'yieldd-export-'));
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
      'lib/exportRows.ts',
      '--outDir', out,
      '--module', 'commonjs',
      '--target', 'es2022',
      '--skipLibCheck',
      '--typeRoots', out,
      // exportRows imports lib/csv, lib/db and lib/mappers/lead, so tsc widens
      // the common root. Pinning it makes the output path predictable and the
      // file is read back from its mirrored location — as verify-lead-edit does.
      '--rootDir', '.',
    ],
    { stdio: 'inherit' }
  );
  m = await import(pathToFileURL(join(out, 'lib/exportRows.js')).href);
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
const ok = (name, cond) => eq(name, Boolean(cond), true);

// A row as public.export_leads returns it. The money fields arrive already
// decided by the database, which is the point — nothing here re-derives them.
const row = (over = {}) => ({
  created_at: '2026-09-15T04:30:00Z',
  full_name: 'Priya Nair',
  designation: null,
  company: null,
  phone: null,
  email: null,
  company_landline: null,
  company_website: null,
  company_address: null,
  branch_address: null,
  status: 'new',
  follow_up_date: null,
  note: null,
  consent_given: false,
  money_visible: true,
  expected_value_paisa: null,
  won_value_paisa: null,
  deal_closed_at: null,
  voice_summary: null,
  voice_transcript: null,
  custom_field_values: {},
  ...over,
});

const MONEY = {
  identity: false,
  contact: false,
  statusAndFollowUp: false,
  dealValue: true,
  transcript: false,
  customFields: false,
};

/** The lines of the file, BOM and trailing CRLF stripped. */
const lines = (csv) => csv.replace(/^﻿/, '').trimEnd().split('\r\n');

// --- the defaults have not drifted ---
eq('deal value is off by default', m.DEFAULT_COLUMNS.dealValue, false);

// --- the four sentences the report is built on ---
{
  const { csv } = m.buildCsvFromRows(
    [row({ status: 'qualified', expected_value_paisa: 42000000, won_value_paisa: null })],
    MONEY
  );
  const [head, body] = lines(csv);
  eq(
    'a qualified lead is headed by two money columns and a close date',
    head,
    'Captured on,Expected deal value (₹),Won deal value (₹),Closed on'
  );
  eq('a qualified lead fills Expected and leaves Won and Closed on blank', body, '15/09/2026,420000,,');
}
{
  const { csv } = m.buildCsvFromRows(
    [
      row({
        status: 'won',
        expected_value_paisa: 85000000,
        won_value_paisa: 85000000,
        deal_closed_at: '2026-09-12T09:00:00Z',
      }),
    ],
    MONEY
  );
  eq(
    'a won lead appears in BOTH columns, and carries the date it closed',
    lines(csv)[1],
    '15/09/2026,850000,850000,12/09/2026'
  );
}
{
  const { csv } = m.buildCsvFromRows([row({ status: 'lost' })], MONEY);
  eq('a lost lead is in neither column, a dead lead is not pipeline', lines(csv)[1], '15/09/2026,,,');
}
{
  const { csv } = m.buildCsvFromRows([row({ status: 'new' }), row({ status: 'contacted' })], MONEY);
  eq('new and contacted carry no money either', lines(csv).slice(1), ['15/09/2026,,,', '15/09/2026,,,']);
}

// --- the gate: absent columns, never empty ones ---
{
  const rep = [row({ status: 'qualified', money_visible: false }), row({ status: 'won', money_visible: false })];
  const { csv } = m.buildCsvFromRows(rep, MONEY);
  const [head, ...body] = lines(csv);
  eq('a rep gets NO money headers at all, not three empty ones', head, 'Captured on');
  eq('and no money cells behind them', body, ['15/09/2026', '15/09/2026']);
  eq('moneyAllowed is false for a rep', m.moneyAllowed(rep), false);
}
{
  // The belt to the client's braces: money the server withheld cannot be
  // printed even if a row somehow arrived carrying one.
  const { csv } = m.buildCsvFromRows([row({ status: 'won', money_visible: false, won_value_paisa: 999 })], MONEY);
  ok(
    'a withheld value cannot be printed even if a row somehow carries one',
    !lines(csv)[0].includes('Won deal value') && !lines(csv)[1].includes('999')
  );
}
{
  const admin = [row({ status: 'won', money_visible: true })];
  eq('moneyAllowed is true for an admin', m.moneyAllowed(admin), true);
  const { csv } = m.buildCsvFromRows(admin, { ...MONEY, dealValue: false });
  eq('an admin who did not tick the box still gets no money columns', lines(csv)[0], 'Captured on');
}

// --- the columns either side of the money block still line up ---
{
  const { csv } = m.buildCsvFromRows(
    [
      row({
        status: 'won',
        expected_value_paisa: 100,
        won_value_paisa: 100,
        deal_closed_at: '2026-09-12T09:00:00Z',
        follow_up_date: '2026-09-20',
        note: 'call back',
        consent_given: true,
        voice_summary: 'wants a quote',
        voice_transcript: 'the whole thing',
      }),
    ],
    {
      identity: false,
      contact: false,
      statusAndFollowUp: true,
      dealValue: true,
      transcript: true,
      customFields: false,
    }
  );
  const [head, body] = lines(csv);
  eq(
    'money sits between the status block and the transcript block',
    head,
    'Captured on,Status,Follow-up date,Note,Consent given,Expected deal value (₹),Won deal value (₹),Closed on,Voice note summary,Voice note transcript'
  );
  eq(
    'and every cell lands under its own header',
    body,
    '15/09/2026,Won,20/09/2026,call back,Yes,1,1,12/09/2026,wants a quote,the whole thing'
  );
}

// --- custom fields still come last, whether or not money is there ---
{
  const r = row({
    status: 'won',
    expected_value_paisa: 100,
    won_value_paisa: 100,
    custom_field_values: { f1: 'Under 5 lakh' },
  });
  const { csv } = m.buildCsvFromRows([r], { ...MONEY, customFields: true }, { f1: 'Budget range' });
  eq(
    'a custom field keeps its label and stays to the right of the money',
    lines(csv)[0],
    'Captured on,Expected deal value (₹),Won deal value (₹),Closed on,Budget range'
  );
}

// --- what the two export screens offer, and what they end up asking for ---
//
// Both screens share these, so the phone and the web dashboard cannot drift
// apart. A rep must not be OFFERED the tick; the database is what withholds the
// numbers, and verify:export-live is what proves that half.
{
  const KEYS = ['identity', 'contact', 'statusAndFollowUp', 'dealValue', 'transcript', 'customFields'];
  eq(
    'an admin is offered every column',
    KEYS.filter((k) => m.isColumnOffered(k, true)),
    KEYS
  );
  eq(
    'a rep is offered every column except deal value',
    KEYS.filter((k) => m.isColumnOffered(k, false)),
    ['identity', 'contact', 'statusAndFollowUp', 'transcript', 'customFields']
  );

  const ticked = { ...m.DEFAULT_COLUMNS, dealValue: true };
  eq('an admin who ticks deal value asks for it', m.effectiveColumns(ticked, true).dealValue, true);
  eq('a rep never asks for it, however the flag got set', m.effectiveColumns(ticked, false).dealValue, false);
  eq(
    'and nothing else about the selection is disturbed',
    { ...m.effectiveColumns(ticked, false), dealValue: true },
    ticked
  );

  // The Generate button reads "has anything been picked" off the effective set.
  // Deal value alone must not be able to enable it for a rep.
  const onlyMoney = {
    identity: false,
    contact: false,
    statusAndFollowUp: false,
    dealValue: true,
    transcript: false,
    customFields: false,
  };
  eq(
    'deal value alone cannot enable the button for a rep',
    Object.values(m.effectiveColumns(onlyMoney, false)).some(Boolean),
    false
  );
  eq(
    'but it can for an admin',
    Object.values(m.effectiveColumns(onlyMoney, true)).some(Boolean),
    true
  );
}

// --- an empty export ---
{
  const { csv, rowCount } = m.buildCsvFromRows([], MONEY);
  eq('no rows means no count', rowCount, 0);
  eq('and no money headers, since nothing said they were allowed', lines(csv)[0], 'Captured on');
}

// --- several numbers, emails and job titles on one lead --------------------
//
// The column SET is fixed. Numbering them instead (Mobile 1, Mobile 2, ...)
// would make the header width depend on the busiest lead in the file, and a
// CSV whose column count moves between two exports of the same event cannot
// be pasted into a saved sheet or a CRM import mapping.
{
  const IDENTITY_AND_CONTACT = {
    identity: true,
    contact: true,
    statusAndFollowUp: false,
    dealValue: false,
    transcript: false,
    customFields: false,
  };

  const withExtras = row({
    designation: 'Purchase Head',
    extra_designations: ['Director'],
    company: 'Northline',
    phone: '+919820441720',
    extra_phones: ['+912240001234', '+919930011223'],
    email: 'priya@northline.example',
    extra_emails: ['accounts@northline.example'],
  });

  const { csv } = m.buildCsvFromRows([withExtras], IDENTITY_AND_CONTACT);
  const [head, body] = lines(csv);

  eq(
    'each Other column sits immediately after the one it belongs to',
    head,
    'Captured on,Name,Designation,Other job titles,Company,Phone,Other phones,Email,Other emails,Company landline,Website,Address,Branch address'
  );

  // Joined with " / ": a comma would force a quote around the cell and read as
  // one long number in Excel, a semicolon IS the delimiter in several European
  // Excel locales, and a newline looks like a torn row to a naive importer.
  eq(
    'several values share one cell, joined and unquoted',
    body,
    '15/09/2026,Priya Nair,Purchase Head,Director,Northline,+919820441720,+912240001234 / +919930011223,priya@northline.example,accounts@northline.example,,,,'
  );

  // The ordinary lead, and the lead exported from a cache that predates the
  // columns entirely. Both must give the same shape as the one above.
  const plain = m.buildCsvFromRows(
    [row({ designation: 'Purchase Head', phone: '+919820441720' })],
    IDENTITY_AND_CONTACT
  );
  const plainLines = lines(plain.csv);
  eq('a lead with no extras keeps the identical header', plainLines[0], head);
  eq(
    'and leaves those cells empty rather than printing null',
    plainLines[1],
    '15/09/2026,Priya Nair,Purchase Head,,,+919820441720,,,,,,,'
  );

  eq(
    'so the column count never moves between two exports',
    plainLines[0].split(',').length === body.split(',').length,
    true
  );

  // An empty array and a null are the same absence as far as a file goes.
  const emptied = m.buildCsvFromRows(
    [row({ phone: '+919820441720', extra_phones: [], extra_emails: [], extra_designations: [] })],
    IDENTITY_AND_CONTACT
  );
  eq('an empty list exports the same as no list at all', lines(emptied.csv)[1], plainLines[1].replace('Purchase Head', ''));
}

console.log(failed ? `\n${failed} check(s) failed.` : '\nAll checks passed.');
process.exit(failed ? 1 : 0);
