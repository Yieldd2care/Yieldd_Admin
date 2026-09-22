/**
 * Checks that the clock and the battery stay readable on every screen.
 *
 *   npm run verify:status-bar
 *
 * There was nothing configuring the status bar at all: no `androidStatusBar`
 * block, an `expo-status-bar` plugin entry with no props (which writes no
 * `android:windowLightStatusBar` and so leaves the Android default of white
 * icons), and no <StatusBar> rendered anywhere. SDK 57 draws edge-to-edge, so
 * the bar is transparent over whatever the screen paints behind it — and the
 * whole signed-in app is #F5F7FB. White on near-white: the time, the signal and
 * the battery were invisible.
 *
 * The fix is a dark default at the root plus `style="light"` on the navy
 * family, which is correct but only stays correct if someone remembers. That is
 * what this script is for. A newly added navy screen fails here rather than
 * shipping with an unreadable clock, which is the one weakness of a per-screen
 * approach and the reason it is worth a check at all.
 *
 * Static on purpose: what is being asserted is that the declaration EXISTS in
 * the file, which no runtime test would catch any better.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, posix, sep } from 'node:path';

let failed = 0;
const mark = (pass, name, detail) => {
  if (!pass) failed++;
  console.log((pass ? 'PASS  ' : 'FAIL  ') + name + (pass || !detail ? '' : '\n      ' + detail));
};
const ok = (name, value, detail) => mark(Boolean(value), name, detail);

// --- what counts as a screen that needs the light treatment ----------------
/**
 * A navy or near-black SCREEN ROOT, not any use of the colour.
 *
 * Two deliberate narrowings, both learned from false positives this check
 * raised the first time it ran:
 *
 *   - the navy half is tied to SafeAreaView, which is what every dark screen
 *     root in this app is built on. `components/web/ROISection.tsx` has a
 *     `flex-1 bg-navy` COLUMN inside a row — a panel, not a screen;
 *   - the closing quote or space keeps `bg-navy/[0.55]` out, which is a dim
 *     overlay rather than a background and is handled by SheetShell below.
 *
 * The camera is matched on its own near-black, which no panel uses.
 */
const DARK_ROOT =
  /<SafeAreaView\s+className="flex-1 bg-navy(?:"|\s)|className="flex-1 bg-\[#05070d\](?:"|\s)/;
const LIGHT_BAR = /<StatusBar\s+style="light"/;

/**
 * Web-only, so there is no native status bar to speak of. `(dash)` and `(web)`
 * redirect a phone away, `c/[slug]` is the public card page, and the two
 * components are the desktop sign-in shell and the legal pages — their callers
 * return them before the native tree is reached.
 */
const WEB_ONLY = [
  'app/(dash)/',
  'app/(web)/',
  'app/c/',
  'components/web/',
  'components/auth/AuthWebShell.tsx',
];

function walk(dir, found = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, found);
    else if (entry.endsWith('.tsx')) found.push(path.split(sep).join(posix.sep));
  }
  return found;
}

const files = [...walk('app'), ...walk('components')];
ok('the tree was scanned', files.length > 50, 'only found ' + files.length + ' .tsx files');

// --- 1. the native default, for the frame before React mounts --------------
{
  const plugins = JSON.parse(readFileSync('app.json', 'utf8')).expo.plugins;
  const entry = plugins.find((p) => p === 'expo-status-bar' || p?.[0] === 'expo-status-bar');

  ok('app.json still registers expo-status-bar', entry);
  ok(
    '  ...with props rather than as a bare string',
    Array.isArray(entry),
    'a bare string writes no android:windowLightStatusBar at all, which is what left the icons white'
  );
  ok(
    '  ...declaring a style',
    Array.isArray(entry) && typeof entry[1]?.style === 'string',
    'the plugin ignores props with no style'
  );
  ok(
    '  ...light, to match the navy splash it sits over',
    Array.isArray(entry) && entry[1]?.style === 'light',
    'app.json sets the splash backgroundColor to #0B132B'
  );
}

// --- 2. the JS default, correct for the light majority ---------------------
{
  const root = readFileSync('app/_layout.tsx', 'utf8');
  ok('the root layout imports StatusBar', /from 'expo-status-bar'/.test(root));
  ok(
    '  ...and renders the dark default the light screens inherit',
    /<StatusBar\s+style="dark"/.test(root),
    'without this every #F5F7FB screen keeps the white Android icons'
  );
}

// --- 3. every dark screen overrides it -------------------------------------
{
  const dark = files.filter(
    (f) => !WEB_ONLY.some((p) => f.startsWith(p)) && DARK_ROOT.test(readFileSync(f, 'utf8'))
  );

  ok(
    'the navy family was found',
    dark.length >= 14,
    'expected at least 14 dark-rooted screens, found ' + dark.length
  );

  const missing = dark.filter((f) => !LIGHT_BAR.test(readFileSync(f, 'utf8')));
  ok(
    'every dark-rooted screen renders <StatusBar style="light" />',
    missing.length === 0,
    'missing in:\n      ' + missing.join('\n      ')
  );
}

// --- 4. the dimmed modal routes --------------------------------------------
// `transparentModal` covers the status bar too, so the bar sits over the dim
// rather than over the screen underneath it.
{
  const sheet = readFileSync('components/app/SheetShell.tsx', 'utf8');
  ok(
    'SheetShell carries the light bar for all eight (modals) routes',
    LIGHT_BAR.test(sheet),
    'one line here is what keeps the modal screens from each needing their own'
  );

  const share = readFileSync('app/(app)/card/share.tsx', 'utf8');
  ok('the share sheet, which has its own dim, carries one too', LIGHT_BAR.test(share));
}

// --- 5. nothing tries to set a background ----------------------------------
// Under edge-to-edge `backgroundColor` does nothing and expo-status-bar warns
// about it, so a well-meaning addition later should be caught here.
{
  const offenders = files.filter((f) => {
    const text = readFileSync(f, 'utf8');
    return /<StatusBar[^>]*backgroundColor/.test(text);
  });
  ok(
    'no StatusBar passes backgroundColor',
    offenders.length === 0,
    'a no-op under edge-to-edge:\n      ' + offenders.join('\n      ')
  );
}

console.log(failed ? '\n' + failed + ' check(s) failed' : '\nAll checks passed');
process.exit(failed ? 1 : 0);
