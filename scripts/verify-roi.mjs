/**
 * Arithmetic checks for lib/roi.ts.
 *
 *   npm run verify:roi
 *
 * These are the numbers an exhibitor takes to their finance team, so the
 * formulas get checked rather than eyeballed. The module is compiled with the
 * project's own TypeScript before it is imported — stripping types by hand
 * with a regex was silently producing a different file from the one that ships.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const out = mkdtempSync(join(tmpdir(), 'yieldd-roi-'));
let roi;
try {
  // The compiler is invoked through node directly rather than through `npx`,
  // which is a .cmd shim on Windows and cannot be spawned without a shell.
  execFileSync(
    process.execPath,
    [
      'node_modules/typescript/bin/tsc',
      'lib/roi.ts',
      '--outDir',
      out,
      '--module',
      'esnext',
      '--target',
      'es2022',
      '--moduleResolution',
      'bundler',
      // The app's @types packages are irrelevant to a file with no imports,
      // and resolving them outside the project's tsconfig only produces noise.
      '--skipLibCheck',
      // An empty type root: `--types ""` is rejected by the CLI, and without
      // this tsc auto-includes every @types package in node_modules.
      '--typeRoots',
      out,
    ],
    { stdio: 'inherit' }
  );
  roi = await import(pathToFileURL(join(out, 'roi.js')).href);
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

// ---------------------------------------------------------------------------
// The design's own figures, reproduced from real inputs rather than typed in.
// 413 leads, ₹2,82,500 spent, 12 deals won totalling ₹6,84,000 → 142% / ₹684.
// ---------------------------------------------------------------------------
const spend = 28250000; // paise
const leads = [];
for (let i = 0; i < 190; i++) leads.push({ status: 'New' });
for (let i = 0; i < 129; i++) leads.push({ status: 'Contacted' });
for (let i = 0; i < 64; i++) leads.push({ status: 'Qualified' });
for (let i = 0; i < 18; i++) leads.push({ status: 'Lost', dealValue: 50000 }); // must NOT count
for (let i = 0; i < 12; i++) leads.push({ status: 'Won', dealValue: 57000 });

eq('total leads', leads.length, 413);
eq('deals won', roi.dealsWon(leads), 12);
eq('won value ignores deal values left on Lost leads', roi.wonValuePaise(leads), 68400000);
eq('ROI reproduces the designed 142%', Math.round(roi.roiPercent(68400000, spend)), 142);
eq('cost per lead is ₹684', roi.costPerLeadPaise(spend, 413), 68402);
eq('cost per won deal', roi.costPerWonPaise(spend, 12), 2354167);
eq('conversion rate', Math.round(roi.conversionPercent(12, 413) * 100) / 100, 2.91);

// ---------------------------------------------------------------------------
// Return ON investment, not return OF it.
// ---------------------------------------------------------------------------
eq('doubling your money is +100%, not 200%', roi.roiPercent(20000, 10000), 100);
eq('breaking even is 0%', roi.roiPercent(10000, 10000), 0);
eq('closing nothing is -100%', roi.roiPercent(0, 10000), -100);
eq('a 10x return', roi.roiPercent(100000, 10000), 900);

// ---------------------------------------------------------------------------
// Cases that must never print a number.
// ---------------------------------------------------------------------------
eq('no spend recorded gives null, not Infinity', roi.roiPercent(50000, 0), null);
eq('no leads gives null cost per lead', roi.costPerLeadPaise(spend, 0), null);
eq('no wins gives null cost per won', roi.costPerWonPaise(spend, 0), null);
eq('no leads gives null conversion', roi.conversionPercent(0, 0), null);
eq('a brand new event produces no NaN', roi.eventEconomics([], 0).roiPercent, null);
eq('a brand new event has no leads', roi.eventEconomics([], 0).totalLeads, 0);

// ---------------------------------------------------------------------------
// Integer paise — the reason money is not held in rupees.
// ---------------------------------------------------------------------------
eq(
  '0.1 + 0.2 rupees is exactly 30 paise',
  roi.wonValuePaise([
    { status: 'Won', dealValue: 0.1 },
    { status: 'Won', dealValue: 0.2 },
  ]),
  30
);
eq(
  'a thousand ₹0.07 deals do not drift',
  roi.wonValuePaise(Array.from({ length: 1000 }, () => ({ status: 'Won', dealValue: 0.07 }))),
  7000
);

// ---------------------------------------------------------------------------
// Pipeline: five exclusive buckets, bars scaled against the largest.
// ---------------------------------------------------------------------------
const p = roi.pipelineBreakdown(leads);
eq('buckets sum to the total', p.reduce((s, r) => s + r.count, 0), 413);
eq('counts by status', p.map((r) => r.count), [190, 129, 64, 12, 18]);
eq('the largest bucket fills the bar', p[0].barWidth, 100);
eq('bars are scaled against the largest, not the first', Math.round(p[1].barWidth), 68);
eq('share of total is out of every lead', Math.round(p[1].shareOfTotal * 10) / 10, 31.2);
eq('shares sum to 100', Math.round(p.reduce((s, r) => s + r.shareOfTotal, 0)), 100);
eq('an empty pipeline has no NaN', roi.pipelineBreakdown([]).map((r) => r.barWidth), [0, 0, 0, 0, 0]);
eq(
  'the server-side counts give the same breakdown',
  roi.pipelineFromCounts([190, 129, 64, 12, 18]).map((r) => r.count),
  p.map((r) => r.count)
);

// ---------------------------------------------------------------------------
// Display.
// ---------------------------------------------------------------------------
eq('percentages round to whole numbers above 10', roi.formatPercent(142.13), '142%');
eq('small percentages keep one decimal', roi.formatPercent(2.906), '2.9%');
eq('an unknown percentage shows a dash', roi.formatPercent(null), '—');
eq('a negative ROI is shown, not hidden', roi.formatPercent(-100), '-100%');

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nall checks passed');
process.exit(failed ? 1 : 0);
