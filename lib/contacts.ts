import { Platform } from 'react-native';
// Type-only, so it is erased at compile time and never becomes a web import.
import type { Contact } from 'expo-contacts/legacy';

import { contactFilename, leadVCard, toExpoContact, type ContactInput } from './contactCard';

/**
 * Putting a captured lead into the rep's own phone contacts.
 *
 * The shapes live in lib/contactCard.ts, which is pure and testable; this file
 * is the part that touches a device.
 *
 * NOTE ON THE expo-contacts IMPORT: it is loaded lazily, inside the native
 * branch, and must stay that way, because this module is reachable from a web
 * route. The package does ship a web entry point — src/legacy/ExpoContacts.web.ts
 * — but it implements only the two permission calls; presentFormAsync is absent
 * from it, so on web the wrapper throws UnavailabilityError. Hence the
 * Platform check BEFORE the import rather than after it: web takes the vCard
 * path and never reaches the module at all.
 *
 * AND NOTE THE `/legacy` SUBPATH: SDK 56 redesigned expo-contacts around a
 * Contact class. The old top-level functions still exist on the root import but
 * now THROW when called — `presentFormAsync` among them. Because the call below
 * sits in a try/catch, importing from the root would not crash the app; it would
 * quietly fall through to the 'That didn't open your contacts' message forever.
 * The legacy entry point keeps the real implementation.
 */

export type { ContactInput } from './contactCard';

export type SaveContactOutcome =
  | { ok: true; via: 'contacts' | 'vcard' }
  | { ok: false; reason: 'permission' | 'unsupported' | 'error'; message: string };

/**
 * Hands a .vcf to the browser. Shared with the public card page, which held the
 * only copy of this before.
 */
export function downloadVCard(vcard: string, filename: string) {
  const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' });
  const url = globalThis.URL.createObjectURL(blob);
  const link = globalThis.document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  globalThis.URL.revokeObjectURL(url);
}

/**
 * Opens the phone's own contact form, pre-filled.
 *
 * `presentFormAsync`, not `addContactAsync`, for a specific reason: Expo Go on
 * Android does not carry the WRITE_CONTACTS permission, so addContactAsync would
 * need a development build there. Routing the write through the system contacts
 * UI avoids that — and it lets the rep correct a mis-read name before it lands
 * in their address book.
 *
 * The cost is that it resolves on dismissal and cannot tell us whether Save or
 * Cancel was pressed. So `saved_to_contacts` means "the form was opened for this
 * lead", not "a contact exists" — the same honest limit already accepted for
 * message_sends, which records `sent` rather than `delivered` because a deep
 * link cannot report what the rep did next.
 *
 * ⚠️ Swapping in addContactAsync later to tighten that flag WOULD introduce an
 * Android dev-build requirement. That trade should be made deliberately.
 */
export async function saveLeadToContacts(input: ContactInput): Promise<SaveContactOutcome> {
  if (Platform.OS === 'web') {
    try {
      downloadVCard(leadVCard(input), contactFilename(input.name));
      return { ok: true, via: 'vcard' };
    } catch {
      return {
        ok: false,
        reason: 'unsupported',
        message: 'This browser could not download the contact file.',
      };
    }
  }

  try {
    const Contacts = await import('expo-contacts/legacy');

    // No permission request, deliberately.
    //
    // `presentFormAsync` hands the contact to the system's own new-contact
    // screen — an ACTION_INSERT intent on Android, CNContactViewController on
    // iOS. The person saves it themselves, so neither platform requires the
    // app to hold contacts access, and asking for it put READ_CONTACTS in the
    // manifest for nothing.
    //
    // That matters beyond tidiness: Play treats contacts as a sensitive
    // permission and makes you justify it at review, and "we open the system
    // form" is not a justification it accepts. The permission was requested,
    // never used, and would have been an awkward question to answer.
    await Contacts.presentFormAsync(null, toExpoContact(input) as Contact);
    return { ok: true, via: 'contacts' };
  } catch (err) {
    if (__DEV__) console.warn('[contacts]', err);
    return {
      ok: false,
      reason: 'error',
      message: "That didn't open your contacts. Try again, or add the number by hand.",
    };
  }
}
