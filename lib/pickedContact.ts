import { phoneMatchKey } from './phone';

/**
 * Reading a contact the person chose out of their own phone book.
 *
 * The mirror of lib/contactCard.ts, which builds the shape going the other way.
 * Pure and free of react-native and expo-contacts on purpose, so
 * scripts/verify-contacts.mjs can compile it standalone and exercise it — the
 * impure half lives in lib/contactPicker.ts.
 */

export type PickedNumber = { label: string; number: string };
export type PickedContact = { name: string; numbers: PickedNumber[] };

/**
 * `unknown`, not `ExistingContact`, and that is deliberate.
 *
 * What actually crosses the bridge is a Bundle assembled by `Contact.toMap()`
 * on Android and a `[String: Any]` on iOS. The TypeScript type is a promise
 * about that shape rather than a guarantee of it, and every field on it is
 * optional. Taking `unknown` forces this function to check rather than trust,
 * which is the right posture for data that came out of somebody's address book
 * — a place that contains far stranger entries than any typed form produces.
 */
export function readPickedContact(raw: unknown): PickedContact {
  const contact = (raw ?? {}) as Record<string, unknown>;

  const str = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

  /**
   * Android fills `name` from DISPLAY_NAME and iOS composes it, so it is
   * normally there. The fallback catches a contact filed under its parts only,
   * which a Google-synced book does produce — and a nameless row would leave
   * the admin staring at a number with nobody attached to it.
   */
  const name =
    str(contact.name) ||
    [contact.firstName, contact.middleName, contact.lastName].map(str).filter(Boolean).join(' ');

  const seen = new Set<string>();
  const numbers: PickedNumber[] = [];

  for (const entry of Array.isArray(contact.phoneNumbers) ? contact.phoneNumbers : []) {
    const row = (entry ?? {}) as Record<string, unknown>;
    const number = str(row.number);
    // Android really does hand back `[{}]` and label-only rows. Keeping one
    // would put an empty phone field in front of the admin as though a number
    // had been found.
    if (!number) continue;

    /**
     * Address books routinely hold the same number twice — once under "mobile"
     * and again under "WhatsApp" or "main". Offering the admin a choice between
     * two identical numbers is a worse question than not asking at all, because
     * it implies the two differ.
     *
     * `phoneMatchKey` is the project's own "same person" rule (lib/phone.ts),
     * so `+91 98765 43210` and `098765 43210` collapse to one entry. Reused
     * rather than reinvented, and deliberately not `normalizePhone`, which is
     * lossy about country codes.
     */
    const key = phoneMatchKey(number) ?? number;
    if (seen.has(key)) continue;
    seen.add(key);

    // Labels are localised by the OS — "mobile", "Handy", "मोबाइल". Show them,
    // never branch on them.
    numbers.push({ label: str(row.label) || 'phone', number });
  }

  return { name, numbers };
}
