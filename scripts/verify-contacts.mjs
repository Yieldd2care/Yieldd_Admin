/**
 * Checks for lib/contactCard.ts — the shape a lead takes on its way into the
 * rep's phone.
 *
 *   npm run verify:contacts
 *
 * Two kinds of failure are guarded here. One is silent: Android drops a contact
 * whose phone entry has no label, and rejects one carrying an empty
 * `phoneNumbers: [{}]` — the rep taps Save and simply nothing appears. The other
 * is a privacy decision that someone could helpfully undo later, so the absence
 * of the note and the voice summary is asserted rather than trusted.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const out = mkdtempSync(join(tmpdir(), 'yieldd-contacts-'));
let m;
try {
  // CommonJS rather than the esnext the other pure scripts use: contactCard.ts
  // imports ./vcard and ./phone, and tsc emits those specifiers without a .js
  // extension, which Node's ESM resolver rejects. CJS require() resolves them.
  writeFileSync(join(out, 'package.json'), '{"type":"commonjs"}\n');
  execFileSync(
    process.execPath,
    [
      'node_modules/typescript/bin/tsc',
      'lib/contactCard.ts',
      '--outDir', out,
      '--module', 'commonjs',
      '--target', 'es2022',
      '--moduleResolution', 'node',
      '--skipLibCheck',
      '--typeRoots', out,
    ],
    { stdio: 'inherit' }
  );
  m = await import(pathToFileURL(join(out, 'contactCard.js')).href);
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
const ok = (name, cond) => eq(name, Boolean(cond), true);

// A lead off a card scan, with everything filled in.
const FULL = {
  name: 'Priya Sharma',
  company: 'Northline Industries, Pvt Ltd',
  designation: 'Head of Procurement',
  phone: '98204 41720',
  landline: '022 2493 1234',
  email: 'priya@northline.example',
  website: 'https://northline.example',
  address: '4th Floor, Sion East, Mumbai',
};

const full = m.toExpoContact(FULL);

// --- the fields the OS needs ---
eq('contactType is set (required by the type)', full.contactType, 'person');
eq('display name', full.name, 'Priya Sharma');
eq('iOS first name', full.firstName, 'Priya');
eq('iOS last name', full.lastName, 'Sharma');
eq('company', full.company, 'Northline Industries, Pvt Ltd');
eq('designation becomes jobTitle', full.jobTitle, 'Head of Procurement');

// --- phones ---
// A contact card is the one place a country code earns its keep, so the mobile
// is normalised here even though the stored lead is left alone.
eq('mobile is normalised and labelled', full.phoneNumbers[0], {
  label: 'mobile',
  number: '+919820441720',
});
eq('landline rides along as a second work number', full.phoneNumbers[1], {
  label: 'work',
  number: '+912224931234',
});
eq('exactly two numbers', full.phoneNumbers.length, 2);

// --- the rest, all labelled ---
eq('email is labelled', full.emails, [{ label: 'work', email: 'priya@northline.example' }]);
eq('website is labelled', full.urlAddresses, [{ label: 'work', url: 'https://northline.example' }]);
eq('address is labelled', full.addresses, [
  { label: 'work', street: '4th Floor, Sion East, Mumbai' },
]);

// A missing label is a silent no-op on Android — nothing appears and nothing
// errors — so every entry in every array is checked for one.
const everyLabelled = [
  ...(full.phoneNumbers ?? []),
  ...(full.emails ?? []),
  ...(full.urlAddresses ?? []),
  ...(full.addresses ?? []),
].every((entry) => typeof entry.label === 'string' && entry.label.length > 0);
ok('every entry carries a label', everyLabelled);

// --- names that are not two words ---
const single = m.toExpoContact({ name: 'Ramesh' });
eq('a single-word name sets firstName', single.firstName, 'Ramesh');
eq('  ...and no lastName', 'lastName' in single, false);

const triple = m.toExpoContact({ name: 'Priya Sharma Iyer' });
eq('a three-part name splits on the FIRST space', [triple.firstName, triple.lastName], [
  'Priya',
  'Sharma Iyer',
]);

// --- the lead with nothing but a name ---
// This is the case that makes Android reject the whole contact: an empty
// phoneNumbers array, or worse `[{}]`, rather than no key at all.
const bare = m.toExpoContact({ name: 'Walk-up visitor' });
eq('no phone means NO phoneNumbers key at all', 'phoneNumbers' in bare, false);
eq('no email means no emails key', 'emails' in bare, false);
eq('no website means no urlAddresses key', 'urlAddresses' in bare, false);
eq('no address means no addresses key', 'addresses' in bare, false);
eq('but the name and type still survive', [bare.name, bare.contactType], [
  'Walk-up visitor',
  'person',
]);
eq('an empty name does not produce an empty contact', m.toExpoContact({ name: '   ' }).name, 'Unknown');

// --- the overseas buyer ---
// normalizePhone leaves a +-prefixed number alone, so this must survive intact
// rather than being decorated with +91.
const foreign = m.toExpoContact({ name: 'John Fisher', phone: '+1 415-555-0134' });
eq('a US number is not turned Indian', foreign.phoneNumbers[0].number, '+14155550134');

// A number too short to normalise sensibly keeps the raw text rather than
// becoming a plausible-looking wrong number.
const shortNum = m.toExpoContact({ name: 'Front Desk', phone: '2493 1234' });
eq('a too-short number is left as typed', shortNum.phoneNumbers[0].number, '2493 1234');

// --- the privacy line ---
// A rep's address book syncs to iCloud and Google. Conversation notes do not go
// there. If someone "helpfully" adds them back, this fails.
const withNote = {
  ...FULL,
  note: 'Budget 40 lakhs, decides Friday',
  voiceSummary: 'Wants a quote with lead times',
};
const contactJson = JSON.stringify(m.toExpoContact(withNote));
const vcardText = m.leadVCard(withNote);
ok('the note never reaches the contact', !contactJson.includes('40 lakhs'));
ok('the voice summary never reaches the contact', !contactJson.includes('lead times'));
ok('the note never reaches the vCard', !vcardText.includes('40 lakhs'));
ok('the voice summary never reaches the vCard', !vcardText.includes('lead times'));

// --- the vCard the web download hands over ---
ok('vCard has the mobile as CELL', vcardText.includes('TEL;TYPE=CELL:+919820441720'));
ok('vCard has the landline as WORK', vcardText.includes('TEL;TYPE=WORK:+912224931234'));
ok('vCard has the org', vcardText.includes('ORG:'));
ok('vCard has the title', vcardText.includes('TITLE:Head of Procurement'));
// A comma in a company name is a field separator in vCard grammar; unescaped it
// splits ORG into two values and the contact imports wrong.
ok('a comma in the company name is escaped', vcardText.includes('Northline Industries\\, Pvt Ltd'));

// --- the download filename ---
eq('filename is slugged', m.contactFilename('Priya Sharma'), 'priya-sharma.vcf');
eq('  ...and survives punctuation', m.contactFilename('J.P. Mehta & Co.'), 'j-p-mehta-co.vcf');
eq('  ...and a name with no latin letters still gets a file', m.contactFilename('प्रिया'), 'contact.vcf');

console.log(`\n${failed === 0 ? 'All checks passed.' : `${failed} check(s) FAILED.`}`);
process.exit(failed ? 1 : 0);
