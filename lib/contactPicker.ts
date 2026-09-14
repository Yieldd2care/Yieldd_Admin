import { Platform } from 'react-native';

import { readPickedContact, type PickedNumber } from './pickedContact';

/**
 * Taking a rep out of the admin's own phone contacts, on the invite screen.
 *
 * The mirror image of lib/contacts.ts: that file pushes a captured lead OUT to
 * the address book, this one pulls a colleague IN. The same three rules apply
 * for the same reasons — lazy `/legacy` import, native only, a discriminated
 * outcome instead of a thrown error — plus one that is new and load-bearing.
 *
 * ⚠️ A FAILURE ON THIS PATH DOES NOT REJECT. IT HANGS.
 *
 * On Android the picker resolves its promise from inside `OnActivityResult`
 * (expo-contacts ContactsModule.kt:315-337), and nothing between the Activity
 * and that lambda carries a try/catch — AppContext.post, ModuleRegistry.post,
 * ModuleHolder.post and EventListener.call are all bare. The handler takes the
 * picked contact's id and calls `getContactById`, which queries the whole
 * ContactsContract.Data table rather than the single URI that ACTION_PICK
 * granted. If that query is ever refused, the throw escapes before BOTH
 * `pendingPromise.resolve(...)` and `contactPickingPromise = null`. So the
 * awaited promise never settles — there is no rejection to catch — and every
 * later attempt for the life of the process rejects with
 * ContactPickingInProgressException instead.
 *
 * iOS has a quieter version of the same hole: the picker delegate swallows a
 * serialisation throw with a bare `catch {}` and never resolves either.
 *
 * That is why the await below is RACED AGAINST A CLOCK in production and not
 * only in testing. Without it, a device on the wrong side of that question
 * shows "Opening contacts…" forever with no way back — which is exactly the
 * silent-button failure this project already has one of.
 */

export type { PickedNumber } from './pickedContact';

export type PickContactOutcome =
  | { ok: true; name: string; numbers: PickedNumber[] }
  /**
   * No `message`, deliberately. Backing out of the picker is not a failure and
   * there is nothing to tell the admin about it; leaving the field off the type
   * is what stops someone rendering an error for it later.
   */
  | { ok: false; reason: 'cancelled' }
  | { ok: false; reason: 'unsupported' | 'error'; message: string };

/**
 * Long enough that a slow contacts app on an old handset is not cut off
 * mid-thought, short enough that a stuck picker does not read as a frozen app.
 */
const PICKER_TIMEOUT_MS = 45_000;

export async function pickContact(): Promise<PickContactOutcome> {
  /**
   * Before the dynamic import, not after.
   *
   * `expo-contacts/legacy` DOES resolve on web — src/legacy/ExpoContacts.web.ts
   * exists — but that stub implements only getPermissionsAsync and
   * requestPermissionsAsync. `presentContactPickerAsync` is missing from it, so
   * the wrapper throws UnavailabilityError and the catch below would report a
   * generic error where a plain sentence belongs.
   *
   * The import still has to stay lazy regardless: lib/webRoutes.ts sends the
   * whole `/events/new` subtree to the dashboard on web, but that is a RUNTIME
   * redirect — Metro bundles this route either way and evaluates its top-level
   * imports.
   */
  if (Platform.OS === 'web') {
    return {
      ok: false,
      reason: 'unsupported',
      message: 'Choosing from contacts needs the phone app.',
    };
  }

  try {
    // The `/legacy` subpath, not the root. SDK 56 redesigned expo-contacts
    // around a Contact class; the old top-level functions still exist on the
    // root import but THROW when called, `presentContactPickerAsync` among
    // them. Because this call sits in a try/catch, the root import would not
    // crash — it would quietly report the error message below forever.
    const Contacts = await import('expo-contacts/legacy');

    /**
     * No permission request, deliberately — the same decision, for the same
     * reason, as `saveLeadToContacts` in lib/contacts.ts and `pickFromLibrary`
     * in app/(app)/capture/camera.tsx.
     *
     * `presentContactPickerAsync` hands the choice to the system's own picker:
     * an ACTION_PICK intent on Android, CNContactPickerViewController on iOS.
     * The person picks one contact and only that contact comes back — the app
     * never reads the address book, so neither platform needs contacts access.
     *
     * Calling requestPermissionsAsync is what would CREATE a full-library
     * prompt, and it would put READ_CONTACTS into the manifest that app.json's
     * `blockedPermissions` exists to keep it out of. Play treats contacts as a
     * sensitive permission and makes you justify it at review; the privacy
     * policy says in writing that Yieldd never reads the contact list. Do not
     * add the call.
     */
    const timedOut = Symbol('timedOut');
    const picked = await Promise.race([
      Contacts.presentContactPickerAsync(),
      new Promise<typeof timedOut>((resolve) => setTimeout(() => resolve(timedOut), PICKER_TIMEOUT_MS)),
    ]);

    if (picked === timedOut) {
      if (__DEV__) console.warn('[contactPicker] the picker never settled — see the note above');
      return {
        ok: false,
        reason: 'error',
        message: "Contacts didn't come back. Type the number in instead.",
      };
    }

    // `null` is a cancel on both platforms.
    if (!picked) return { ok: false, reason: 'cancelled' };

    return { ok: true, ...readPickedContact(picked) };
  } catch (err) {
    // Reached by a real rejection, and also by the second attempt after a hang
    // — ContactPickingInProgressException. Same message either way: the admin's
    // way out is the same, and naming the internal state would not help them.
    if (__DEV__) console.warn('[contactPicker]', err);
    return {
      ok: false,
      reason: 'error',
      message: "That didn't open your contacts. Type the number in instead.",
    };
  }
}
