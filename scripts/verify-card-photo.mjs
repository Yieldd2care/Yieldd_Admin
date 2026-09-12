/**
 * Checks for lib/cardPhoto.ts — the step that makes a photo out of the rep's
 * gallery safe to send to the card reader.
 *
 *   npm run verify:card-photo
 *
 * Worth testing rather than eyeballing, because both halves fail silently in
 * opposite directions. Skip the JPEG re-encode and an iPhone HEIC or an Android
 * PNG goes up labelled `image/jpeg`, which the reader rejects for a reason the
 * rep cannot act on. Skip the skip, and every card gets a second lossy pass over
 * the small print it exists to read.
 *
 * `expo-image-manipulator` is native, so it is stubbed with a recorder: the
 * assertions are about *whether* it was asked to do work and with what, which is
 * exactly the decision this module owns. `./files` is stubbed too, so the byte
 * ceiling can be exercised without a real file.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// cardPhoto logs through `if (__DEV__)` on its failure path. Undefined here is a
// ReferenceError, which would turn a real assertion into a crash.
globalThis.__DEV__ = false;

const out = mkdtempSync(join(tmpdir(), 'yieldd-cardphoto-'));

// --- the stubs -------------------------------------------------------------
// What the fake manipulator was asked to do. One entry per manipulate() call:
// the module measures first and transforms second, so doing work is two calls
// and skipping the work is none.
let calls = [];
let renderDims = { width: 0, height: 0 };
let renderThrows = false;
let reportedSize = 1024;

const manipulatorStub = {
  SaveFormat: { JPEG: 'jpeg', PNG: 'png', WEBP: 'webp' },
  ImageManipulator: {
    manipulate(source) {
      const call = { source, resize: null, saved: null };
      calls.push(call);
      const context = {
        resize(size) {
          call.resize = size;
          return context;
        },
        async renderAsync() {
          if (renderThrows) throw new Error('stub render failure');
          return {
            width: renderDims.width,
            height: renderDims.height,
            async saveAsync(options) {
              call.saved = options;
              return { uri: 'file:///cache/normalised.jpg', width: 1, height: 1 };
            },
          };
        },
      };
      return context;
    },
  },
};

const filesStub = {
  // null models "cannot tell", which is what a web blob URL gives.
  async fileSize() {
    return reportedSize;
  },
};

let normaliseCardPhoto;
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
      'lib/cardPhoto.ts',
      '--outDir', out,
      // CommonJS so the './files' specifier, which tsc emits without a .js
      // extension, still resolves — and so require.cache can be pre-seeded.
      '--module', 'commonjs',
      '--target', 'es2022',
      '--skipLibCheck',
      // The import chain reaches expo-file-system's types via ./files, so the
      // @types that resolve have to be the ones this compile actually needs.
      '--types', 'node',
      // Pins the emit layout so the stub below can name lib/files.js exactly.
      '--rootDir', '.',
    ],
    { stdio: 'inherit' }
  );

  const require_ = createRequire(import.meta.url);
  const Module = require_('node:module');

  // ./files really imports react-native and expo-file-system, neither of which
  // resolves outside the bundler. Seeding the cache means its body never runs.
  const filesPath = join(out, 'lib', 'files.js');
  require_.cache[filesPath] = {
    id: filesPath,
    filename: filesPath,
    loaded: true,
    exports: filesStub,
  };

  const originalResolve = Module._resolveFilename;
  Module._resolveFilename = function (request, ...rest) {
    if (request === 'expo-image-manipulator') return 'expo-image-manipulator-stub';
    return originalResolve.call(this, request, ...rest);
  };
  require_.cache['expo-image-manipulator-stub'] = {
    id: 'expo-image-manipulator-stub',
    filename: 'expo-image-manipulator-stub',
    loaded: true,
    exports: manipulatorStub,
  };

  ({ normaliseCardPhoto } = require_(join(out, 'lib', 'cardPhoto.js')));
} finally {
  rmSync(out, { recursive: true, force: true });
}

// --- the harness -----------------------------------------------------------
let failed = 0;
const mark = (pass, name, detail) => {
  if (!pass) failed++;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${pass || !detail ? '' : `\n      ${detail}`}`);
};
const eq = (name, actual, expected) =>
  mark(
    JSON.stringify(actual) === JSON.stringify(expected),
    name,
    `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
  );
const ok = (name, value) => mark(Boolean(value), name);

/** Resets the recorder and runs one case. */
async function run(uri, width, height, { dims, size = 1024, throws = false } = {}) {
  calls = [];
  renderDims = dims ?? { width: width ?? 0, height: height ?? 0 };
  reportedSize = size;
  renderThrows = throws;
  const result = await normaliseCardPhoto(uri, width, height);
  return { result, calls };
}

// --- the fast path: already fine, so leave it alone -------------------------
// A second JPEG pass costs legibility on exactly the small print the reader is
// there to read, so a photo that already satisfies both rules must not be
// touched at all.
{
  const { result, calls: c } = await run('file:///dcim/card.jpg', 1200, 800);
  eq('an in-spec JPEG is returned untouched', result, { ok: true, uri: 'file:///dcim/card.jpg' });
  eq('  ...and the manipulator is never invoked', c.length, 0);
}
{
  const { result } = await run('file:///dcim/card.JPEG?v=2', 2560, 1600);
  ok('an uppercase extension and a query string still count as JPEG', result.ok);
  eq('  ...exactly at the long-edge limit is still in spec', result.uri, 'file:///dcim/card.JPEG?v=2');
}

