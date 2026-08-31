/**
 * Checks app.json's iOS privacy manifest against what the installed packages
 * actually declare.
 *
 *   npm run verify:privacy
 *
 * Apple has required a privacy manifest since May 2024, and the failure is not
 * a crash — it is an ITMS-91053 "Missing API declaration" email after an upload
 * that looked fine, at the exact moment you wanted to ship.
 *
 * Expo does not merge these for you. Its own guide warns that "Apple does not
 * correctly parse all the PrivacyInfo files included by static CocoaPods
 * dependencies", so the app has to declare the union of what its dependencies
 * use. That union is what this script computes — from the actual
 * PrivacyInfo.xcprivacy files on disk, not from a list someone typed once.
 *
 * So: install a package that touches a required-reason API and forget to
 * declare it, and this fails before App Store Connect does.
 *
 * Pure — no network, no database.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

let failed = 0;
const eq = (name, actual, expected) => {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  if (!pass) failed++;
  console.log(
    `${pass ? 'PASS' : 'FAIL'}  ${name}` +
      (pass ? '' : `\n        got  ${JSON.stringify(actual)}\n        want ${JSON.stringify(expected)}`)
  );
};
const ok = (name, cond, detail = '') => {
  if (!cond) failed++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond || !detail ? '' : `\n        ${detail}`}`);
};

// ---------------------------------------------------------------------------
// What the app declares
// ---------------------------------------------------------------------------
const appJson = JSON.parse(readFileSync('app.json', 'utf8'));
const manifest = appJson?.expo?.ios?.privacyManifests;

ok('app.json has ios.privacyManifests', Boolean(manifest), 'Apple has required this since May 2024');
if (!manifest) {
  console.log('\n1 check(s) FAILED.');
  process.exit(1);
}

eq('the app declares it does not track', manifest.NSPrivacyTracking, false);
eq('  ...with no tracking domains', manifest.NSPrivacyTrackingDomains, []);
ok(
  'NSPrivacyAccessedAPITypes is present',
  Array.isArray(manifest.NSPrivacyAccessedAPITypes)
);

/** category -> Set(reason codes) */
const declared = new Map();
for (const entry of manifest.NSPrivacyAccessedAPITypes ?? []) {
  declared.set(entry.NSPrivacyAccessedAPIType, new Set(entry.NSPrivacyAccessedAPITypeReasons ?? []));
}

// ---------------------------------------------------------------------------
// What the installed packages need
// ---------------------------------------------------------------------------
/** Walks node_modules for PrivacyInfo.xcprivacy without following symlinks. */
function findManifests(dir, out = [], depth = 0) {
  if (depth > 6) return out;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      // Skip the obvious dead weight; these never carry an iOS manifest.
      if (e.name === '.bin' || e.name === '.cache' || e.name === 'dist' || e.name === 'build') continue;
      findManifests(full, out, depth + 1);
    } else if (e.name === 'PrivacyInfo.xcprivacy') {
      try {
        if (statSync(full).size < 200_000) out.push(full);
      } catch {
        /* unreadable */
      }
    }
  }
  return out;
}

const files = findManifests('node_modules');
ok(`found ${files.length} package privacy manifests to reconcile against`, files.length > 0);

/** category -> Map(reason -> [packages]) */
const required = new Map();
for (const file of files) {
  const xml = readFileSync(file, 'utf8');
  const pkg = file.replace(/\\/g, '/').replace(/^node_modules\//, '').split('/ios/')[0];

  // Each <dict> pairs one category with its reasons.
  for (const block of xml.split('<dict>').slice(1)) {
    const category = /<key>NSPrivacyAccessedAPIType<\/key>\s*<string>([^<]+)<\/string>/.exec(block)?.[1];
    if (!category) continue;
    const reasonsBlock = /<key>NSPrivacyAccessedAPITypeReasons<\/key>\s*<array>([\s\S]*?)<\/array>/.exec(block)?.[1] ?? '';
    const reasons = [...reasonsBlock.matchAll(/<string>([^<]+)<\/string>/g)].map((m) => m[1]);

    if (!required.has(category)) required.set(category, new Map());
    for (const r of reasons) {
      const who = required.get(category).get(r) ?? [];
      if (!who.includes(pkg)) who.push(pkg);
      required.get(category).set(r, who);
    }
  }
}

console.log('');
for (const [category, reasons] of [...required.entries()].sort()) {
  const declaredReasons = declared.get(category);
  ok(`app.json declares ${category}`, Boolean(declaredReasons), `needed by: ${[...new Set([...reasons.values()].flat())].join(', ')}`);
  if (!declaredReasons) continue;

  for (const [reason, packages] of [...reasons.entries()].sort()) {
    ok(
      `  ...including reason ${reason}`,
      declaredReasons.has(reason),
      `required by ${packages.join(', ')} — add it to app.json or Apple returns ITMS-91053`
    );
  }
}

// Declaring an API the app does not use is its own kind of wrong: it is a
// statement to Apple about behaviour that is not there.
console.log('');
for (const [category, reasons] of declared.entries()) {
  const needed = required.get(category);
  ok(`nothing is over-declared for ${category}`, Boolean(needed), 'no installed package declares this category');
  if (!needed) continue;
  for (const reason of reasons) {
    ok(`  ...reason ${reason} is genuinely needed`, needed.has(reason), 'no installed package asks for this reason');
  }
}

console.log(`\n${failed === 0 ? 'All checks passed.' : `${failed} check(s) FAILED.`}`);
process.exit(failed ? 1 : 0);
