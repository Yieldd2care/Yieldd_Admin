/**
 * Checks for lib/csv.ts — the exported file lands in someone's Excel.
 *
 *   npm run verify:csv
 *
 * Two of these are security checks rather than formatting ones. Lead names and
 * notes come from photographs of business cards and from typing at a stall, so
 * they are untrusted input, and Excel executes a cell that begins with `=`.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const out = mkdtempSync(join(tmpdir(), 'yieldd-csv-'));
let csv;
try {
  execFileSync(
    process.execPath,
    [
      'node_modules/typescript/bin/tsc',
      'lib/csv.ts',
      '--outDir', out,
      '--module', 'esnext',
      '--target', 'es2022',
      '--moduleResolution', 'bundler',
      '--skipLibCheck',
      '--typeRoots', out,
    ],
    { stdio: 'inherit' }
  );
  csv = await import(pathToFileURL(join(out, 'csv.js')).href);
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

// --- the ordinary cases ---
eq('a plain value is written as-is', csv.escapeCell('Rajesh Menon'), 'Rajesh Menon');
eq('a number becomes text', csv.escapeCell(420000), '420000');
eq('null is an empty cell', csv.escapeCell(null), '');
eq('undefined is an empty cell', csv.escapeCell(undefined), '');

// --- the ones that would break the row apart ---
eq(
  'a comma forces quoting',
  csv.escapeCell('Plot 47, MIDC, Andheri East'),
  '"Plot 47, MIDC, Andheri East"'
);
eq('a quote is doubled inside quotes', csv.escapeCell('He said "call me"'), '"He said ""call me"""');
eq('a newline is kept inside a quoted cell', csv.escapeCell('Line one\nLine two'), '"Line one\nLine two"');

// --- formula injection: Excel executes these ---
eq(
  'a leading = is neutralised',
  csv.escapeCell('=1+1'),
  "'=1+1"
);
eq(
  'a HYPERLINK attack is neutralised',
  csv.escapeCell('=HYPERLINK("http://evil.test","Click")'),
  '"\'=HYPERLINK(""http://evil.test"",""Click"")"'
);
eq('a leading @ is neutralised', csv.escapeCell('@SUM(A1)'), "'@SUM(A1)");
eq(
  'a + that calls a function is neutralised',
  csv.escapeCell('+HYPERLINK("http://evil.test")'),
  "\"'+HYPERLINK(\"\"http://evil.test\"\")\""
);
eq('a DDE payload is neutralised', csv.escapeCell("+cmd|'/c calc'!A0"), "'+cmd|'/c calc'!A0");
eq('a - that calls a function is neutralised', csv.escapeCell('-SUM(A1)'), "'-SUM(A1)");
// The common case, and the reason + is not blanket-prefixed: an apostrophe is
// invisible in Excel but shows literally in Google Sheets and Tally.
eq('an ordinary +91 number is left clean', csv.escapeCell('+91 98204 41720'), '+91 98204 41720');
eq('an international number is left clean', csv.escapeCell('+44 7700 900123'), '+44 7700 900123');
eq('a plain negative number is left clean', csv.escapeCell('-5'), '-5');

// --- the whole file ---
const file = csv.toCsv(['Name', 'Company'], [['Rajesh Menon', 'Northline, Pvt Ltd']]);
eq('the file starts with a UTF-8 BOM so Excel reads Devanagari', file.charCodeAt(0), 0xfeff);
eq(
  'rows are CRLF separated',
  file.slice(1),
  'Name,Company\r\nRajesh Menon,"Northline, Pvt Ltd"\r\n'
);
eq('an empty table still writes its header', csv.toCsv(['Name'], []).slice(1), 'Name\r\n');
eq(
  'a Devanagari value passes through unchanged',
  csv.toCsv(['Name'], [['महेश सिंह राजपूत']]).includes('महेश सिंह राजपूत'),
  true
);

// --- filenames ---
eq(
  'the filename carries the event and the date',
  csv.csvFilename('IMTEX 2026', new Date(2026, 7, 29)),
  'IMTEX 2026 2026-08-29.csv'
);
eq(
  'characters a filesystem would reject are stripped',
  csv.csvFilename('Plast/India: 2026?', new Date(2026, 0, 5)),
  'PlastIndia 2026 2026-01-05.csv'
);
eq(
  'an empty name still produces a usable filename',
  csv.csvFilename('', new Date(2026, 0, 5)),
  'Leads 2026-01-05.csv'
);

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nall checks passed');
process.exit(failed ? 1 : 0);
