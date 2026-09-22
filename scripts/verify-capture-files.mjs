/**
 * Checks for lib/captureFiles.ts — the copy that moves a capture out of the OS
 * cache, and the two sweeps that keep `pending/` honest.
 *
 *   npm run verify:capture-files
 *
 * Written against a real bug. Every capture used to be written to
 * `pending/front.jpg`, so the second business card of the day got a URI string
 * identical to the first — and React Native's <Image> keys its decoded-bitmap
 * cache on that string with no mtime in it. The details screen showed the
 * PREVIOUS card while the file on disk held the new one, and only corrected
 * itself once claimCaptureFiles() rebased the path under a lead id. A rep
 * proof-reading someone else's card is the whole purpose of that screen
 * failing silently, so uniqueness is asserted here rather than eyeballed.
 *
 * Two properties matter beyond uniqueness, and both are about not causing the
 * loss this module exists to prevent:
 *
 *   - the copy happens BEFORE the old file is swept, so a failed copy leaves
 *     the rep holding the photo they already had;
 *   - sweeping is by what the draft still REFERENCES, never by filename,
 *     because `pending/` is shared with the manual-entry path and a voice note
 *     recorded there must survive someone backing out of the camera.
 *
 * `expo-file-system` is native, so it is stubbed with an in-memory disk. The
 * assertions are about which files exist and what they contain afterwards,
 * which is exactly the decision this module owns.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const out = mkdtempSync(join(tmpdir(), 'yieldd-capturefiles-'));

// --- the stub disk ----------------------------------------------------------
// uri -> contents. Directories are implicit except where `create()` made one,
// which is tracked separately so `exists` can answer before any file lands.
let disk = new Map();
let dirs = new Set();
/** Flipped on to model a copy that fails — storage full, a sandbox quirk. */
let copyThrows = false;

const trimEnd = (s) => s.replace(/\/+$/, '');
const joinUri = (parts) => parts.map((p) => trimEnd(typeof p === 'string' ? p : p.uri)).join('/');

class StubFile {
  constructor(...parts) {
    this.uri = joinUri(parts);
  }
  get name() {
    return this.uri.slice(this.uri.lastIndexOf('/') + 1);
  }
  get exists() {
    return disk.has(this.uri);
  }
  delete() {
    if (!disk.delete(this.uri)) throw new Error('delete: no such file ' + this.uri);
  }
  async copy(destination) {
    if (copyThrows) throw new Error('stub copy failure');
    if (!disk.has(this.uri)) throw new Error('copy: no such source ' + this.uri);
    disk.set(destination.uri, disk.get(this.uri));
  }
}

class StubDirectory {
  constructor(...parts) {
    this.uri = joinUri(parts) + '/';
  }
  get exists() {
    return dirs.has(this.uri) || [...disk.keys()].some((k) => k.startsWith(this.uri));
  }
  create() {
    dirs.add(this.uri);
  }
  list() {
    return [...disk.keys()]
      .filter((k) => k.startsWith(this.uri) && !k.slice(this.uri.length).includes('/'))
      .map((k) => new StubFile(k));
  }
  delete() {
    for (const k of [...disk.keys()]) if (k.startsWith(this.uri)) disk.delete(k);
    dirs.delete(this.uri);
  }
  async move(target) {
    for (const k of [...disk.keys()]) {
      if (!k.startsWith(this.uri)) continue;
      disk.set(target.uri + k.slice(this.uri.length), disk.get(k));
      disk.delete(k);
    }
    dirs.delete(this.uri);
    dirs.add(target.uri);
  }
}

const fileSystemStub = {
  File: StubFile,
  Directory: StubDirectory,
  Paths: { document: 'file:///doc', cache: 'file:///cache' },
};

// Platform only decides the web no-op path; a phone is what is under test.
const reactNativeStub = { Platform: { OS: 'ios' } };

let persistCapture;
let sweepOrphanedCaptures;
let claimCaptureFiles;
try {
  writeFileSync(join(out, 'package.json'), '{"type":"commonjs"}\n');
  execFileSync(
    process.execPath,
    [
      'node_modules/typescript/bin/tsc',
      // Standalone compile; a tsconfig.json present alongside named files is
      // an error in TypeScript 6, so say so rather than letting tsc refuse.
      '--ignoreConfig',
      'lib/captureFiles.ts',
      '--outDir',
      out,
      // CommonJS so require.cache can be pre-seeded with the stubs below.
      '--module',
      'commonjs',
      '--target',
      'es2022',
      '--skipLibCheck',
      '--types',
      'node',
      '--rootDir',
      '.',
    ],
    { stdio: 'inherit' }
  );

  const require_ = createRequire(import.meta.url);
  const Module = require_('node:module');

  const originalResolve = Module._resolveFilename;
  Module._resolveFilename = function (request, ...rest) {
    if (request === 'expo-file-system') return 'expo-file-system-stub';
    if (request === 'react-native') return 'react-native-stub';
    return originalResolve.call(this, request, ...rest);
  };
  for (const [id, exports] of [
    ['expo-file-system-stub', fileSystemStub],
    ['react-native-stub', reactNativeStub],
  ]) {
    require_.cache[id] = { id, filename: id, loaded: true, exports };
  }

  ({ persistCapture, sweepOrphanedCaptures, claimCaptureFiles } = require_(
    join(out, 'lib', 'captureFiles.js')
  ));
} finally {
  rmSync(out, { recursive: true, force: true });
}

