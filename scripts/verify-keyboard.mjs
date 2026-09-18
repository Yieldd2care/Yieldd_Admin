/**
 * Structural checks for keyboard handling on the phone screens (PENDING #69).
 *
 *   npm run verify:keyboard
 *
 * **This proves nothing about the keyboard.** It cannot open one. Only a
 * handset can tell you whether a field is covered, and a green run here is not
 * a tested screen. What it does is stop the drift that caused #69 in the first
 * place: the app has ONE shared wrapper, components/app/KeyboardSafe.tsx, and
 * over three rounds of work five screens quietly hand-rolled their own copy
 * with a different Android setting, while two more closed the wrapper before
 * rendering their Save button. Nothing flagged any of it.
 *
 * Three rules, each one a bug that actually shipped:
 *
 *   1. A screen with a text field is wrapped in KeyboardSafe or SheetShell.
 *   2. Nothing but KeyboardSafe.tsx imports KeyboardAvoidingView.
 *   3. No JSX sits between </KeyboardSafe> and </SafeAreaView> — that is a
 *      footer left underneath the keyboard.
 *
 * Phone screens only. The web dashboard, app/(dash) and components/dash, and
 * the *Web.tsx screen bodies are excluded: in a browser the soft keyboard is
 * the browser's problem and KeyboardAvoidingView is inert, its Keyboard events
 * never firing there.
 *
 * A screen that genuinely should not be wrapped opts out with a comment
 * containing `verify:keyboard exempt` followed by a reason on the same line.
 * The reason is required, so an exemption has to be argued rather than dropped
 * in.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';

const ROOT = process.cwd();
const ROOTS = ['app', 'components'];

/** Anything that raises a soft keyboard. */
const INPUTS = [
  '<TextInput',
  '<RNTextInput',
  '<AuthPillInput',
  '<CustomFieldInput',
  '<FloatingLabelInput',
];

const WRAPPERS = ['<KeyboardSafe', '<SheetShell'];

let failed = 0;
const fail = (file, message) => {
  failed += 1;
  console.log(`  FAIL  ${file}\n        ${message}`);
};

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith('.tsx')) out.push(full);
  }
  return out;
}

/** Browser-only, so excluded from every rule below. */
const isWeb = (rel) =>
  rel.startsWith(`app${sep}(dash)${sep}`) ||
  rel.startsWith(`components${sep}dash${sep}`) ||
  rel.endsWith('Web.tsx');

/** JSX comments would otherwise read as content in rule 3. */
const stripComments = (s) => s.replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '');

/**
 * Does <Name /> render a Modal?
 *
 * This is the difference between a real fault and a false one in rule 3. A
 * Modal portals to its own window, so it has no layout in the tree it is
 * written in, and sitting after </KeyboardSafe> costs nothing —
 * CaptureLocationNotice and PhoneChoiceSheet are both deliberately placed
 * there, each with a comment saying why. A plain View in the same position is
 * a footer under the keyboard. Rather than keep a list of component names that
 * goes stale, follow the import and look.
 */
function rendersModal(name, importerRel) {
  const src = readFileSync(join(ROOT, importerRel), 'utf8');
  const spec = new RegExp(
    'import\\s*\\{[^}]*\\b' + name + '\\b[^}]*\\}\\s*from\\s*\'([^\']+)\''
  ).exec(src);
  if (!spec || !spec[1].startsWith('.')) return false;
  try {
    return /<Modal[\s>]/.test(readFileSync(join(ROOT, dirname(importerRel), spec[1] + '.tsx'), 'utf8'));
  } catch {
    return false;
  }
}

const files = ROOTS.flatMap((r) => walk(join(ROOT, r))).map((f) => relative(ROOT, f));

console.log('verify:keyboard — structure only. A handset is still the test.\n');

// ---------------------------------------------------------------- rule 1
console.log('1. Every phone screen with a text field is wrapped');

let checked1 = 0;
for (const rel of files) {
  if (isWeb(rel)) continue;
  const src = readFileSync(join(ROOT, rel), 'utf8');
  if (!INPUTS.some((t) => src.includes(t))) continue;

  // A shared sub-component is rendered inside a screen that carries the
  // wrapper, so it neither needs nor should have one of its own. A file is a
  // screen if it is a route under app/, or if it paints a SafeAreaView — which
  // is what a screen body such as AuthFormNative does and a field component
  // never does.
  const isScreen = rel.startsWith(`app${sep}`) || src.includes('<SafeAreaView');
  if (!isScreen) continue;

  const exempt = /verify:keyboard exempt\s+(\S.*)/.exec(src);
  if (exempt) {
    console.log(`  exempt ${rel}\n         ${exempt[1].replace(/\s*(\*\/|\{?\/\*).*$/, '').trim()}`);
    continue;
  }

  checked1 += 1;
  if (!WRAPPERS.some((w) => src.includes(w))) {
    fail(
      rel,
      'renders a text field but is wrapped in neither KeyboardSafe nor SheetShell.\n' +
        '        Wrap it, or add a comment: verify:keyboard exempt <why>'
    );
  }
}
console.log(`  ${checked1} screen(s) checked\n`);

// ---------------------------------------------------------------- rule 2
console.log('2. Only KeyboardSafe.tsx imports KeyboardAvoidingView');

const OWNER = join('components', 'app', 'KeyboardSafe.tsx');
for (const rel of files) {
  if (isWeb(rel) || rel === OWNER) continue;
  const src = readFileSync(join(ROOT, rel), 'utf8');
  if (/import\s*\{[^}]*\bKeyboardAvoidingView\b[^}]*\}\s*from\s*'react-native'/.test(src)) {
    fail(
      rel,
      "imports KeyboardAvoidingView directly. Use <KeyboardSafe> instead — a\n" +
        '        hand-rolled copy is how #69 ended up with two different Android\n' +
        '        strategies in one codebase.'
    );
  }
}

const owner = readFileSync(join(ROOT, OWNER), 'utf8');
if (!/behavior="padding"/.test(owner)) {
  fail(
    OWNER,
    'no longer passes behavior="padding". If that is deliberate, this check and\n' +
      '        the docblock above it both need updating — see PENDING #69 for why\n' +
      '        "height" and undefined were both wrong.'
  );
}
console.log('  done\n');

// ---------------------------------------------------------------- rule 3
console.log('3. No footer left outside the wrapper');

for (const rel of files) {
  if (isWeb(rel)) continue;
  const src = stripComments(readFileSync(join(ROOT, rel), 'utf8'));
  const close = src.lastIndexOf('</KeyboardSafe>');
  if (close === -1) continue;
  const after = src.indexOf('</SafeAreaView>', close);
  if (after === -1) continue;

  const between = src.slice(close + '</KeyboardSafe>'.length, after);
  const tags = [...between.matchAll(/<([A-Za-z][A-Za-z0-9_]*)/g)].map((m) => m[1]);
  const laidOut = tags.filter((t) => !rendersModal(t, rel));
  if (laidOut.length > 0) {
    fail(
      rel,
      `renders <${laidOut[0]}> between </KeyboardSafe> and </SafeAreaView>. A Save\n` +
        '        row there sits under the keyboard however well the fields are lifted —\n' +
        '        wrap the footer as well as the scroller. (A Modal in that position is\n' +
        '        fine: it portals to its own window and has no layout in this tree.)'
    );
  }
}
console.log('  done');

console.log(failed ? `\n${failed} check(s) failed.` : '\nAll checks passed.');
console.log('Structure only — the screens still have to be opened on a phone.');
process.exitCode = failed ? 1 : 0;
