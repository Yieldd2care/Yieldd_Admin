/**
 * Checks the two pure halves of the contacts feature: lib/contactCard.ts, the
 * shape a lead takes on its way INTO the rep's phone, and lib/pickedContact.ts,
 * the shape a contact takes coming back OUT of it when an admin picks a rep to
 * invite.
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
let picked;
try {
  // CommonJS rather than the esnext the other pure scripts use: contactCard.ts
  // imports ./vcard and ./phone, and tsc emits those specifiers without a .js
  // extension, which Node's ESM resolver rejects. CJS require() resolves them.
  writeFileSync(join(out, 'package.json'), '{"type":"commonjs"}\n');
  execFileSync(
    process.execPath,
    [
      'node_modules/typescript/bin/tsc',
      // TypeScript 6 makes it an error to have a tsconfig.json present while
      // naming files on the command line. This compile is deliberately
      // standalone — the flag says so instead of letting tsc refuse.
      '--ignoreConfig',
      'lib/contactCard.ts',
      'lib/pickedContact.ts',
      '--outDir', out,
      '--module', 'commonjs',
      '--target', 'es2022',
      // No `--moduleResolution`: node10 is already the default for
      // `--module commonjs`, and naming it is a TypeScript 6 error.
      '--skipLibCheck',
      '--typeRoots', out,
    ],
    { stdio: 'inherit' }
  );
  m = await import(pathToFileURL(join(out, 'contactCard.js')).href);
  picked = await import(pathToFileURL(join(out, 'pickedContact.js')).href);
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

// ---------------------------------------------------------------------------
// readPickedContact: a contact coming back OUT of the phone book, on its way
// into the two fields on the invite screen.
// ---------------------------------------------------------------------------
const read = picked.readPickedContact;

// What the picker hands back is a Bundle on Android and a dictionary on iOS.
// Nothing validates it on the way across, so garbage must not throw.
eq('null does not throw', read(null), { name: '', numbers: [] });
eq('undefined does not throw', read(undefined), { name: '', numbers: [] });
eq('an empty object is empty', read({}), { name: '', numbers: [] });
eq('a non-array phoneNumbers is ignored', read({ phoneNumbers: 'nope' }).numbers, []);

eq('a name with no numbers still keeps the name', read({ name: 'Ravi Menon' }), {
  name: 'Ravi Menon',
  numbers: [],
});

// Android genuinely produces these. A kept row would show the admin an empty
// phone field as though a number had been found.
eq('an empty phone entry is dropped', read({ name: 'A', phoneNumbers: [{}] }).numbers, []);
eq(
  'a label with no number is dropped',
  read({ name: 'A', phoneNumbers: [{ label: 'mobile' }] }).numbers,
  []
);
eq(
  'a blank number is dropped',
  read({ name: 'A', phoneNumbers: [{ label: 'mobile', number: '   ' }] }).numbers,
  []
);

// An address book routinely holds one number twice, under 'mobile' and again
// under 'WhatsApp'. Asking the admin to choose between two identical numbers
// is a worse question than not asking, because it implies they differ.
eq(
  'the same number under two labels collapses, first label wins',
  read({
    name: 'Priya',
    phoneNumbers: [
      { label: 'mobile', number: '+91 98765 43210' },
      { label: 'WhatsApp', number: '+91 98765 43210' },
    ],
  }).numbers,
  [{ label: 'mobile', number: '+91 98765 43210' }]
);

// The same person written two ways. phoneMatchKey is what sees through it,
// and reusing it is why this file does not invent a second matching rule.
eq(
  'the same number in two formats collapses',
  read({
    phoneNumbers: [
      { label: 'mobile', number: '+91 98765 43210' },
      { label: 'home', number: '098765 43210' },
    ],
  }).numbers.length,
  1
);
eq(
  'two genuinely different numbers both survive',
  read({
    phoneNumbers: [
      { label: 'mobile', number: '9876543210' },
      { label: 'work', number: '9123456789' },
    ],
  }).numbers.length,
  2
);

// A Google-synced book files some people under their parts only, and a rep
// row with a number but no name is not usable.
eq(
  'a missing display name is assembled from the parts',
  read({ firstName: 'Priya', lastName: 'Sharma' }).name,
  'Priya Sharma'
);
eq(
  'a middle name rides along',
  read({ firstName: 'Priya', middleName: 'R', lastName: 'Sharma' }).name,
  'Priya R Sharma'
);
eq('a display name wins over the parts', read({ name: 'Priya S', firstName: 'X' }).name, 'Priya S');

// Labels are localised by the OS, so they are shown and never switched on.
// A row with no label still needs something to show.
eq(
  'a missing label becomes a generic one',
  read({ phoneNumbers: [{ number: '9876543210' }] }).numbers[0].label,
  'phone'
);

// THE PAIR THAT LOCKS IN THE DESIGN. The number reaches the text field exactly
// as the contact stores it, so a picked number takes the identical path a typed
// one does and createInvites normalises it once, later. Normalising here would
// prepend +91 to an overseas number and make a wrong value look vetted in a
// field the admin is looking straight at.
eq(
  'a US number is handed over untouched',
  read({ phoneNumbers: [{ label: 'mobile', number: '(415) 555-0134' }] }).numbers[0].number,
  '(415) 555-0134'
);
eq(
  'an Indian number is not decorated either',
  read({ phoneNumbers: [{ label: 'mobile', number: '098204 41720' }] }).numbers[0].number,
  '098204 41720'
);

// --- a lead carrying more than one of each ---------------------------------
//
// The extras are worth nothing if they stop at the database. This is the one
// place a rep actually uses them: the contact in their own phone.

const MANY = {
  ...FULL,
  extraPhones: ['+91 99300 11223', '98204 41720'],
  extraEmails: ['accounts@northline.example', 'PRIYA@northline.example'],
  extraDesignations: ['Director'],
};
const many = m.toExpoContact(MANY);
const manyNumbers = many.phoneNumbers.map((entry) => entry.number);
const manyEmails = many.emails.map((entry) => entry.email);

ok('a second mobile reaches the contact', manyNumbers.includes('+919930011223'));

// The list repeats the primary, written the way it is printed on the card. It
// is the same number, and only normalising first makes that visible - a raw
// string comparison would put both into the address book.
eq(
  'the same number written two ways lands once, not twice',
  manyNumbers.filter((number) => number === '+919820441720').length,
  1
);

// The switchboard stays last: the person first, their company after.
eq(
  'the company landline is still the final number',
  manyNumbers[manyNumbers.length - 1],
  '+912224931234'
);

ok('a second email reaches the contact', manyEmails.includes('accounts@northline.example'));
eq(
  'the primary address in a different case is not a second address',
  manyEmails.filter((address) => address.toLowerCase() === 'priya@northline.example').length,
  1
);

// TITLE may repeat in vCard, but most contacts apps keep only the first and
// drop the rest silently. A joined title survives; a second one would not.
eq('two job titles are joined into one', many.jobTitle, 'Head of Procurement / Director');
eq(
  'and the vCard carries a single TITLE line',
  m.leadVCard(MANY).match(/^TITLE:/gm).length,
  1
);

// vCard 3.0 does allow TEL and EMAIL to repeat and contacts apps keep all of
// them, so those are emitted as separate lines rather than joined.
eq('the vCard repeats TEL instead of joining numbers', m.leadVCard(MANY).match(/^TEL/gm).length, 3);

// A lead with no extras must produce exactly what it did before this existed.
eq(
  'a lead with no extras is untouched by any of this',
  JSON.stringify(m.toExpoContact(FULL)),
  JSON.stringify(full)
);

console.log(`\n${failed === 0 ? 'All checks passed.' : `${failed} check(s) FAILED.`}`);
process.exit(failed ? 1 : 0);
