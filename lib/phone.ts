// Contact-number handling, in one place.
//
// India-first but not India-only: exhibitions here draw overseas buyers, so a
// number that already carries a country code is left alone. What is normalised
// is the bare 10-digit mobile everyone actually types, because a number without
// a country code cannot be turned into a wa.me link — and WhatsApp follow-up is
// the whole point of the product.

const DEFAULT_COUNTRY_CODE = '91';

/** Anything a person plausibly types: digits, spaces, +, -, (), dots. */
const ALLOWED = /^\+?[\d\s().-]+$/;

export function digitsOf(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * A valid number has 10–15 digits (E.164 caps the subscriber part at 15) and
 * no characters outside the set a phone keypad produces.
 */
export function isValidPhone(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || !ALLOWED.test(trimmed)) return false;
  const digits = digitsOf(trimmed);
  return digits.length >= 10 && digits.length <= 15;
}

/** A dial code, not a number: `*123#`, `*99*1#`. No message reaches one. */
const DIAL_CODE = /[*#]/;

/**
 * The length of every reachable Indian number: a mobile, or a landline with its
 * STD code. Not a preference — the invite goes out as a wa.me link, which needs
 * the whole number and nothing else attached to it.
 */
const INDIAN_DIGITS = 10;

/** E.164 allows 15 digits at most, and nothing real is under 8. */
const E164_MAX = 15;
const E164_MIN = 8;

/**
 * The number without its country code, so it can be measured against 10.
 *
 * Exactly the cases normalizePhone already recognises, deliberately: this warns
 * about the number that function is about to produce, so the two must read an
 * input the same way or the warning describes something nobody stored.
 */
function withoutCountryCode(digits: string): string {
  if (digits.length === 12 && digits.startsWith(DEFAULT_COUNTRY_CODE)) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

/**
 * "Does this look like something a message could reach?", in plain words, or
 * null when there is nothing to say.
 *
 * A SECOND, LOOSER CHECK THAN isValidPhone, deliberately. The two exist side by
 * side because they answer different questions and are used in different ways:
 *
 *   isValidPhone       a gate. It refuses the value, so it is strict: its
 *                      character set `/^\+?[\d\s().-]+$/` allows only what a
 *                      keypad produces. Used where the app owns the number and
 *                      can insist on a clean one (your own profile, settings).
 *
 *   describePhoneProblem   a warning, never a gate. The invite sends either
 *                      way, so this only ever produces a sentence to read. It
 *                      counts digits rather than policing characters, which is
 *                      what lets a number be written with dashes, brackets,
 *                      unicode hyphens or a country code and still be measured.
 *
 * The count is what a wa.me link will be built from, which is the thing that
 * decides whether a message arrives. So an extension (`... x 204`) or two
 * numbers in one box (`98204 41720 / 22 2493 1234`) are called too long, and
 * rightly: those extra digits are appended to the link, and the result reaches
 * nobody. Saying so is not the same as refusing it, and nothing here refuses.
 *
 * Do not tighten isValidPhone to cover this, and do not loosen it either — its
 * callers depend on it refusing things.
 */
export function describePhoneProblem(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim();
  // An empty box is not ready to send, but it is not wrong either, and telling
  // someone their empty field is empty helps nobody.
  if (!trimmed) return null;

  if (DIAL_CODE.test(trimmed)) {
    return 'That looks like a dial code, not a number a message can reach.';
  }

  const digits = digitsOf(trimmed);
  if (!digits) return 'There are no digits in that, so no message can reach it.';

  /**
   * An overseas number is measured against E.164 and nothing else.
   *
   * National numbers are 7 digits in one country and 11 in the next, so there
   * is no honest way to tell a visiting buyer their number is the wrong length.
   * Only a number that is explicitly `+something-not-91` gets this treatment;
   * bare digits are read as Indian, exactly as normalizePhone reads them.
   */
  if (trimmed.startsWith('+') && !digits.startsWith(DEFAULT_COUNTRY_CODE)) {
    if (digits.length < E164_MIN) return 'That looks too short for a phone number.';
    if (digits.length > E164_MAX) return 'That looks too long for a phone number.';
    return null;
  }

  const national = withoutCountryCode(digits);
  if (national.length < INDIAN_DIGITS) return 'That looks too short for a phone number.';
  if (national.length > INDIAN_DIGITS) return 'That looks too long for a phone number.';

  return null;
}

/**
 * To E.164-ish `+<country><number>`. Returns '' for empty input so callers can
 * store NULL rather than an empty string.
 */
export function normalizePhone(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';

  const digits = digitsOf(trimmed);
  if (!digits) return '';

  // Already explicit about its country — trust it.
  if (trimmed.startsWith('+')) return `+${digits}`;

  // 10 digits is an Indian mobile. 12 starting 91 is the same number with the
  // country code typed but the plus forgotten. 0-prefixed is the domestic STD
  // form, which drops the leading zero.
  if (digits.length === 10) return `+${DEFAULT_COUNTRY_CODE}${digits}`;
  if (digits.length === 12 && digits.startsWith(DEFAULT_COUNTRY_CODE)) return `+${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) {
    return `+${DEFAULT_COUNTRY_CODE}${digits.slice(1)}`;
  }

  return `+${digits}`;
}

/**
 * The key two numbers are compared on to decide they are the same person.
 *
 * The last 10 digits, and null under 8 — a mirror of the SQL in
 * `find_duplicate_lead` (migration 20260831090000). The database is the
 * authority; this exists so a half-typed number never reaches the network.
 *
 * Deliberately NOT normalizePhone(). That function is lossy — it prepends `+91`
 * to a bare 10-digit number, so a US visitor's `4155550134` would key
 * differently from the same number typed `+1 415-555-0134`. Comparing trailing
 * digits gets both right without deciding what country anyone is from.
 *
 * Returning null under 8 digits is what makes typing safe: `982` matches
 * nothing, so a rep entering a number one digit at a time cannot flash a
 * duplicate warning at a customer mid-conversation.
 */
export function phoneMatchKey(value: string | null | undefined): string | null {
  const digits = digitsOf(value ?? '');
  if (digits.length < 8) return null;
  return digits.slice(-10);
}

/** `+919876543210` -> `+91 98765 43210`. Falls back to the input untouched. */
export function formatPhone(value: string | null | undefined): string {
  if (!value) return '';
  const match = /^\+(\d{1,3})(\d{10})$/.exec(value.trim());
  if (!match) return value;
  const [, code, rest] = match;
  return `+${code} ${rest.slice(0, 5)} ${rest.slice(5)}`;
}
