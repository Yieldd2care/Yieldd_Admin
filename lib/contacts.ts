import { Platform } from 'react-native';
// Type-only, so it is erased at compile time and never becomes a web import.
import type { Contact } from 'expo-contacts/legacy';

import { contactFilename, leadVCard, toExpoContact, type ContactInput } from './contactCard';
import { loadContacts, requestContactsAccess } from './contactsAccess';

/**
 * Putting a captured lead into the rep's own phone contacts.
 *
 * The shapes live in lib/contactCard.ts, which is pure and testable; this file
 * is the part that touches a device.
 *
 * NOTE ON THE expo-contacts IMPORT: it is loaded lazily, through
 * lib/contactsAccess.ts, inside the native branch, and must stay that way,
 * because this module is reachable from a web route. The package does ship a
 * web entry point — src/legacy/ExpoContacts.web.ts — but it implements only the
 * two permission calls; presentFormAsync is absent from it, so on web the
 * wrapper throws UnavailabilityError. Hence the Platform check BEFORE the
 * import rather than after it: web takes the vCard path and never reaches the
 * module at all.
 *
 * lib/contactsAccess.ts also carries the note on the `/legacy` subpath, which
 * is what keeps `presentFormAsync` a real implementation rather than the root
 * import's throwing stub.
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
    const Contacts = await loadContacts();

    /**
     * ANDROID NEEDS READ_CONTACTS HERE. iOS DOES NOT.
     *
     * This comment used to say the opposite — "no permission request,
     * deliberately", on the reasoning that `presentFormAsync` hands the contact
     * to the system's own new-contact screen, so the person saves it themselves
     * and neither platform needs the app to hold contacts access.
     *
     * That is true of iOS and false of Android, and it is why this button did
     * nothing for most of a week (PENDING #41, reported 2026-09-11).
     *
     * The evidence, in the copy of the package this repo installs:
     *
     *   - node_modules/expo-contacts/android/.../ContactsModule.kt:297-298 —
     *     the `presentFormAsync` AsyncFunction calls `ensureReadPermission()`
     *     as its very first statement, before the in-progress guard and before
     *     it looks at the contact at all.
     *   - ContactsModule.kt:722-727 — `ensureReadPermission` only CHECKS. It
     *     never prompts. It throws MissingPermissionException(READ_CONTACTS)
     *     when the app does not already hold the permission.
     *   - node_modules/expo-contacts/ios/ContactsModule.swift:93 — the iOS
     *     `presentFormAsync` has no permission check of any kind, because
     *     CNContactViewController genuinely does not need one.
     *
     * So on Android the throw landed in the catch below, came back as a generic
     * `reason: 'error'`, and the rep read "That didn't open your contacts"
     * while the real reason went nowhere but a __DEV__ console.warn.
     *
     * It worked for anyone who had already used "Pick from my contacts" on the
     * invite screen (PENDING #60), because they were already holding the
     * permission. That is what made it look intermittent.
     *
     * iOS is deliberately left alone. Asking there would be a prompt that buys
     * the person nothing, on a platform that treats contacts as sensitive.
     *
     * ⚠️ THE PUBLISHED PRIVACY POLICY IS PART OF THIS CHANGE. app/(web)/privacy.tsx
     * said saving a lead "needs no permission at all", which stops being true
     * the moment this runs. It was rewritten in the same commit. Item #62 became
     * a release blocker by letting that gap open once already.
     */
    if (Platform.OS === 'android') {
      const access = await requestContactsAccess({
        action: 'open your contacts',
        fallback: 'or add the number by hand',
      });
      if (!access.granted) {
        return { ok: false, reason: 'permission', message: access.message };
      }
    }

    /**
     * `isNew: true` is iOS-only, and Android does not read it.
     *
     * Without it, iOS builds the view controller with `forUnknownContact:`
     * rather than `forNewContact:` (ContactsModule.swift:109-113) — a details
     * card with a "Create New Contact" button on it, so saving a lead costs two
     * taps and the second one is not obvious.
     *
     * Android's Kotlin signature discards the third argument entirely
     * (`_: Map<String, Any?>?`, ContactsModule.kt:296), so this cannot affect
     * the platform the bug was reported on.
     *
     * It is safe against the rest of the iOS path: `setCloseButton` only writes
     * `leftBarButtonItem` (ContactsViewController.swift:7-13), so the Done
     * button `forNewContact` puts on the right survives; the delegate it needs
     * in order to dismiss is set at ContactsModule.swift:125; and the promise is
     * still resolved and nilled from `onViewDisappeared`.
     */
    await Contacts.presentFormAsync(null, toExpoContact(input) as Contact, { isNew: true });
    return { ok: true, via: 'contacts' };
  } catch (err) {
    /**
     * A permission failure that reaches HERE is a different thing from a
     * refusal, and it must not be reported as one.
     *
     * The request above should mean Android never throws
     * MissingPermissionException any more. If it does, the permission is not in
     * the manifest to be granted — which is what a build with READ_CONTACTS
     * back in `blockedPermissions` would look like — and telling the rep to
     * "allow contacts access" would send them to a Settings toggle that is not
     * there. Saying the phone would not open its contact form is at least true.
     *
     * This is spelled out because the generic message underneath it is exactly
     * what hid PENDING #41 for a week: every possible cause read the same.
     */
    const message = String((err as Error)?.message ?? err);
    const missingPermission = /MissingPermission|READ_CONTACTS/i.test(message);

    /**
     * "A form is already open" is NOT a failure to open one, and saying it is
     * sends the rep looking in the wrong place. Two quite different things land
     * here, and the wording is identical on both platforms
     * ("Different contact manipulation in progress…"), so one test catches both.
     *
     *   1. A DOUBLE TAP. `presentFormAsync` throws
     *      ContactManipulationInProgressException when a form is already in
     *      flight (ContactsModule.kt:300-302, ContactsModule.swift:95-97). The
     *      form really is opening; only the second tap failed. This is likely
     *      rather than theoretical — reps spent a week learning that this button
     *      does nothing, so they tap it more than once.
     *
     *   2. A POISONED MODULE. `presentForm` assigns
     *      `contactManipulationPromise` BEFORE `startActivityForResult`
     *      (ContactsModule.kt:356-357). If that call throws — an
     *      ActivityNotFoundException on a ROM carrying no ACTION_INSERT handler,
     *      or a lost activity — the promise is never cleared and every later tap
     *      for the life of the process throws in-progress. Hence "close Yieldd
     *      and open it again", which is genuinely the only way out.
     *
     * Deliberately NOT guarded with an in-flight flag on this side. A flag gets
     * stuck the moment a rep backgrounds the app from the contacts screen, and a
     * stuck flag is a silently dead button — which is the exact bug this whole
     * change exists to end. The native guard has no state that can get stuck.
     */
    const alreadyOpen = /manipulation in progress/i.test(message);

    if (__DEV__) console.warn('[contacts]', err);

    if (alreadyOpen) {
      return {
        ok: false,
        reason: 'error',
        message: "Your contacts screen is already open. If you can't see it, close Yieldd and open it again.",
      };
    }

    return {
      ok: false,
      reason: 'error',
      message: missingPermission
        ? "Your phone wouldn't open its contact form for Yieldd. Add the number by hand for now."
        : "That didn't open your contacts. Try again, or add the number by hand.",
    };
  }
}
