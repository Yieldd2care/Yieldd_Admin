/**
 * Checks that invite links will actually open the app.
 *
 * `app.json` claims https://yieldd.co/invite on both platforms — `autoVerify`
 * on Android, `associatedDomains` on iOS. Neither claim means anything unless
 * the domain serves a file back agreeing to it. Those files did not exist at
 * all until 2026-08-31, so every invite ever sent opened the website instead
 * of the app, and nothing anywhere reported a problem: a failed App Link is
 * indistinguishable from a normal link.
 *
 * That silence is the reason this script exists. It checks the files are
 * present, well-formed, agree with app.json, and — the part that matters —
 * that the placeholder values have been replaced with real credentials.
 *
 *   npm run verify:applinks
 *
 * Reads files only. No network, no credentials.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const wellKnown = path.join(root, 'public', '.well-known');
const appJson = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo;

const failures = [];
const notes = [];

function read(name) {
  const file = path.join(wellKnown, name);
  if (!fs.existsSync(file)) {
    failures.push(`${name} is missing from public/.well-known/ — the link claim in app.json is unbacked`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    failures.push(`${name} is not valid JSON (${err.message})`);
    return null;
  }
}

// --- Android ----------------------------------------------------------------
const assetlinks = read('assetlinks.json');
if (assetlinks) {
  const entry = Array.isArray(assetlinks) ? assetlinks[0] : null;
  const target = entry?.target ?? {};
  const expectedPackage = appJson.android?.package;

  if (target.package_name !== expectedPackage) {
    failures.push(
      `assetlinks.json names package "${target.package_name}" but app.json builds "${expectedPackage}"`
    );
  }

  const prints = target.sha256_cert_fingerprints ?? [];
  if (!prints.length) {
    failures.push('assetlinks.json has no sha256_cert_fingerprints');
  } else if (prints.some((p) => /REPLACE|PLACEHOLDER|XX:XX/i.test(p))) {
    failures.push(
      'assetlinks.json still holds the placeholder fingerprint.\n' +
        '      Get the real one from Play Console → Setup → App signing → SHA-256,\n' +
        '      or run `eas credentials` once a build exists.'
    );
  } else if (prints.some((p) => !/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/i.test(p))) {
    failures.push(
      'a SHA-256 fingerprint is malformed — it must be 32 hex pairs separated by colons'
    );
  }

  // The claim in app.json has to match the file, or the file backs nothing.
  const filters = appJson.android?.intentFilters ?? [];
  const claimed = filters
    .flatMap((f) => f.data ?? [])
    .filter((d) => d.scheme === 'https')
    .map((d) => d.host);
  if (!claimed.length) {
    notes.push('app.json declares no https intent filter, so Android claims no web link at all');
  }
}

// --- iOS --------------------------------------------------------------------
const aasa = read('apple-app-site-association');
if (aasa) {
  const details = aasa.applinks?.details ?? [];
  const ids = details.flatMap((d) => d.appIDs ?? (d.appID ? [d.appID] : []));

  if (!ids.length) {
    failures.push('apple-app-site-association lists no appIDs');
  } else {
    if (ids.some((id) => /REPLACE|TEAMID|PLACEHOLDER/i.test(id))) {
      failures.push(
        'apple-app-site-association still holds the placeholder Team ID.\n' +
          '      Find it at developer.apple.com → Membership, then write it as\n' +
          '      TEAMID.co.yieldd.app'
      );
    }
    const bundle = appJson.ios?.bundleIdentifier;
    if (bundle && !ids.some((id) => id.endsWith(`.${bundle}`))) {
      failures.push(
        `apple-app-site-association does not mention the bundle id "${bundle}" from app.json`
      );
    }
  }

  if (!details.some((d) => (d.components ?? d.paths ?? []).length)) {
    failures.push('apple-app-site-association matches no paths, so it opens the app for nothing');
  }
}

// --- served correctly? ------------------------------------------------------
const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));

const rewriteSkipsWellKnown = (vercel.rewrites ?? []).every((r) =>
  r.source.includes('well-known')
    ? true
    : !new RegExp(r.source.replace(/\(\(\?!.*?\)\.\*\)/, '.*')).test('/.well-known/assetlinks.json')
);
if (!rewriteSkipsWellKnown) {
  failures.push('a vercel.json rewrite would swallow /.well-known/ and serve index.html instead');
}

const servesAasaAsJson = (vercel.headers ?? []).some(
  (h) =>
    h.source.includes('apple-app-site-association') &&
    (h.headers ?? []).some(
      (x) => x.key.toLowerCase() === 'content-type' && x.value.includes('application/json')
    )
);
if (!servesAasaAsJson) {
  failures.push(
    'vercel.json does not force Content-Type: application/json on apple-app-site-association.\n' +
      '      The file has no extension, so it would be served as plain text and Apple ignores it.'
  );
}

// --- report -----------------------------------------------------------------
for (const n of notes) console.log(`note  ${n}`);
if (notes.length) console.log('');

if (failures.length) {
  for (const f of failures) console.log(`FAIL  ${f}`);
  console.log(
    `\n${failures.length} problem${failures.length === 1 ? '' : 's'}. ` +
      'Invite links will open the website, not the app.'
  );
  process.exit(1);
}

console.log('App Links are backed on both platforms, and served correctly.');