// --- the harness -----------------------------------------------------------
let failed = 0;
const mark = (pass, name, detail) => {
  if (!pass) failed++;
  console.log((pass ? 'PASS  ' : 'FAIL  ') + name + (pass || !detail ? '' : '\n      ' + detail));
};
const eq = (name, actual, expected) =>
  mark(
    JSON.stringify(actual) === JSON.stringify(expected),
    name,
    'expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual)
  );
const ok = (name, value, detail) => mark(Boolean(value), name, detail);

const PENDING = 'file:///doc/captures/pending/';

function reset() {
  disk = new Map();
  dirs = new Set();
  copyThrows = false;
}
/** Put a freshly shot photo in the cache, where the camera leaves it. */
function shoot(label) {
  const uri = 'file:///cache/ImageManipulator/' + label + '.jpg';
  disk.set(uri, label);
  return uri;
}
const pendingFiles = () =>
  [...disk.keys()].filter((k) => k.startsWith(PENDING)).map((k) => k.slice(PENDING.length)).sort();

// --- the bug this file exists for ------------------------------------------
{
  reset();
  const first = await persistCapture(shoot('card-A'), 'front.jpg');
  const second = await persistCapture(shoot('card-B'), 'front.jpg');

  ok('two captures of the same role get different URIs', first !== second, 'both were ' + first);
  ok('  ...both under captures/pending/', first.startsWith(PENDING) && second.startsWith(PENDING));
  ok(
    '  ...both keeping the role as their prefix, so the directory still reads',
    first.startsWith(PENDING + 'front-') && second.startsWith(PENDING + 'front-')
  );
  eq('  ...and the URI returned holds the card just shot', disk.get(second), 'card-B');
  eq('the predecessor is swept, so retakes cannot accumulate', pendingFiles().length, 1);
  ok('  ...and the survivor is the one that was returned', disk.has(second));
}

// --- ordering: a failed copy must not cost the rep the shot they had --------
{
  reset();
  const first = await persistCapture(shoot('card-A'), 'front.jpg');
  copyThrows = true;
  const second = await persistCapture(shoot('card-B'), 'front.jpg');

  eq(
    'a failed copy returns the cache URI unchanged',
    second,
    'file:///cache/ImageManipulator/card-B.jpg'
  );
  ok(
    '  ...and leaves the previous photo on disk',
    disk.has(first),
    'sweeping before the copy would have destroyed it'
  );
  eq('  ...still holding the card it held before', disk.get(first), 'card-A');
}

// --- roles do not sweep each other -----------------------------------------
{
  reset();
  await persistCapture(shoot('front-A'), 'front.jpg');
  await persistCapture(shoot('back-A'), 'back.jpg');
  await persistCapture(shoot('voice-A'), 'voice.m4a');
  eq('each role keeps its own file', pendingFiles().length, 3);

  await persistCapture(shoot('front-B'), 'front.jpg');
  eq('  ...and replacing one leaves the others alone', pendingFiles().length, 3);
  ok(
    '  ...specifically the voice note, which belongs to another screen',
    [...disk.values()].includes('voice-A')
  );
}

// --- the abandonment sweep, by reference and never by name ------------------
{
  reset();
  const front = await persistCapture(shoot('card-A'), 'front.jpg');
  const voice = await persistCapture(shoot('note-A'), 'voice.m4a');

  // The camera's close button: the card is given up, the recording is not.
  sweepOrphanedCaptures([voice]);
  ok('an unreferenced card photo is swept', !disk.has(front));
  ok(
    '  ...while a referenced voice note survives',
    disk.has(voice),
    'this is the manual-entry recording the blunt fix would have deleted'
  );

  sweepOrphanedCaptures([]);
  eq('sweeping with nothing to keep empties pending/', pendingFiles().length, 0);
}
{
  reset();
  sweepOrphanedCaptures([]);
  ok('sweeping an absent pending/ is a no-op rather than a throw', true);
}

// --- the rebase still works on unique names ---------------------------------
// claimCaptureFiles matches by path prefix, so the filename change must not
// reach it. Asserted rather than assumed: this is what carries a capture into
// the lead that owns it.
{
  reset();
  const front = await persistCapture(shoot('card-A'), 'front.jpg');
  const rebase = await claimCaptureFiles('lead-7');
  const moved = rebase(front);

  ok('a claimed capture moves under its lead id', moved.startsWith('file:///doc/captures/lead-7/'));
  ok('  ...keeping its unique filename', moved.endsWith(front.slice(PENDING.length)));
  ok('  ...with the bytes following it', disk.get(moved) === 'card-A');
  eq('  ...and pending/ left empty for the next card', pendingFiles().length, 0);
}

console.log(failed ? '\n' + failed + ' check(s) failed' : '\nAll checks passed');
process.exit(failed ? 1 : 0);
