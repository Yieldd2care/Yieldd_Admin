/**
 * Checks for lib/messageText.ts — what a customer actually receives.
 *
 *   npm run verify:messaging
 *
 * This is the only code in the app whose output is read by someone outside the
 * company, so the failure modes it guards against are embarrassment rather than
 * crashes: a literal `{{name}}` going out, "Hi , great meeting you", or a
 * wa.me link that opens a contact picker instead of the right chat.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const out = mkdtempSync(join(tmpdir(), 'yieldd-msg-'));
let m;
try {
  execFileSync(
    process.execPath,
    [
      'node_modules/typescript/bin/tsc',
      'lib/messageText.ts',
      '--outDir', out,
      '--module', 'esnext',
      '--target', 'es2022',
      '--moduleResolution', 'bundler',
      '--skipLibCheck',
      '--typeRoots', out,
    ],
    { stdio: 'inherit' }
  );
  m = await import(pathToFileURL(join(out, 'messageText.js')).href);
} finally {
  rmSync(out, { recursive: true, force: true });
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

const TEMPLATE = "Hi {{name}}, great meeting you at {{event}}. Sharing our brochure — let us know if you'd like a quote.";

// --- the ordinary case ---
eq(
  'a full template fills in',
  m.renderTemplate(TEMPLATE, { name: 'Rajesh Menon', event: 'IMTEX 2026' }),
  "Hi Rajesh, great meeting you at IMTEX 2026. Sharing our brochure — let us know if you'd like a quote."
);
eq(
  'the first name is used, not the full name',
  m.renderTemplate('Hi {{name}}!', { name: 'Mahesh Singh Rajput' }),
  'Hi Mahesh!'
);
eq(
  'every field resolves',
  m.renderTemplate('{{name}} / {{company}} / {{event}} / {{sender}} / {{sender_company}}', {
    name: 'Anita', company: 'Kamal Tooling', event: 'Plastindia', sender: 'Priya', senderCompany: 'Acme',
  }),
  'Anita / Kamal Tooling / Plastindia / Priya / Acme'
);

// --- the cases that would embarrass someone ---
eq(
  'a missing name never leaves a literal {{name}} in the message',
  m.renderTemplate(TEMPLATE, { event: 'IMTEX 2026' }),
  "Hi, great meeting you at IMTEX 2026. Sharing our brochure — let us know if you'd like a quote."
);
eq(
  'a missing event does not leave a dangling "at"',
  m.renderTemplate('Great meeting you at {{event}}.', {}).includes('{{'),
  false
);
eq(
  'nothing renders as the word null or undefined',
  /null|undefined/.test(m.renderTemplate('{{name}} {{company}} {{event}}', {})),
  false
);
eq('an empty context leaves no placeholders', m.renderTemplate('{{name}}{{company}}', {}), '');
eq(
  'a repeated placeholder is replaced everywhere',
  m.renderTemplate('{{name}}, are you free? Thanks {{name}}.', { name: 'Vikram Deshpande' }),
  'Vikram, are you free? Thanks Vikram.'
);
eq(
  'whitespace-only values count as missing',
  m.renderTemplate('Hi {{name}}.', { name: '   ' }),
  'Hi.'
);

// --- phone numbers: a wrong one opens the wrong chat, or none ---
eq('a bare 10-digit Indian mobile gets +91', m.whatsappDigits('9820441720'), '919820441720');
eq('spaces and dashes are ignored', m.whatsappDigits('98204 41720'), '919820441720');
eq('a printed +91 is kept', m.whatsappDigits('+91 98204 41720'), '919820441720');
eq('the domestic 0 prefix is replaced', m.whatsappDigits('09920118447'), '919920118447');
eq('an international number is left alone', m.whatsappDigits('+44 7700 900123'), '447700900123');
eq('too short is refused rather than guessed', m.whatsappDigits('12345'), null);
eq('an empty number is refused', m.whatsappDigits(''), null);
eq('a null number is refused', m.whatsappDigits(null), null);

// --- URLs ---
eq(
  'a wa.me link carries the number and the text',
  m.whatsappUrl('+91 98204 41720', 'Hi Rajesh'),
  'https://wa.me/919820441720?text=Hi%20Rajesh'
);
eq(
  'no usable number still opens WhatsApp, with a contact picker',
  m.whatsappUrl('123', 'Hi'),
  'https://wa.me/?text=Hi'
);
eq(
  'newlines and ampersands survive encoding',
  m.whatsappUrl('9820441720', 'Line one\nR&D team').endsWith('Line%20one%0AR%26D%20team'),
  true
);
eq(
  'mailto carries subject and body',
  m.mailtoUrl('rajesh@northline.co.in', 'Great meeting you', 'Hi Rajesh'),
  'mailto:rajesh%40northline.co.in?subject=Great%20meeting%20you&body=Hi%20Rajesh'
);
eq(
  'a mailto body encodes a plus rather than turning it into a space',
  m.mailtoUrl('a@b.com', 'Quote', 'Budget +10%').includes('%2B10%25'),
  true
);

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nall checks passed');
process.exit(failed ? 1 : 0);