// --- format: the reason the re-encode exists -------------------------------
{
  const { result, calls: c } = await run('file:///dcim/screenshot.png', 1200, 800);
  ok('an in-spec PNG is still re-encoded', result.ok && result.uri !== 'file:///dcim/screenshot.png');
  eq('  ...as JPEG', c[1]?.saved?.format, 'jpeg');
  eq('  ...without a pointless resize', c[1]?.resize, null);
}
{
  // The case that fails today: an iPhone photo is HEIC, which the reader does
  // not accept in any form.
  const { result, calls: c } = await run('file:///dcim/IMG_0042.heic', 1200, 800);
  ok('a HEIC is re-encoded', result.ok);
  eq('  ...as JPEG', c[1]?.saved?.format, 'jpeg');
}
{
  const { calls: c } = await run('file:///dcim/card.webp', 1200, 800);
  eq('a WebP is re-encoded as JPEG', c[1]?.saved?.format, 'jpeg');
}

// --- pixels ----------------------------------------------------------------
{
  const { calls: c } = await run('file:///dcim/big.jpg', 4032, 3024);
  eq('an oversized landscape photo is resized by its width', c[1]?.resize, { width: 2560 });
  // `?? {}` so a regression that skips the resize reports as a failure instead
  // of throwing here and hiding every assertion after it.
  eq('  ...naming one dimension only, so the ratio is preserved', Object.keys(c[1]?.resize ?? {}).length, 1);
}
{
  const { calls: c } = await run('file:///dcim/tall.jpg', 3024, 4032);
  eq('an oversized portrait photo is resized by its height', c[1]?.resize, { height: 2560 });
}
{
  // 108MP territory. Past 8000px the reader rejects outright rather than
  // downscaling, so this is the case that must not reach it.
  const { result, calls: c } = await run('file:///dcim/huge.jpg', 12000, 9000);
  ok('a 108MP photo is accepted', result.ok);
  eq('  ...and brought under the hard reject threshold', c[1]?.resize, { width: 2560 });
}
{
  const { calls: c } = await run('file:///dcim/square.jpg', 3000, 3000);
  eq('a square photo resizes by width', c[1]?.resize, { width: 2560 });
}

// --- compression quality ---------------------------------------------------
{
  const { calls: c } = await run('file:///dcim/shot.png', 1200, 800);
  ok(
    'the JPEG quality stays high, because artefacts eat small print',
    typeof c[1]?.saved?.compress === 'number' && c[1].saved.compress >= 0.8
  );
}

// --- measuring, when the picker did not say --------------------------------
{
  const { result, calls: c } = await run('file:///dcim/card.jpg', null, null, {
    dims: { width: 1200, height: 800 },
  });
  eq('an unmeasured but in-spec JPEG is still returned untouched', result.uri, 'file:///dcim/card.jpg');
  eq('  ...having been measured once and then left alone', c.length, 1);
}
{
  const { result, calls: c } = await run('file:///dcim/card.jpg', undefined, undefined, {
    dims: { width: 6000, height: 4000 },
  });
  ok('an unmeasured oversized JPEG is normalised', result.ok);
  eq('  ...using the measured dimensions', c[1]?.resize, { width: 2560 });
}
{
  // A zero dimension is not a dimension. Trusting it would skip the resize on
  // an image of unknown size.
  const { calls: c } = await run('file:///dcim/card.jpg', 0, 0, {
    dims: { width: 5000, height: 3000 },
  });
  eq('a zero dimension is treated as unknown, not as small', c[1]?.resize, { width: 2560 });
}

// --- the byte ceiling ------------------------------------------------------
// Deliberately tighter than the Edge Function's own guard, which was matched to
// the storage bucket and is 1.33x looser than the reader actually allows.
{
  const { result } = await run('file:///dcim/card.jpg', 1200, 800, { size: 8 * 1024 * 1024 });
  ok('a file over the ceiling is refused', result.ok === false);
  ok('  ...with something the rep can act on', /too large/i.test(result.message ?? ''));
}
{
  const { result } = await run('file:///dcim/card.jpg', 1200, 800, { size: 7 * 1024 * 1024 });
  ok('a file exactly at the ceiling is allowed', result.ok);
}
{
  // fileSize returns null for a web blob URL. Unknown is not the same as too
  // big — refusing here would break the gallery on the website.
  const { result } = await run('blob:http://localhost/abc', 1200, 800, { size: null });
  ok('an unknowable size is allowed through', result.ok);
}
{
  const { result } = await run('file:///dcim/shot.png', 1200, 800, { size: 9 * 1024 * 1024 });
  ok('the ceiling is checked after normalising too', result.ok === false);
}

// --- failure ---------------------------------------------------------------
{
  const { result } = await run('file:///dcim/corrupt.png', 1200, 800, { throws: true });
  ok('a manipulator failure is reported, not thrown', result.ok === false);
  ok('  ...with a message rather than a stack', typeof result.message === 'string' && result.message.length > 0);
}

console.log(`\n${failed === 0 ? 'All checks passed.' : `${failed} check(s) FAILED.`}`);
process.exitCode = failed ? 1 : 0;
