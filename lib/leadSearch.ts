import { digitsOf } from './phone';

/**
 * What the lead list's search box matches on.
 *
 * Pulled out of the screen because matching a phone number is not a substring
 * check and looks like one. Numbers are stored normalised — `+919820441720` —
 * while a rep types what is printed on the card: `98204 41720`, or
 * `+91 98204-41720`, or the domestic `098204 41720`. Comparing those as text
 * finds nothing, which reads as "search is broken" rather than "search is
 * literal". So both sides are reduced to digits first.
 *
 * Name, company and email stay plain case-insensitive substring matches. A rep
 * half-remembers "north" or "menon" and wants both to land.
 */

export type SearchableLead = {
  name: string;
  company: string;
  phone?: string;
  companyLandline?: string;
  email?: string;
};

/**
 * Below this, a number fragment matches so much that it is noise rather than a
 * search — a single `9` would return every Indian mobile on the list. It also
 * keeps incidental digits in a text query ("Plot 47") from dragging in numbers.
 */
const MIN_NUMBER_DIGITS = 3;

/**
 * The domestic STD form carries a leading 0 that the stored E.164 number does
 * not, so `098204...` would miss a number saved as `+9198204...`.
 */
function stripLeadingZero(digits: string): string {
  return digits.startsWith('0') ? digits.replace(/^0+/, '') : digits;
}

export function leadMatchesQuery(lead: SearchableLead, rawQuery: string): boolean {
  const query = rawQuery.trim();
  if (!query) return true;

  const needle = query.toLowerCase();
  if (lead.name.toLowerCase().includes(needle)) return true;
  if (lead.company.toLowerCase().includes(needle)) return true;
  if (lead.email && lead.email.toLowerCase().includes(needle)) return true;

  // Anything that looks like part of a number is compared digit to digit, so the
  // formatting on the card never has to match the formatting in the database.
  const queryDigits = stripLeadingZero(digitsOf(query));
  if (queryDigits.length >= MIN_NUMBER_DIGITS) {
    for (const number of [lead.phone, lead.companyLandline]) {
      if (number && digitsOf(number).includes(queryDigits)) return true;
    }
  }

  return false;
}
