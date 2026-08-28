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

/** `+919876543210` -> `+91 98765 43210`. Falls back to the input untouched. */
export function formatPhone(value: string | null | undefined): string {
  if (!value) return '';
  const match = /^\+(\d{1,3})(\d{10})$/.exec(value.trim());
  if (!match) return value;
  const [, code, rest] = match;
  return `+${code} ${rest.slice(0, 5)} ${rest.slice(5)}`;
}
