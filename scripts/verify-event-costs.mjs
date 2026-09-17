/**
 * The round trip that keeps "this cost nothing" apart from "nobody filled this in".
 *
 *   npm run verify:costs
 *
 * The seven `cost_*_paisa` columns are null-permissive on purpose — the
 * migration that added them says so in as many words, "an unset cost is not the
 * same as a cost of zero". For a long time nothing honoured that: `costsToColumns`
 * wrote `rupeesToPaise(costs[key] || 0)` and `costsFromRow` read back `?? 0`, so
 * every event that came out of the wizard was already "priced" with seven zeros,
 * the unpriced warning on Home could never name anything, and the app had no way
 * to ask for the figures after the show.
 *
 * Every defect this file guards against passes `tsc --noEmit` and every other
 * check in the repo, because `number` is assignable to `number | null` and the
 * damage is a wrong VALUE rather than a wrong type. That is the whole reason it
 * exists: the compiler cannot see any of this.
 *
 * The mapper is compiled with the project's own TypeScript before it is
 * imported, the same way verify-roi.mjs does it — stripping types by hand with a
 * regex was silently producing a different file from the one that ships.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const out = mkdtempSync(join(tmpdir(), 'yieldd-costs-'));

/**
 * `lib/mappers/event.ts` pulls in `../db` (and through it the Supabase client)
 * and `../dates`, none of which this check needs. Rather than compile the whole
 * graph, the two pure helpers are re-declared here against the same COST_COLUMNS
 * map the mapper uses, and the real file is asserted to still match them at the
 * bottom. That keeps the test honest without dragging a native client in.
 */
const SOURCE = `
export const COST_KEYS = ['Stall','Fabrication','Furniture','Travel','Staff','Accommodation','Marketing'] as const;
export type CostKey = (typeof COST_KEYS)[number];
export type EventCosts = Record<CostKey, number | null>;

export const COST_COLUMNS: Record<CostKey, string> = {
  Stall: 'cost_stall_paisa',
  Fabrication: 'cost_fabrication_paisa',
  Furniture: 'cost_furniture_paisa',
  Travel: 'cost_travel_paisa',
  Staff: 'cost_staff_paisa',
  Accommodation: 'cost_accommodation_paisa',
  Marketing: 'cost_marketing_paisa',
};

const rupeesToPaise = (rupees: number): number => Math.round(rupees * 100);
const paiseToRupees = (paise: number): number => paise / 100;

export function costsToColumns(costs: EventCosts): Record<string, number | null> {
  const columns: Record<string, number | null> = {};
  for (const key of COST_KEYS) {
    const rupees = costs[key];
    columns[COST_COLUMNS[key]] = rupees == null ? null : rupeesToPaise(rupees);
  }
  return columns;
}

export function costsFromRow(row: Record<string, number | null>): EventCosts {
  const costs = {} as EventCosts;
  for (const key of COST_KEYS) {
    const paise = row[COST_COLUMNS[key]];
    costs[key] = paise == null ? null : paiseToRupees(paise);
  }
  return costs;
}

/** What the phone's cost screen does with the text in a box. */
export function toAmount(value: string): number | null {
  const digits = value.replace(/[^\\d]/g, '');
  if (!digits) return null;
  const parsed = parseInt(digits, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

/** What both forms do to put a stored cost back into a text box. */
export function seed(cost: number | null): string {
  return cost != null ? String(cost) : '';
}
`;

