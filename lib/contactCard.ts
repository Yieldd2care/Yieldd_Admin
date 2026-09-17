import { buildVCard, type VCardInput } from './vcard';
import { normalizePhone, digitsOf } from './phone';

/**
 * Turning a captured lead into the shape a contacts app wants.
 *
 * Pure and platform-free on purpose — the same split as lib/messageText.ts
 * against lib/messaging.ts. Everything that touches a device (permissions, the
 * system contact form, a browser download) lives in lib/contacts.ts; everything
 * here can be compiled and checked in Node by `npm run verify:contacts`.
 *
 * Free-tier, deliberately (MVP_PLAN, "What Free gets") — do not let a Phase 5
 * gate creep onto this by accident.
 */

/** The fields a lead contributes to a contact card. Neither shape's own type. */
export type ContactInput = {
  name: string;
  company?: string;
  designation?: string;
  phone?: string;
  landline?: string;
  email?: string;
  /**
   * A lead's further numbers, addresses and job titles.
   *
   * All optional, so the business-card callers - app/c/[slug].tsx,
   * app/(dash)/card.tsx, app/(app)/card/share.tsx - go on compiling and
   * behaving exactly as they did. Only a lead ever has these.
   */
  extraPhones?: string[];
  extraEmails?: string[];
  extraDesignations?: string[];
  website?: string;
  address?: string;
};

/**
 * A phone number belongs in an address book with its country code — this is the
 * one place normalising is unambiguously right, because it touches only the
 * outgoing contact and never the stored lead. If normalising produced something
 * too short to be a real number, the raw text is kept instead: better a number
 * the rep can read than one the app invented.
 */
function contactNumber(value: string | undefined): string | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  const normalised = normalizePhone(raw);
  return digitsOf(normalised).length >= 10 ? normalised : raw;
}

/**
 * iOS shows first/last, Android shows the display name, so all three get set.
 * Split on the first space only: "Priya Sharma Iyer" is Priya + Sharma Iyer,
 * which is right more often than the alternative.
 */
export function splitName(name: string): { firstName?: string; lastName?: string } {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (!trimmed) return {};
  const cut = trimmed.indexOf(' ');
  if (cut === -1) return { firstName: trimmed };
  return { firstName: trimmed.slice(0, cut), lastName: trimmed.slice(cut + 1) };
}

/**
 * Every number that should reach the address book, normalised and de-duped.
 *
 * The de-dupe happens AFTER contactNumber() has normalised each one, which is
 * the only point at which 9820441720 and +919820441720 are visibly the same
 * number. Comparing the raw strings would put both in the rep's phone, and a
 * duplicated contact is the kind of mess an address book never recovers from.
 */
function contactNumbers(values: (string | undefined)[]): string[] {
  const out: string[] = [];
  for (const value of values) {
    const number = contactNumber(value);
    if (number && !out.includes(number)) out.push(number);
  }
  return out;
}

/** Trimmed, non-empty, case-insensitively de-duped, original order kept. */
function contactEmails(values: (string | undefined)[]): string[] {
  const out: string[] = [];
  for (const value of values) {
    const address = value?.trim();
    if (address && !out.some((seen) => seen.toLowerCase() === address.toLowerCase())) {
      out.push(address);
    }
  }
  return out;
}

/**
 * One TITLE, even when the card printed two.
 *
 * vCard lets TITLE repeat and most contacts apps keep only the first, so a
 * second title would vanish without trace. Joined, it survives.
 */
function joinedTitle(input: ContactInput): string | undefined {
  const titles = [input.designation, ...(input.extraDesignations ?? [])]
    .map((title) => title?.trim())
    .filter((title): title is string => Boolean(title));
  return titles.length > 0 ? titles.join(' / ') : undefined;
}
/** `Priya Sharma` -> `priya-sharma.vcf`, for the web download. */
export function contactFilename(name: string): string {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${slug || 'contact'}.vcf`;
}

export function toVCardInput(input: ContactInput): VCardInput {
  return {
    name: input.name.trim() || 'Unknown',
    company: input.company?.trim() || undefined,
    designation: joinedTitle(input),
    phone: contactNumber(input.phone),
    secondaryPhone: contactNumber(input.landline),
    // The primary is already on `phone`, so it is dropped from the extras
    // here rather than emitted twice. Same for the addresses below.
    extraPhones: contactNumbers([input.phone, ...(input.extraPhones ?? [])]).slice(1),
    email: input.email?.trim() || undefined,
    extraEmails: contactEmails([input.email, ...(input.extraEmails ?? [])]).slice(1),
    website: input.website?.trim() || undefined,
    address: input.address?.trim() || undefined,
  };
}

/** The lead as a vCard string — used for the web download and by the tests. */
export function leadVCard(input: ContactInput): string {
  return buildVCard(toVCardInput(input));
}

/**
 * The expo-contacts shape. Not derived from VCardInput — the two have different
 * constraints, and routing through one to reach the other loses the labels.
 *
 * Every `label` is required by the type, and a missing one is a silent no-op on
 * Android. Empty arrays are omitted entirely rather than sent as `[{}]`, which
 * makes Android reject the whole contact.
 *
 * The lead's note and voice summary are deliberately NOT included. A rep's
 * address book syncs to iCloud or Google, and "budget 40 lakhs, decides Friday"
 * is not something to push out of the app's control. verify:contacts asserts
 * their absence so this cannot be helpfully re-added later.
 */
export function toExpoContact(input: ContactInput): Record<string, unknown> {
  const name = input.name.trim() || 'Unknown';
  // The extras sit with the mobile they belong to and ahead of the company
  // switchboard, which is the order a person expects to find them in.
  const phones = [
    ...contactNumbers([input.phone, ...(input.extraPhones ?? [])]).map((number) => ({
      label: 'mobile',
      number,
    })),
    { label: 'work', number: contactNumber(input.landline) },
  ].filter((entry) => entry.number);

  const emails = contactEmails([input.email, ...(input.extraEmails ?? [])]).map((email) => ({
    label: 'work',
    email,
  }));
  const urls = [{ label: 'work', url: input.website?.trim() }].filter((entry) => entry.url);
  const addresses = [{ label: 'work', street: input.address?.trim() }].filter((e) => e.street);

  return {
    name,
    ...splitName(name),
    contactType: 'person',
    ...(input.company?.trim() ? { company: input.company.trim() } : {}),
    ...(joinedTitle(input) ? { jobTitle: joinedTitle(input) } : {}),
    ...(phones.length ? { phoneNumbers: phones } : {}),
    ...(emails.length ? { emails } : {}),
    ...(urls.length ? { urlAddresses: urls } : {}),
    ...(addresses.length ? { addresses } : {}),
  };
}
