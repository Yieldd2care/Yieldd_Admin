/**
 * Checks for lib/cardLinks.ts.
 *
 *   npm run verify:card-links
 *
 * Most of these are security checks rather than formatting ones. A digital
 * business card is a page served from yieldd.co whose every link was typed by
 * its owner and is tapped by strangers, so an unfiltered href there is stored
 * XSS against the people the card was shared with — not against the person who
 * typed it. The scheme filter is the only thing standing between those two
 * facts, and it gets tested like it.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const out = mkdtempSync(join(tmpdir(), 'yieldd-cardlinks-'));
const shimDir = mkdtempSync(join(tmpdir(), 'yieldd-shim-'));

// The compile is deliberately isolated from the project's own types — that is
// what stops React Native's globals hiding a mistake. cardLinks.ts reads
// `process.env.EXPO_PUBLIC_CARD_BASE_URL`, spelled exactly like that because
// Metro inlines that literal at build time, so the isolated compile needs the
// one ambient declaration and nothing else.
writeFileSync(join(shimDir, 'process.d.ts'), 'declare const process: { env: Record<string, string | undefined> };\n');

let links;
try {
  execFileSync(
    process.execPath,
    [
      'node_modules/typescript/bin/tsc',
      'lib/cardLinks.ts',
      join(shimDir, 'process.d.ts'),
      '--outDir', out,
      '--module', 'esnext',
      '--target', 'es2022',
      '--moduleResolution', 'bundler',
      '--skipLibCheck',
      '--typeRoots', out,
    ],
    { stdio: 'inherit' }
  );
  links = await import(pathToFileURL(join(out, 'cardLinks.js')).href);
} finally {
  rmSync(out, { recursive: true, force: true });
  rmSync(shimDir, { recursive: true, force: true });
}

let failed = 0;
const eq = (name, actual, expected) => {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  if (!pass) failed++;
  console.log(
    `${pass ? 'PASS' : 'FAIL'}  ${name}` +
      (pass ? '' : `\n        got  ${JSON.stringify(actual)}\n        want ${JSON.stringify(expected)}`)
  );
};

// --- the scheme filter: what this file exists for ---
for (const attack of [
  'javascript:alert(1)',
  'JavaScript:alert(1)',
  '  javascript:alert(1)',
  'data:text/html,<script>alert(1)</script>',
  'vbscript:msgbox(1)',
  'file:///etc/passwd',
  'blob:https://yieldd.co/abc',
  'jav\tascript:alert(1)',
  'java\nscript:alert(1)',
]) {
  eq(`refused: ${JSON.stringify(attack)}`, links.safeExternalUrl(attack), null);
}

eq('an empty value is not a link', links.safeExternalUrl(''), null);
eq('whitespace is not a link', links.safeExternalUrl('   '), null);
eq('null is not a link', links.safeExternalUrl(null), null);

// --- the ordinary cases ---
eq('https passes through', links.safeExternalUrl('https://yieldd.co/'), 'https://yieldd.co/');
eq('http passes through', links.safeExternalUrl('http://yieldd.co/'), 'http://yieldd.co/');
eq(
  'a bare domain is assumed to be https',
  links.safeExternalUrl('yieldd.co'),
  'https://yieldd.co/'
);
eq(
  'a path survives',
  links.safeExternalUrl('northline.co.in/products/castings'),
  'https://northline.co.in/products/castings'
);

// --- LinkedIn, however it was typed ---
const expectedLinkedIn = 'https://www.linkedin.com/in/priya-sharma';
eq('a bare handle', links.linkedinUrl('priya-sharma'), expectedLinkedIn);
eq('an @handle', links.linkedinUrl('@priya-sharma'), expectedLinkedIn);
eq('an in/ handle', links.linkedinUrl('in/priya-sharma'), expectedLinkedIn);
eq(
  'a full URL is kept as typed',
  links.linkedinUrl('https://www.linkedin.com/in/priya-sharma'),
  'https://www.linkedin.com/in/priya-sharma'
);
eq(
  'a bare linkedin.com URL gains its scheme',
  links.linkedinUrl('linkedin.com/in/priya-sharma'),
  'https://linkedin.com/in/priya-sharma'
);
eq('a javascript: LinkedIn is refused', links.linkedinUrl('javascript:alert(1)'), null);
eq('an empty LinkedIn is null', links.linkedinUrl(''), null);

// --- phone and email ---
eq('a bare Indian mobile', links.telUrl('98204 41720'), 'tel:9820441720');
eq('a +91 number keeps its plus', links.telUrl('+91 98204 41720'), 'tel:+919820441720');
eq('a number too short to dial is null', links.telUrl('12345'), null);
eq('an email becomes a mailto', links.mailtoUrl('priya@northline.co.in'), 'mailto:priya@northline.co.in');
eq('something that is not an address is null', links.mailtoUrl('not-an-address'), null);

// --- social links: jsonb the database only proved was an array ---
eq(
  'a well-formed list survives',
  links.readSocialLinks([{ label: 'Instagram', url: 'https://instagram.com/priya' }]),
  [{ label: 'Instagram', url: 'https://instagram.com/priya' }]
);
eq(
  'a javascript: entry is dropped, not rendered',
  links.readSocialLinks([
    { label: 'Instagram', url: 'https://instagram.com/priya' },
    { label: 'Click me', url: 'javascript:alert(1)' },
  ]),
  [{ label: 'Instagram', url: 'https://instagram.com/priya' }]
);
eq(
  'a missing label falls back to the host',
  links.readSocialLinks([{ url: 'https://www.instagram.com/priya' }]),
  [{ label: 'instagram.com', url: 'https://www.instagram.com/priya' }]
);
eq('a non-array is empty, not a crash', links.readSocialLinks({ label: 'x' }), []);
eq('null is empty', links.readSocialLinks(null), []);
eq('junk elements are skipped', links.readSocialLinks([null, 42, 'https://x.test', {}]), []);
eq(
  'the list is capped so one card cannot be a link farm',
  links.readSocialLinks(
    Array.from({ length: 40 }, (_, i) => ({ label: `L${i}`, url: `https://x${i}.test` }))
  ).length,
  20
);

// --- the share URL ---
eq('the card URL is built from the base', links.cardShareUrl('priya-sharma'), 'https://yieldd.co/c/priya-sharma');
eq('the scheme is dropped for display', links.displayUrl('https://yieldd.co/c/priya-sharma'), 'yieldd.co/c/priya-sharma');

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nall checks passed');
process.exit(failed ? 1 : 0);
