/**
 * Checks the two pure halves of "where was this lead captured" - PENDING.md 43.
 *
 *   npm run verify:capture-location
 *
 * Two things are asserted here because both are easy to get wrong in a way no
 * screen would show you:
 *
 *   1. WHAT A LEAD SHOWS. Three outcomes, and the middle one is the trap. A fix
 *      with no address is an ordinary lead - the geocode can fail on its own,
 *      with no network or on a rate limit - and has to render as the
 *      coordinates rather than as a blank or an error. A lead with neither has
 *      to render as nothing at all, because that is every lead captured before
 *      this existed and nothing is ever backfilled.
 *
 *   2. THE MAP PROJECTION. The dashboard map is drawn from raster tiles
 *      positioned by hand rather than by a map library, so the Web Mercator
 *      arithmetic is ours and nothing else would catch it being wrong. A map
 *      whose dots are all slightly in the wrong place still looks like a map.
 *
 * Pure - no network, no database, no device. Compiles the two TypeScript
 * modules on their own the same way `verify:export` compiles lib/exportRows.ts.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

let failed = 0;
const ok = (name, cond, detail = '') => {
  if (!cond) failed++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond || !detail ? '' : `\n        ${detail}`}`);
};
const eq = (name, actual, expected) => {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  if (!pass) failed++;
  console.log(
    `${pass ? 'PASS' : 'FAIL'}  ${name}` +
      (pass ? '' : `\n        got  ${JSON.stringify(actual)}\n        want ${JSON.stringify(expected)}`)
  );
};
const near = (name, actual, expected, tolerance) => {
  const pass = Math.abs(actual - expected) <= tolerance;
  if (!pass) failed++;
  console.log(
    `${pass ? 'PASS' : 'FAIL'}  ${name}` +
      (pass ? '' : `\n        got  ${actual}\n        want ${expected} +/- ${tolerance}`)
  );
};

// ---------------------------------------------------------------------------
// Compile the two pure modules on their own.
// ---------------------------------------------------------------------------
const dir = mkdtempSync(join(tmpdir(), 'yieldd-capture-location-'));
let captureLocation;
let mapTiles;
try {
  execFileSync(
    process.execPath,
    [
      'node_modules/typescript/bin/tsc',
      // TypeScript 6 makes it an error to have a tsconfig.json present while
      // naming files on the command line. This compile is deliberately
      // standalone - the flag says so instead of letting tsc refuse.
      '--ignoreConfig',
      'lib/captureLocation.ts',
      'lib/mapTiles.ts',
      '--outDir', dir,
      '--module', 'esnext',
      '--target', 'es2022',
      '--moduleResolution', 'bundler',
      '--strict',
      '--skipLibCheck',
      '--typeRoots', dir,
    ],
    { stdio: 'inherit' }
  );
  captureLocation = await import(pathToFileURL(join(dir, 'captureLocation.js')).href);
  mapTiles = await import(pathToFileURL(join(dir, 'mapTiles.js')).href);
  ok('lib/captureLocation.ts and lib/mapTiles.ts compile with nothing else', true);
} catch (error) {
  ok('lib/captureLocation.ts and lib/mapTiles.ts compile with nothing else', false, String(error));
}

if (captureLocation && mapTiles) {
  const { captureLocationLine, composeAddress, formatCoordinates, isUsableFix, mapsUrl } = captureLocation;
  const { fitToPoints, project, tilesFor, toWorld, tileUrl, TILE_SIZE } = mapTiles;

  // -------------------------------------------------------------------------
  // A fix has to be a real place
  // -------------------------------------------------------------------------
  console.log('');
  ok('a real fix is usable', isUsableFix(21.132694, 72.796357));
  ok('the poles are usable', isUsableFix(-89.9, 179.9));
  ok('latitude past the pole is refused', !isUsableFix(91, 10));
  ok('longitude past the antimeridian is refused', !isUsableFix(10, 181));
  ok('NaN is refused', !isUsableFix(Number.NaN, 10));
  ok('a missing half is refused', !isUsableFix(21.13, undefined));
  ok(
    'Null Island is refused',
    !isUsableFix(0, 0),
    '0,0 is what a zeroed struct or a mock provider hands back, not a place anyone captured a lead'
  );
  ok('a genuine zero on one axis alone is kept', isUsableFix(0, 72.796357));

  // -------------------------------------------------------------------------
  // The address line
  // -------------------------------------------------------------------------
  console.log('');
  eq(
    'the components compose into the wanted line',
    composeAddress({
      name: 'Mansarovar Bungalows',
      subregion: 'Majura Taluka',
      city: 'Surat',
      region: 'Gujarat',
      country: 'India',
      postalCode: '394518',
    }),
    'Mansarovar Bungalows, Majura Taluka, Surat, Gujarat, India'
  );
  eq(
    'a component repeated by the geocoder appears once',
    composeAddress({ district: 'Surat', city: 'Surat', region: 'Gujarat', country: 'India' }),
    'Surat, Gujarat, India'
  );
  eq(
    'the repeat check ignores case',
    composeAddress({ city: 'surat', region: 'Surat', country: 'India' }),
    'surat, India'
  );
  eq(
    'a street number joins its street rather than becoming its own part',
    composeAddress({ streetNumber: '111', street: '8th Avenue', city: 'New York' }),
    '111 8th Avenue, New York'
  );
  eq('nothing at all composes to nothing', composeAddress({}), undefined);
  eq(
    'blank components are not punctuation',
    composeAddress({ name: '  ', city: 'Surat', region: null, country: 'India' }),
    'Surat, India'
  );
  ok(
    'a composed address stays inside the column',
    (composeAddress({ name: 'x'.repeat(600), city: 'Surat' }) ?? '').length <= captureLocation.MAX_ADDRESS_LENGTH,
    'the check constraint allows 500; this has to stay under it so a real capture is never refused'
  );

  // -------------------------------------------------------------------------
  // What a lead actually prints. This is the part with three outcomes.
  // -------------------------------------------------------------------------
  console.log('');
  eq('six decimals, as the reported example shows', formatCoordinates(21.132694, 72.796357), '21.132694, 72.796357');
  eq(
    'an address wins when there is one',
    captureLocationLine({ captureLatitude: 21.132694, captureLongitude: 72.796357, captureAddress: 'Surat, Gujarat, India' }),
    'Surat, Gujarat, India'
  );
  eq(
    'a fix with no address falls back to the coordinates',
    captureLocationLine({ captureLatitude: 21.132694, captureLongitude: 72.796357 }),
    '21.132694, 72.796357',
    );
  eq(
    'a blank address falls back too rather than printing nothing',
    captureLocationLine({ captureLatitude: 21.132694, captureLongitude: 72.796357, captureAddress: '   ' }),
    '21.132694, 72.796357'
  );
  eq(
    'a lead with no location prints nothing, which hides the whole block',
    captureLocationLine({}),
    null
  );
  eq(
    'an address with no fix behind it is not shown either',
    captureLocationLine({ captureAddress: 'Surat, Gujarat, India' }),
    null
  );

  console.log('');
  ok(
    'Android gets a geo: link',
    mapsUrl(21.132694, 72.796357, 'Surat', false).startsWith('geo:21.132694,72.796357')
  );
  ok(
    'iOS gets an Apple Maps link',
    mapsUrl(21.132694, 72.796357, 'Surat', true).startsWith('http://maps.apple.com/?ll=21.132694,72.796357')
  );
  ok(
    'a label with a comma in it cannot break the URL',
    !mapsUrl(21.1, 72.7, 'Surat, Gujarat', true).includes(' ')
  );

  // -------------------------------------------------------------------------
  // The projection
  // -------------------------------------------------------------------------
  console.log('');
  const nullIsland = toWorld(0, 0);
  near('0,0 is the centre of the world square (x)', nullIsland.x, 0.5, 1e-12);
  near('0,0 is the centre of the world square (y)', nullIsland.y, 0.5, 1e-12);

  // Known value: Greenwich at the equator sits on the vertical midline.
  near('the antimeridian is the left edge', toWorld(0, -180).x, 0, 1e-12);
  near('the antimeridian is also the right edge', toWorld(0, 180).x, 1, 1e-12);
  // Exactly, not nearly: in doubles this expression overshoots the unit square
  // by about 6e-12 at the cutoff latitude, which is enough to floor a marker
  // into row -1. toWorld clamps, and this is the check that says so.
  eq('the north pole is exactly the top of the square', toWorld(90, 0).y, 0);
  eq('the south pole is exactly the bottom of the square', toWorld(-90, 0).y, 1);
  ok('north is up', toWorld(30, 0).y < toWorld(10, 0).y);
  ok('east is right', toWorld(0, 30).x > toWorld(0, 10).x);

  /*
   * The exact coordinates from the report, against the tile the standard
   * slippy-map formula puts them in:
   *   x = (lon + 180) / 360 * 2^12                    = 2876.26 -> 2876
   *   y = (1 - ln(tan(lat) + sec(lat)) / PI) / 2 * 2^12 = 1801.9 -> 1801
   * Worked out by hand rather than copied from this implementation, so a drift
   * in the implementation cannot drag the expectation along with it.
   */
  const surat = toWorld(21.132694, 72.796357);
  eq(
    'Surat lands in the standard zoom-12 tile',
    [Math.floor(surat.x * 2 ** 12), Math.floor(surat.y * 2 ** 12)],
    [2876, 1801]
  );

  console.log('');
  const view = fitToPoints([toWorld(21.13, 72.79)], { width: 600, height: 300 });
  ok('one point takes the single-point zoom rather than infinity', Number.isFinite(view.zoom) && view.zoom === 14);
  const centre = project(toWorld(21.13, 72.79), view);
  near('one point is centred horizontally', centre.left, 300, 0.5);
  near('one point is centred vertically', centre.top, 150, 0.5);

  // Surat to Mumbai to Delhi: three cities, which is what this map is for.
  const spread = [toWorld(21.17, 72.83), toWorld(19.08, 72.88), toWorld(28.61, 77.21)];
  const wide = fitToPoints(spread, { width: 600, height: 300 });
  const projected = spread.map((p) => project(p, wide));
  ok(
    'three cities all land inside the viewport',
    projected.every((p) => p.left >= 0 && p.left <= 600 && p.top >= 0 && p.top <= 300),
    JSON.stringify(projected)
  );
  ok('a spread of cities zooms out further than a single stall', wide.zoom < view.zoom);

  const tiles = tilesFor(wide);
  ok(`the viewport is covered by ${tiles.length} tiles`, tiles.length > 0);
  ok(
    'every tile is inside the world at its zoom',
    tiles.every((t) => t.x >= 0 && t.x < 2 ** t.z && t.y >= 0 && t.y < 2 ** t.z),
    JSON.stringify(tiles.filter((t) => t.x < 0 || t.y < 0))
  );
  ok(
    'the tiles reach every edge of the viewport',
    Math.min(...tiles.map((t) => t.left)) <= 0 &&
      Math.max(...tiles.map((t) => t.left)) + TILE_SIZE >= 600 &&
      Math.min(...tiles.map((t) => t.top)) <= 0 &&
      Math.max(...tiles.map((t) => t.top)) + TILE_SIZE >= 300,
    'a gap here is a blank stripe down the middle of the map'
  );

  // Zoomed all the way out, the viewport is wider than the world and asks for
  // tiles left of zero. They have to wrap, not go negative.
  const whole = fitToPoints([toWorld(-80, -179), toWorld(80, 179)], { width: 600, height: 300 });
  ok(
    'a viewport wider than the world wraps its tiles instead of asking for tile -1',
    tilesFor(whole).every((t) => t.x >= 0 && t.x < 2 ** t.z)
  );

  ok(
    'the tile URL needs no API key',
    /^https:\/\/[^?]+\.png$/.test(tileUrl({ x: 1, y: 2, z: 3, left: 0, top: 0 })),
    'a query string here is where a billed map provider would have crept in'
  );
}

try {
  rmSync(dir, { recursive: true, force: true });
} catch {
  /* a temp directory that will not delete is not a failing check */
}

console.log(`\n${failed === 0 ? 'All checks passed.' : `${failed} check(s) FAILED.`}`);
process.exitCode = failed ? 1 : 0;
