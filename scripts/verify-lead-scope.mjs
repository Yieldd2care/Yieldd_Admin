/**
 * Checks for lib/leadScope.ts — what the phone's leads list shows, and in what
 * order.
 *
 *   npm run verify:lead-scope
 *
 * Two rules here are the kind that look right on a screen full of test data and
 * are wrong on a real device months later:
 *
 *   - The sort compares `capturedAt` with `Date.parse`. The server sends
 *     `…+00:00` and a device draft holds `…Z`, so a string compare scatters
 *     offline captures through the list. The mixed-format cases below are the
 *     whole reason this file exists.
 *   - The per-show sections come out in the order their newest lead appears,
 *     which falls out of Map insertion order rather than a second sort. If
 *     anyone ever "tidies" that into a sort by event name, these fail.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const out = mkdtempSync(join(tmpdir(), 'yieldd-leadscope-'));
let m;
try {
  writeFileSync(join(out, 'package.json'), '{"type":"commonjs"}\n');
  execFileSync(
    process.execPath,
    [
      'node_modules/typescript/bin/tsc',
      // TypeScript 6 refuses to mix a tsconfig.json with files named on the
      // command line. This compile is deliberately standalone.
      '--ignoreConfig',
      'lib/leadScope.ts',
      '--outDir', out,
      '--module', 'commonjs',
      '--target', 'es2022',
      '--skipLibCheck',
      '--typeRoots', out,
    ],
    { stdio: 'inherit' }
  );
  m = await import(pathToFileURL(join(out, 'leadScope.js')).href);
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

/** A lead, reduced to the fields scoping reads. */
const lead = (id, eventId, capturedAt, syncStatus = 'synced') => ({
  id,
  eventId,
  capturedAt,
  syncStatus,
});
const ids = (rows) => rows.map((r) => r.id);

// ---------------------------------------------------------------------------
// Scope
// ---------------------------------------------------------------------------

const MIXED = [
  lead('a', 'imtex', '2026-03-02T09:00:00+00:00'),
  lead('b', 'autoexpo', '2026-09-10T09:00:00+00:00'),
  lead('c', 'imtex', '2026-03-04T09:00:00+00:00'),
];

eq('null scope keeps every event', ids(m.leadsInScope(MIXED, null)).sort(), ['a', 'b', 'c']);
eq('an event id keeps only that event', ids(m.leadsInScope(MIXED, 'imtex')), ['c', 'a']);
eq('an event nobody captured at is empty', m.leadsInScope(MIXED, 'nothing'), []);

const WITH_DRAFT = [
  ...MIXED,
  lead('draft', 'autoexpo', '2026-09-18T09:00:00.000Z', 'draft'),
];
mark(
  !ids(m.leadsInScope(WITH_DRAFT, null)).includes('draft'),
  'a draft is left to the drafts screen, even though it is the newest'
);
mark(
  !ids(m.leadsInScope(WITH_DRAFT, 'autoexpo')).includes('draft'),
  '...and scoping to its own event does not let it back in'
);

// ---------------------------------------------------------------------------
// Order — the reason this file exists
// ---------------------------------------------------------------------------

eq('newest capture first', ids(m.leadsInScope(MIXED, null)), ['b', 'c', 'a']);

/**
 * The trap, written so it can actually spring.
 *
 * `capturedAt` is not one format: a device draft is `toISOString()`'s `…Z`,
 * and a server row is whatever PostgREST renders the timestamptz as, which is
 * `+00:00` on a UTC project but follows the database's timezone setting.
 *
 * Mixing `Z` and `+00:00` alone happens to sort the same either way — the
 * date-time prefix decides it long before the suffix is reached — so that pair
 * proves nothing. A NON-UTC offset is where a text sort genuinely breaks:
 * `14:30+05:30` is 09:00Z but sorts above a `10:00Z` that really came later.
 * Sorted as text these three come out ist · utc-1000 · utc-0800; by instant,
 * utc-1000 is correctly first.
 */
