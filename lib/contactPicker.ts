import { Platform } from 'react-native';

import { loadContacts, requestContactsAccess, warmContacts } from './contactsAccess';
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

/**
 * Loading the module and asking for contacts access both live in
 * lib/contactsAccess.ts now, shared with lib/contacts.ts. That file has the
 * long note on why the `/legacy` subpath and the lazy import are load-bearing.
 */

/**
 * Kept under its old name because the invite screen calls it by that name, and
 * because "warm the contact picker" is what it means there.
 */
export function warmContactPicker(): void {
  warmContacts();
}

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
    /**
     * Timings, in dev only.
     *
     * "Opening contacts is taking too long" was reported on 2026-09-14, and
     * there are three quite different places that time can go: loading the
     * module, the system picker being on screen, and the read that happens
     * after a contact is chosen. Guessing between them is how an afternoon
     * disappears, so each is measured separately and printed.
     *
     * `pick` is the one number that is NOT ours — it includes however long the
     * person spent scrolling their address book, so a large value there is
     * usually a human, not a bug. `load` and `read` are ours.
     */
    const t0 = Date.now();

    // The `/legacy` subpath, not the root. SDK 56 redesigned expo-contacts
    // around a Contact class; the old top-level functions still exist on the
    // root import but THROW when called, `presentContactPickerAsync` among
    // them. Because this call sits in a try/catch, the root import would not
    // crash — it would quietly report the error message below forever.
    const Contacts = await loadContacts();
    const tLoaded = Date.now();

    /**
     * THE PERMISSION REQUEST. This comment used to say "do not add the call".
     * It was wrong, and the reason it was wrong is worth keeping.
     *
     * The old reasoning: `presentContactPickerAsync` hands the choice to the
     * system's own picker — ACTION_PICK on Android, CNContactPickerViewController
     * on iOS — the person picks one contact, only that contact comes back, and
     * the app never reads the address book. All true of the *picker*.
     *
     * What it missed is what expo-contacts does once a contact is chosen. On
     * Android it takes the returned id and calls `getContactById`, which queries
     * the whole ContactsContract.Data table rather than the single URI that the
     * pick granted — and THAT needs READ_CONTACTS. So the picker opened, the
     * person chose someone, and the read afterwards threw. Reported by the user
     * on 2026-09-14, which is the only reason anybody found out: nothing in a
     * build or a test exercises the far side of a system picker.
     *
     * The permission is now requested, by the user's decision on 2026-09-14
     * after the cost was put to them. READ_CONTACTS is out of app.json's
     * `blockedPermissions`, iOS carries an NSContactsUsageDescription, and two
     * things followed that were NOT optional:
     *
     *   1. The published privacy policy had to be rewritten, because it said
     *      the app asks for no contacts permission. Done 2026-09-15 (PENDING
     *      #62), and rewritten again on 2026-09-17 when saving a lead turned
     *      out to need the same permission — see the Contacts bullet in
     *      app/(web)/privacy.tsx, which is now the only description of both.
     *   2. Play treats contacts as a sensitive permission and will ask for a
     *      justification at review. The Data Safety form is still unfilled.
     *
     * Refusal is handled as a first-class outcome rather than an error: someone
     * who says no has not hit a fault, they have made a choice, and the typed
     * fields behind this button still work perfectly.
     *
     * The request itself moved to lib/contactsAccess.ts on 2026-09-17, when
     * saving a lead turned out to need the same permission for a different
     * reason. The wording is unchanged; only its home is.
     */
    const access = await requestContactsAccess({
      action: 'pick someone',
      fallback: 'or type the number in',
    });
    if (!access.granted) {
      return { ok: false, reason: 'unsupported', message: access.message };
    }

    const timedOut = Symbol('timedOut');
    const picked = await Promise.race([
      Contacts.presentContactPickerAsync(),
      new Promise<typeof timedOut>((resolve) => setTimeout(() => resolve(timedOut), PICKER_TIMEOUT_MS)),
    ]);

    const tPicked = Date.now();

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

    const result = readPickedContact(picked);

    if (__DEV__) {
      console.log(
        `[contactPicker] load ${tLoaded - t0}ms | picker ${tPicked - tLoaded}ms ` +
          `| read ${Date.now() - tPicked}ms | numbers ${result.numbers.length}`
      );
    }

    return { ok: true, ...result };
  } catch (err) {
    /**
     * Two different failures land here and they are NOT the same to the person.
     *
     * Reported 2026-09-14: the picker opened, a contact was chosen, and this
     * still said "that didn't open your contacts" — which is plainly untrue and
     * sends them looking in the wrong place. The picker opening and the read
     * afterwards are separate steps, and only the second one failed.
     *
     * expo-contacts resolves ACTION_PICK by taking the chosen id and calling
     * getContactById, which queries the whole ContactsContract.Data table
     * rather than the single URI the pick granted. That query is what needs
     * READ_CONTACTS.
     *
     * ⚠️ This comment used to end "which this app deliberately does not hold —
     * see the note on permissions above, which is still correct about not
     * adding it". Both halves were false from 2026-09-14 onward: the app does
     * hold it, and the note above says so. A stale comment that contradicts the
     * code fifty lines above it is exactly what let PENDING #41 survive review
     * for a week, so it is corrected here rather than left to be read again.
     *
     * The branch below still earns its place. The permission can be revoked
     * from Settings between the request and the read, and a refused query
     * genuinely is a different event from a picker that would not open.
     */
    const message = String((err as Error)?.message ?? err);
    const afterPick = /permission|denied|SecurityException|getContactById|READ_CONTACTS/i.test(message);

    if (__DEV__) console.warn('[contactPicker]', afterPick ? 'failed AFTER the pick:' : 'failed:', err);

    return {
      ok: false,
      reason: 'error',
      message: afterPick
        ? "Your phone wouldn't share that contact's details. Type the number in instead."
        : "That didn't open your contacts. Type the number in instead.",
    };
  }
}
