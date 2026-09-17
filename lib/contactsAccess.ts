import { Platform } from 'react-native';

/**
 * Loading expo-contacts, and asking for the one permission it needs.
 *
 * Extracted because there are now two features that push against the same
 * native module from opposite directions — lib/contactPicker.ts pulls a
 * colleague IN off the invite screen, lib/contacts.ts pushes a captured lead
 * OUT into the phone book — and they were about to grow a second copy of the
 * same permission request with a slightly different message. One copy, worded
 * per caller.
 *
 * ⚠️ THE `/legacy` SUBPATH IS LOAD-BEARING. SDK 56 redesigned expo-contacts
 * around a Contact class. The old top-level functions still exist on the root
 * import but THROW when called. Both callers sit inside a try/catch, so the
 * root import would not crash anything — it would quietly report a generic
 * failure forever, which is the shape of bug this file exists to end.
 *
 * ⚠️ AND THE IMPORT MUST STAY LAZY. Both callers are reachable from a web
 * route. The package does ship a web entry point, but it implements only the
 * two permission calls, so every caller checks Platform BEFORE reaching this
 * module. A top-level `expo-contacts` import here breaks the yieldd.co build.
 */

/**
 * The module, loaded once and remembered.
 *
 * `await import()` is cheap on the second call — Metro inlines the module and
 * caches it — but the FIRST one still has to evaluate expo-contacts' legacy
 * entry point and wire up its native bridge, and that happens on the tap, while
 * someone is watching a button.
 *
 * Holding the promise rather than the module means two taps in quick succession
 * share one load instead of racing.
 */
let contactsModule: Promise<typeof import('expo-contacts/legacy')> | null = null;

export function loadContacts() {
  contactsModule ??= import('expo-contacts/legacy');
  return contactsModule;
}

/**
 * Starts that load early, from a screen that is probably about to need it.
 *
 * Safe to call repeatedly and safe to ignore: it returns nothing, swallows
 * failure, and every caller still does its own load if this never ran. Calling
 * it is an optimisation, not a precondition.
 */
export function warmContacts(): void {
  if (Platform.OS === 'web') return;
  void loadContacts().catch(() => {
    // A failure here is not worth reporting — the real call will hit the same
    // problem and has somewhere to put the message.
  });
}

/**
 * A refusal is not an error. It is an outcome with a sentence attached.
 */
export type ContactsAccess = { granted: true } | { granted: false; message: string };

/**
 * Asks for contacts access, and turns a refusal into something worth reading.
 *
 * Only READ_CONTACTS is ever requested. expo-contacts adds WRITE_CONTACTS to
 * the request only when it is present in the manifest (ContactsModule.kt:162),
 * and app.json lists it under `blockedPermissions`, so it is not.
 *
 * `canAskAgain` splits the message in two because the two refusals need
 * different things from the person: the first can be undone by tapping again,
 * the second only in Settings. Telling someone to "allow it" when the system
 * will never show the dialog again is how a dead end gets built.
 *
 * NOTE THAT THIS DOES NOT CHECK Platform. iOS needs the permission for the
 * picker and does NOT need it for the contact form, so the decision of whether
 * to ask at all belongs to the caller, which knows which one it is opening.
 */
export async function requestContactsAccess(words: {
  /** What the person is trying to do: "pick someone", "open your contacts". */
  action: string;
  /** What still works if they say no, as a clause: "or type the number in". */
  fallback: string;
}): Promise<ContactsAccess> {
  const Contacts = await loadContacts();
  const permission = await Contacts.requestPermissionsAsync();

  if (permission.granted) return { granted: true };

  return {
    granted: false,
    message: permission.canAskAgain
      ? `Allow contacts access to ${words.action}, ${words.fallback}.`
      : `Contacts access is off for Yieldd. Turn it on in Settings, ${words.fallback}.`,
  };
}
