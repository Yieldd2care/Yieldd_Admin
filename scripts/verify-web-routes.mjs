/**
 * Checks for lib/webRoutes.ts — which phone screens a browser gets moved off.
 *
 *   npm run verify:web-routes
 *
 * This is a redirect table guarding 50 routes, and the failure modes are quiet:
 * send the wrong one and a customer is stranded mid-onboarding, or a payment
 * gateway returns to a screen that immediately bounces them away from the
 * outcome. Cheaper to assert than to find out.
 *
 * Same compile-then-import harness as the other verify scripts.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const out = mkdtempSync(join(tmpdir(), 'yieldd-webroutes-'));
let webRedirectFor;
try {
  execFileSync(
    process.execPath,
    [
      'node_modules/typescript/bin/tsc',
      'lib/webRoutes.ts',
      '--outDir', out,
      '--module', 'commonjs',
      '--target', 'es2022',
      '--moduleResolution', 'node',
      '--skipLibCheck',
      '--rootDir', '.',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] }
  );
  const require_ = createRequire(import.meta.url);
  // react-native is not resolvable outside the bundler, and the module only
  // wants Platform.OS. Stubbing it to 'web' is the case under test.
  require_.cache[require_.resolve('react-native')] = undefined;
  const Module = require_('node:module');
  const originalResolve = Module._resolveFilename;
  Module._resolveFilename = function (request, ...rest) {
    if (request === 'react-native') return 'react-native-stub';
    return originalResolve.call(this, request, ...rest);
  };
  require_.cache['react-native-stub'] = {
    id: 'react-native-stub',
    filename: 'react-native-stub',
    loaded: true,
    exports: { Platform: { OS: 'web' } },
  };
  ({ webRedirectFor } = require_(join(out, 'lib', 'webRoutes.js')));
} catch (err) {
  console.error('could not compile lib/webRoutes.ts');
  console.error(err.stdout?.toString() || err.message);
  process.exit(1);
}

let failures = 0;
function eq(label, actual, expected) {
  const pass = actual === expected;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}`);
  if (!pass) {
    console.log(`        expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    failures += 1;
  }
}

// --- the reported symptom -------------------------------------------------
eq('the ROI screen moves to the dashboard',
  webRedirectFor('/events/abc-123/roi'), '/(dash)/events/abc-123/roi');
eq('the event dashboard moves',
  webRedirectFor('/events/abc-123/dashboard'), '/(dash)/events/abc-123');
eq('edit event keeps its id',
  webRedirectFor('/events/abc-123/edit'), '/(dash)/events/abc-123/edit');

// --- the six-step wizard collapses onto one page --------------------------
for (const step of ['', '/cost', '/fields', '/templates', '/invite', '/complete']) {
  eq(`events/new${step} collapses onto the single form`,
    webRedirectFor(`/events/new${step}`), '/(dash)/events/new');
}

// --- tabs and settings ----------------------------------------------------
eq('the home tab', webRedirectFor('/'), '/(dash)');
eq('the leads tab', webRedirectFor('/leads'), '/(dash)/leads');
eq('the events tab', webRedirectFor('/events'), '/(dash)/events');
eq('follow-ups', webRedirectFor('/follow-ups'), '/(dash)/follow-ups');
eq('team settings', webRedirectFor('/settings/team'), '/(dash)/team');
eq('both template screens land on one',
  webRedirectFor('/settings/whatsapp-template'), '/(dash)/templates');
eq('delete-account goes to the public page',
  webRedirectFor('/settings/delete-account'), '/(web)/delete-account');

// --- what must NOT move. These are the dangerous ones. --------------------
eq('onboarding is never swallowed — it is the only way to finish a profile',
  webRedirectFor('/onboarding/complete-profile'), null);
eq('the team-or-solo fork stays', webRedirectFor('/onboarding/fork'), null);
eq('payment success stays — a gateway returns a browser here',
  webRedirectFor('/payment/success'), null);
eq('payment failure stays', webRedirectFor('/payment/failure'), null);
eq('the card builder stays — it was made web-friendly on purpose',
  webRedirectFor('/card/edit'), null);
eq('card share stays', webRedirectFor('/card/share'), null);
eq('the camera stays put; there is nowhere to send it',
  webRedirectFor('/capture/camera'), null);
eq('voice capture stays', webRedirectFor('/capture/voice'), null);

// --- routes with no dashboard equivalent stay -----------------------------
eq('the QR tab has no equivalent', webRedirectFor('/qr'), null);
eq('a lead detail has no equivalent yet (PENDING #29)', webRedirectFor('/leads/lead-1'), null);
eq('the evening review stays', webRedirectFor('/leads/review'), null);
eq('notifications stay', webRedirectFor('/notifications'), null);
eq('custom fields stay', webRedirectFor('/events/abc-123/fields'), null);
eq('an unknown path is left alone', webRedirectFor('/something/nobody/added'), null);

// --- shape ----------------------------------------------------------------
eq('a redirect always names a group, so expo-router can resolve it',
  ['/(dash)', '/(web)'].some((g) => (webRedirectFor('/leads') ?? '').startsWith(g)), true);

rmSync(out, { recursive: true, force: true });
console.log(failures === 0 ? '\nall checks passed' : `\n${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