const MIXED_FORMATS = [
  lead('ist-0900z', 'e', '2026-09-14T14:30:00+05:30'),
  lead('utc-1000z', 'e', '2026-09-14T10:00:00.000Z'),
  lead('utc-0800z', 'e', '2026-09-14T08:00:00+00:00'),
];
eq(
  'timestamps in different offsets order by instant, not by text',
  ids(m.leadsInScope(MIXED_FORMATS, null)),
  ['utc-1000z', 'ist-0900z', 'utc-0800z']
);

// The ordinary same-offset mix still has to come out right, of course.
eq(
  'a device draft and a server row interleave normally',
  ids(
    m.leadsInScope(
      [
        lead('server-old', 'e', '2026-09-10T09:00:00+00:00'),
        lead('device-new', 'e', '2026-09-17T09:00:00.000Z'),
        lead('server-mid', 'e', '2026-09-14T09:00:00+00:00'),
      ],
      null
    )
  ),
  ['device-new', 'server-mid', 'server-old']
);

/**
 * The behaviour PENDING.md item 65 says must NOT be "fixed": a card taken on
 * Saturday with no signal and synced on Monday sorts into Saturday, because
 * `capturedAt` is the device time the card was taken.
 */
const OFFLINE_STACK = [
  lead('monday', 'e', '2026-09-14T09:00:00+00:00'),
  lead('saturday-synced-monday', 'e', '2026-09-12T16:00:00.000Z'),
  lead('friday', 'e', '2026-09-11T09:00:00+00:00'),
];
eq(
  'a Saturday capture synced on Monday still sorts into Saturday',
  ids(m.leadsInScope(OFFLINE_STACK, null)),
  ['monday', 'saturday-synced-monday', 'friday']
);

const frozen = Object.freeze([
  Object.freeze(lead('x', 'e', '2026-09-10T09:00:00+00:00')),
  Object.freeze(lead('y', 'e', '2026-09-11T09:00:00+00:00')),
]);
mark(
  ids(m.leadsInScope(frozen, null)).join() === 'y,x' && frozen[0].id === 'x',
  'the input array is never sorted in place — it is zustand state'
);

mark(
  m.leadsInScope([lead('u', 'e', 'not a date')], null).length === 1,
  'an unparseable timestamp keeps the lead rather than dropping it'
);

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

const ORDERED = m.leadsInScope(
  [
    lead('imtex-old', 'imtex', '2026-03-02T09:00:00+00:00'),
    lead('auto-new', 'autoexpo', '2026-09-16T09:00:00+00:00'),
    lead('imtex-new', 'imtex', '2026-03-04T09:00:00+00:00'),
    lead('auto-mid', 'autoexpo', '2026-09-15T09:00:00+00:00'),
  ],
  null
);
const SECTIONS = m.groupLeadsByEvent(ORDERED);

eq(
  'the show with the newest lead comes first',
  SECTIONS.map((s) => s.eventId),
  ['autoexpo', 'imtex']
);
eq('rows inside a section stay newest first', ids(SECTIONS[0].rows), ['auto-new', 'auto-mid']);
eq('...and so do the ones below it', ids(SECTIONS[1].rows), ['imtex-new', 'imtex-old']);
eq(
  'every lead lands in exactly one section',
  SECTIONS.reduce((n, s) => n + s.rows.length, 0),
  ORDERED.length
);

eq('nothing captured means no sections at all', m.groupLeadsByEvent([]), []);
eq(
  'a show whose leads were all filtered out leaves no empty heading',
  m.groupLeadsByEvent(ORDERED.filter((l) => l.eventId === 'imtex')).map((s) => s.eventId),
  ['imtex']
);
eq(
  'one show is one section, not one per lead',
  m.groupLeadsByEvent([lead('p', 'e', '2026-09-10T09:00:00+00:00'), lead('q', 'e', '2026-09-09T09:00:00+00:00')])
    .length,
  1
);

console.log(failed ? `\n${failed} check(s) failed.` : '\nAll checks passed.');
process.exitCode = failed ? 1 : 0;
