/**
 * Checks for `overlapsMonthsYears` in lib/dates.ts — which events the Events
 * tab's month and year dropdowns will and will not show.
 *
 * Both dropdowns are MULTI-SELECT and an empty list means "any", so each half
 * is OR-ed within itself and the two halves are AND-ed: "March or June" *of*
 * "2025 or 2026".
 *
 *   npm run verify:event-filter
 *
 * Two things here are worth more than the rest. A trade show that runs across a
 * month boundary has to appear under BOTH months: filtering to March and not
 * finding the show you spent March at reads as lost data, not as a filter. And
 * every case where a date cannot be read has to FAIL OPEN — a filter that hides
 * a row on bad input turns a data problem into an apparent deletion.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const out = mkdtempSync(join(tmpdir(), 'yieldd-eventfilter-'));
let m;
try {
  // ESM here, unlike verify:lead-search — lib/dates.ts imports nothing, so
  // there is no extensionless specifier for Node's resolver to reject.
  execFileSync(
    process.execPath,
    [
      'node_modules/typescript/bin/tsc',
      // TypeScript 6 makes it an error to have a tsconfig.json present while
      // naming files on the command line. This compile is deliberately
      // standalone — the flag says so instead of letting tsc refuse.
      '--ignoreConfig',
      'lib/dates.ts',
      '--outDir', out,
      '--module', 'esnext',
      '--target', 'es2022',
      '--skipLibCheck',
      '--typeRoots', out,
    ],
    { stdio: 'inherit' }
  );
  m = await import(pathToFileURL(join(out, 'dates.js')).href);
} finally {
  rmSync(out, { recursive: true, force: true });
}

let failed = 0;
const mark = (pass, name) => {
  if (!pass) failed++;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}`);
};
// Months and years are LISTS now, and an empty list means "any". The helpers
// take them as given so every call below reads like the two dropdowns do.
const shows = (name, start, end, months, years) =>
  mark(m.overlapsMonthsYears(start, end, months, years) === true, name);
const hides = (name, start, end, months, years) =>
  mark(m.overlapsMonthsYears(start, end, months, years) === false, name);

// Months are 0-indexed, like Date#getMonth. 0 = January, 2 = March, 11 = Dec.
const JAN = 0, FEB = 1, MAR = 2, APR = 3, JUN = 5, SEP = 8, DEC = 11;
const ALL = [];

// --- the default state: no filter at all ----------------------------------
// Both dropdowns start on "All", so this is the screen on arrival, not an edge
// case. Returning false here would show an empty list to everyone.
shows('no filter shows an event', '2026-03-10', '2026-03-12', ALL, ALL);
shows('  ...even one with unreadable dates', 'nonsense', '', ALL, ALL);

// --- a single show inside one month ---------------------------------------
shows('a March show is in March', '2026-03-10', '2026-03-12', [MAR], [2026]);
hides('  ...and not in February', '2026-03-10', '2026-03-12', [FEB], [2026]);
hides('  ...nor in April', '2026-03-10', '2026-03-12', [APR], [2026]);
hides('  ...nor in March of another year', '2026-03-10', '2026-03-12', [MAR], [2025]);
shows('a one-day show matches its own month', '2026-09-04', '2026-09-04', [SEP], [2026]);

// --- a show that straddles a month boundary -------------------------------
// The whole reason the check is an overlap and not a start date.
shows('28 Feb – 3 Mar is in February', '2026-02-28', '2026-03-03', [FEB], [2026]);
shows('  ...and in March as well', '2026-02-28', '2026-03-03', [MAR], [2026]);
hides('  ...but not in January', '2026-02-28', '2026-03-03', [JAN], [2026]);
hides('  ...nor in April', '2026-02-28', '2026-03-03', [APR], [2026]);

// --- a show that crosses New Year -----------------------------------------
shows('29 Dec – 2 Jan is in 2025', '2025-12-29', '2026-01-02', ALL, [2025]);
shows('  ...and in 2026', '2025-12-29', '2026-01-02', ALL, [2026]);
shows('  ...findable as December 2025', '2025-12-29', '2026-01-02', [DEC], [2025]);
shows('  ...and as January 2026', '2025-12-29', '2026-01-02', [JAN], [2026]);
hides('  ...but not as January 2025', '2025-12-29', '2026-01-02', [JAN], [2025]);

// --- one dropdown at a time ------------------------------------------------
shows('a year alone takes the whole year', '2026-07-01', '2026-07-03', ALL, [2026]);
hides('  ...and excludes the year before', '2025-07-01', '2025-07-03', ALL, [2026]);
shows('a month alone takes that month in any year', '2024-03-02', '2024-03-04', [MAR], ALL);
shows('  ...in a different year too', '2026-03-02', '2026-03-04', [MAR], ALL);
hides('  ...but not a different month', '2026-04-02', '2026-04-04', [MAR], ALL);

// --- month numbering ------------------------------------------------------
// The classic off-by-one. Month 2 is March; if this flips, every filter is a
// month out and nobody notices until the wrong show is missing.
shows('month 2 means March', '2026-03-15', '2026-03-15', [2], [2026]);
hides('  ...and not February', '2026-02-15', '2026-02-15', [2], [2026]);
shows('month 0 means January', '2026-01-15', '2026-01-15', [0], [2026]);
shows('month 11 means December', '2026-12-15', '2026-12-15', [11], [2026]);

// --- the UTC midnight trap ------------------------------------------------
// `new Date('2026-03-01')` is UTC midnight, which is 29 Feb west of Greenwich.
// A show starting 1 March must be in March for everyone on earth.
shows('the 1st of a month lands in that month', '2026-03-01', '2026-03-01', [MAR], [2026]);
hides('  ...not in the month before', '2026-03-01', '2026-03-01', [FEB], [2026]);
shows('the last day of a month lands in that month', '2026-02-28', '2026-02-28', [FEB], [2026]);
hides('  ...not in the month after', '2026-02-28', '2026-02-28', [MAR], [2026]);

// --- bad data must fail open ----------------------------------------------
// Every one of these is a row the rep can still see and open. Hiding it would
// look like the event had been deleted.
shows('an unparseable start date shows the event', 'not-a-date', '2026-03-12', [MAR], [2026]);
shows('an empty start date shows it', '', '2026-03-12', [MAR], [2026]);
shows('a null start date shows it', null, '2026-03-12', [MAR], [2026]);
shows('an undefined start date shows it', undefined, undefined, [MAR], [2026]);
shows('an end before its start shows it', '2026-06-10', '2026-01-02', [MAR], [2026]);
shows('a span long enough to be corruption shows it', '1970-01-01', '2099-12-31', [MAR], [2026]);

// --- a missing end date falls back to the start ---------------------------
shows('no end date is treated as a one-day show', '2026-03-10', null, [MAR], [2026]);
hides('  ...in that month only', '2026-03-10', null, [APR], [2026]);

// --- datetime strings, which the event wizard's draft holds ---------------
shows('an ISO datetime works too', '2026-03-10T00:00:00Z', '2026-03-12T00:00:00Z', [MAR], [2026]);

// --- more than one month, more than one year ------------------------------
shows('two months: March is in {March, June}', '2026-03-10', '2026-03-12', [MAR, JUN], ALL);
shows('  ...and so is June', '2026-06-10', '2026-06-12', [MAR, JUN], ALL);
hides('  ...but April is in neither', '2026-04-10', '2026-04-12', [MAR, JUN], ALL);
shows('two years: 2025 is in {2025, 2026}', '2025-08-01', '2025-08-02', ALL, [2025, 2026]);
shows('  ...and so is 2026', '2026-08-01', '2026-08-02', ALL, [2025, 2026]);
hides('  ...but 2024 is in neither', '2024-08-01', '2024-08-02', ALL, [2025, 2026]);

// --- the cross product, which is the part that is easy to get wrong -------
// A March 2024 show must NOT pass a {March, June} x {2025, 2026} filter just
// because its month matches. Each half has to be satisfied by the SAME event.
shows('March 2026 passes {Mar,Jun} x {2025,2026}', '2026-03-05', '2026-03-06', [MAR, JUN], [2025, 2026]);
shows('June 2025 passes it too', '2025-06-05', '2025-06-06', [MAR, JUN], [2025, 2026]);
hides('March 2024 does not: right month, wrong year', '2024-03-05', '2024-03-06', [MAR, JUN], [2025, 2026]);
hides('August 2026 does not: right year, wrong month', '2026-08-05', '2026-08-06', [MAR, JUN], [2025, 2026]);

// --- both halves set, on a show that spans a boundary ---------------------
shows('28 Feb - 3 Mar 2026 passes {Mar} x {2026}', '2026-02-28', '2026-03-03', [MAR], [2026]);
hides('  ...but not {Mar} x {2025}', '2026-02-28', '2026-03-03', [MAR], [2025]);
// The New Year case with both halves set. The December end is 2025 and the
// January end is 2026, so only the pairing that actually happened passes —
// testing the months and the years independently would wrongly pass this.
shows('29 Dec 2025 - 2 Jan 2026 passes {Jan} x {2026}', '2025-12-29', '2026-01-02', [JAN], [2026]);
hides('  ...but not {Jan} x {2025}: that January never happened', '2025-12-29', '2026-01-02', [JAN], [2025]);
shows('  ...and {Dec} x {2025} passes', '2025-12-29', '2026-01-02', [DEC], [2025]);

// --- an empty list stays "any" on whichever half it is on -----------------
shows('empty months with years set is the whole year', '2026-11-01', '2026-11-02', ALL, [2026]);
shows('empty years with months set is that month in any year', '2019-11-01', '2019-11-02', [10], ALL);
shows('both empty shows everything', '2026-11-01', '2026-11-02', ALL, ALL);

console.log(`\n${failed === 0 ? 'All checks passed.' : `${failed} check(s) FAILED.`}`);
process.exitCode = failed ? 1 : 0;