let m;
try {
  writeFileSync(join(out, 'costs.ts'), SOURCE);
  execFileSync(
    process.execPath,
    [
      'node_modules/typescript/bin/tsc',
      '--ignoreConfig',
      join(out, 'costs.ts'),
      '--outDir',
      out,
      '--module',
      'esnext',
      '--target',
      'es2022',
      '--moduleResolution',
      'bundler',
      '--skipLibCheck',
      '--typeRoots',
      out,
    ],
    { stdio: 'inherit' }
  );
  m = await import(pathToFileURL(join(out, 'costs.js')).href);
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

const { COST_KEYS, costsToColumns, costsFromRow, toAmount, seed } = m;

// ---------------------------------------------------------------------------
// What the box means
// ---------------------------------------------------------------------------

eq('an empty box is not filled in, not zero', toAmount(''), null);
eq('a box holding only punctuation is not filled in', toAmount('Rs ,'), null);
eq('a typed 0 is a real zero', toAmount('0'), 0);
eq('a typed 0 survives currency noise', toAmount('Rs 0'), 0);
eq('digits are read the way people type them', toAmount('8,40,000'), 840000);

// ---------------------------------------------------------------------------
// The write path
//
// `rupeesToPaise` is `Math.round(rupees * 100)`, and `Math.round(null * 100)` is
// 0 — NOT null. So simply dropping the old `|| 0` would have kept writing zeros,
// silently, with no type error anywhere. This is that trap.
// ---------------------------------------------------------------------------

const written = costsToColumns({
  Stall: 500000,
  Fabrication: null,
  Furniture: null,
  Travel: 0,
  Staff: null,
  Accommodation: null,
  Marketing: null,
});

eq('a filled line is written in paise', written.cost_stall_paisa, 50000000);
eq('an untouched line is written as null', written.cost_fabrication_paisa, null);
eq('a line typed as 0 is written as 0, not null', written.cost_travel_paisa, 0);
ok(
  'null never leaks through rupeesToPaise as 0',
  COST_KEYS.filter((k) => written[`cost_${k.toLowerCase()}_paisa`] === 0).length === 1
);

// ---------------------------------------------------------------------------
// The read path
// ---------------------------------------------------------------------------

const read = costsFromRow(written);
eq('a filled line reads back in rupees', read.Stall, 500000);
eq('an untouched line reads back as not filled in', read.Fabrication, null);
eq('a zero line reads back as zero, not as blank', read.Travel, 0);

// ---------------------------------------------------------------------------
// The full round trip
//
// This is the one that matters. Save -> read -> re-seed the form -> save again.
// Both forms seeded their text boxes with `costs[key] ? String(...) : ''`, and a
// genuine 0 is FALSY — so a line recorded as free came back as an empty box and
// the next save wrote it as null, quietly converting "this cost nothing" into
// "nobody filled this in". It is a data-loss bug on an edit that never touched
// the cost panel, because updateEvent rewrites all seven columns on every save.
// ---------------------------------------------------------------------------

const original = {
  Stall: 500000,
  Fabrication: null,
  Furniture: 0,
  Travel: null,
  Staff: 12000,
  Accommodation: null,
  Marketing: 0,
};

const reseeded = Object.fromEntries(
  COST_KEYS.map((key) => [key, toAmount(seed(costsFromRow(costsToColumns(original))[key]))])
);

eq('a full round trip changes nothing at all', reseeded, original);
eq('a zero survives being put back in the box and saved again', reseeded.Furniture, 0);
eq('a blank survives being put back in the box and saved again', reseeded.Travel, null);

// A second lap, because the bug this guards against needed two saves to show.
const twice = Object.fromEntries(
  COST_KEYS.map((key) => [key, toAmount(seed(costsFromRow(costsToColumns(reseeded))[key]))])
);
eq('and still nothing after a second round trip', twice, original);

// ---------------------------------------------------------------------------
// Seeding, stated on its own
// ---------------------------------------------------------------------------

eq('a stored zero seeds the box as "0", not as empty', seed(0), '0');
eq('a stored blank seeds the box as empty', seed(null), '');
ok('a stored zero is therefore visible to the person editing', seed(0) !== seed(null));

// ---------------------------------------------------------------------------
// is_priced, which is what the reminder keys off
//
// `coalesce(seven columns) is not null` in event_set_stats. A skipped step must
// make this false, or the reminder has nothing to find and Home's "add the
// missing cost" list can never name an event — which is exactly what it did.
// ---------------------------------------------------------------------------

const isPriced = (cols) => COST_KEYS.some((k) => cols[`cost_${k.toLowerCase()}_paisa`] != null);
const blank = Object.fromEntries(COST_KEYS.map((k) => [k, null]));

ok('a skipped cost step leaves the event unpriced', !isPriced(costsToColumns(blank)));
ok('one filled line is enough to count as priced', isPriced(costsToColumns({ ...blank, Stall: 1 })));
ok(
  'an event costed entirely at zero is PRICED, not blank',
  isPriced(costsToColumns(Object.fromEntries(COST_KEYS.map((k) => [k, 0]))))
);

// ---------------------------------------------------------------------------
// The shipped mapper must still agree with the copy above.
// ---------------------------------------------------------------------------

const shipped = await import('node:fs').then((fs) =>
  fs.readFileSync('lib/mappers/event.ts', 'utf8')
);
ok(
  'the shipped costsToColumns still branches on null rather than coalescing',
  shipped.includes('rupees == null ? null : rupeesToPaise(rupees)')
);
ok(
  'the shipped costsFromRow still branches on null rather than ?? 0',
  shipped.includes('paise == null ? null : paiseToRupees(paise)')
);
ok(
  'the shipped mapper no longer collapses an empty cost to 0',
  !/rupeesToPaise\(costs\[key\] \|\| 0\)/.test(shipped)
);

const costScreen = await import('node:fs').then((fs) =>
  fs.readFileSync('app/(app)/events/new/cost.tsx', 'utf8')
);
ok(
  'Skip for now no longer writes the seven columns',
  costScreen.includes('const skipForNow') && !/onPress=\{commitAndContinue\}[\s\S]{0,80}Skip for now/.test(costScreen)
);
ok(
  'neither cost box seeds on truthiness any more',
  !/costs\[key\] \? String\(/.test(costScreen)
);

const eventForm = await import('node:fs').then((fs) =>
  fs.readFileSync('components/dash/EventForm.tsx', 'utf8')
);
ok(
  'the dashboard cost box can hold a typed zero',
  eventForm.includes('values.costs[key] != null ? String(values.costs[key]) : \'\'')
);

console.log(failed ? `\n${failed} failed` : '\nall checks passed');
process.exitCode = failed ? 1 : 0;
