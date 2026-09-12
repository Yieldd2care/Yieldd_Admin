/**
 * Checks for lib/roiPdf.ts — the printable ROI sheet.
 *
 *   npm run verify:roi-pdf
 *
 * The sheet is what an exhibitor hands to their finance team, and it is now
 * shared by the phone (expo-print) and the browser (a hidden iframe). It moved
 * out of the phone screen because that file imports four native modules the
 * web build must not pull in; these checks are what stop the move drifting.
 *
 * Same compile-then-import harness as verify-roi.mjs: the module is built with
 * the project's own TypeScript rather than having its types stripped by hand.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const out = mkdtempSync(join(tmpdir(), 'yieldd-roipdf-'));
let mod;
try {
  execFileSync(
    process.execPath,
    [
      'node_modules/typescript/bin/tsc',
      // TypeScript 6 makes it an error to have a tsconfig.json present while
      // naming files on the command line. This compile is deliberately
      // standalone — the flag says so instead of letting tsc refuse.
      '--ignoreConfig',
      'lib/roiPdf.ts',
      '--outDir', out,
      // CommonJS, not ESM: tsc emits extensionless imports ('./db') which
      // Node's ESM loader refuses, and this module has a real import chain.
      '--module', 'commonjs',
      '--target', 'es2022',
      // No `--moduleResolution`: node10 is already the default for
      // `--module commonjs`, and naming it is a TypeScript 6 error.
      '--skipLibCheck',
      // Unlike verify-roi.mjs, this module imports the EventStats *type*, which
      // pulls the supabase client into the compile — and that reads `process.env`,
      // so the Node globals have to be in scope or tsc cannot find `process`.
      //
      // It used to be enough to leave typeRoots alone and let tsc auto-include
      // every @types package in node_modules. TypeScript 6 stopped doing that,
      // so the one package that is actually needed is named here. That is the
      // tighter arrangement anyway: nothing else leaks into an isolated compile.
      '--types', 'node',
      // The type import pulls the whole lib chain into the emit, so pin the
      // root and read the file back from its mirrored path.
      '--rootDir', '.',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] }
  );
  mod = createRequire(import.meta.url)(join(out, 'lib', 'roiPdf.js'));
} catch (err) {
  console.error('could not compile lib/roiPdf.ts');
  console.error(err.stdout?.toString() || err.message);
  process.exit(1);
}

const { buildRoiPdfHtml, eventSubtitle, PIPELINE_STATUS_COLORS } = mod;

let failures = 0;
function ok(label, condition) {
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${label}`);
  if (!condition) failures += 1;
}

const event = {
  id: 'e1',
  name: 'India Machine Tools Expo',
  city: 'Mumbai',
  stallNumber: 'B-42',
  startDate: '2026-09-05',
  endDate: '2026-09-08',
  totalCost: 684000,
};

const adminStats = {
  totalLeads: 312,
  leadsToday: 47,
  dealsWon: 9,
  withVoiceNote: 40,
  needsNote: 22,
  consentGiven: 280,
  canSeeMoney: true,
  wonValuePaise: 214000000,
  expectedValuePaise: 356000000,
  spendPaise: 68400000,
  roiPercent: 212.9,
  costPerLeadPaise: 219230,
  costPerWonPaise: 7600000,
  conversionPercent: 2.9,
  pipeline: [
    { status: 'New', count: 104, shareOfTotal: 33, barWidth: 81 },
    { status: 'Contacted', count: 128, shareOfTotal: 41, barWidth: 100 },
    { status: 'Qualified', count: 54, shareOfTotal: 17, barWidth: 42 },
    { status: 'Won', count: 9, shareOfTotal: 3, barWidth: 7 },
    { status: 'Lost', count: 17, shareOfTotal: 5, barWidth: 13 },
  ],
};

// A rep: every money field is null, never zero.
const repStats = {
  ...adminStats,
  canSeeMoney: false,
  wonValuePaise: null,
  expectedValuePaise: null,
  spendPaise: null,
  roiPercent: null,
  costPerLeadPaise: null,
  costPerWonPaise: null,
};

const html = buildRoiPdfHtml(event, adminStats);

ok('renders a complete document', html.includes('<html>') && html.includes('</html>'));
ok('carries the event and the stall', html.includes('India Machine Tools Expo') && html.includes('B-42'));
ok('groups rupees the Indian way', html.includes('₹21,40,000') && html.includes('₹6,84,000'));
// formatPercent gives whole numbers above |10| and one decimal below it, so
// 212.9 is rendered as 213% — the assertion, not the formatter, was wrong.
ok('shows the return, rounded the way formatPercent rounds', html.includes('213%'));
ok('a small percentage keeps its decimal', buildRoiPdfHtml(event, { ...adminStats, roiPercent: 4.25 }).includes('4.3%'));
ok('every pipeline status appears', ['New', 'Contacted', 'Qualified', 'Won', 'Lost'].every((s) => html.includes(`>${s}</td>`)));
ok('bar widths come from barWidth, not shareOfTotal', html.includes('width:100%') && html.includes('width:81%'));
ok('status colours are applied', html.includes(PIPELINE_STATUS_COLORS.Won));
ok('explains that break-even is zero', html.includes('÷ event cost'));

const repHtml = buildRoiPdfHtml(event, repStats);
ok('a rep sees a dash, never ₹0', !repHtml.includes('₹0<') && repHtml.includes('Not recorded'));
ok('a rep still sees the counts', repHtml.includes('312') && repHtml.includes('>9<'));

ok('subtitle names the city', eventSubtitle(event).includes('Mumbai'));
ok('subtitle survives a missing event', eventSubtitle(null) === '');

// The whole reason this file exists: nothing native may creep back in.
const source = readFileSync('lib/roiPdf.ts', 'utf8');
ok(
  'no native import crept back into the shared module',
  !/from '(react-native|expo-|react-native-view-shot)/.test(source)
);

rmSync(out, { recursive: true, force: true });
console.log(failures === 0 ? '\nall checks passed' : `\n${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
