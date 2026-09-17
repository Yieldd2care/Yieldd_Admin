/**
 * Whether the app may ask for location, and what it has to explain first.
 *
 * Google Play's User Data policy requires a "prominent disclosure" for location:
 * an in-app explanation of what is collected and why, shown BEFORE the runtime
 * permission dialog, whenever the use is not obvious from the context. Standing
 * in a camera screen is not obvious, so this is the screen that has to come
 * first. iOS is already covered by the purpose string in app.json; Android had
 * nothing at all, and a reviewer can reject for that.
 *
 * Pure on purpose, and for the same reason `lib/captureLocation.ts` is: nothing
 * here imports React, React Native or expo-location, so
 * `npm run verify:capture-location` can compile this file on its own and assert
 * the rule below directly. The rule is a store policy, not a preference - it is
 * worth more as five lines something can check than as five lines of prose
 * inside an async function nothing can reach.
 *
 * MUST STAY IN lib/. The verify script compiles a file list with --outDir and
 * no --rootDir, so tsc infers the common root from its inputs. Every input is
 * in lib/, which is what makes the emitted files land flat next to each other.
 * A file outside lib/ would move that inferred root to the repo and change
 * every emitted path, breaking the imports of the modules already listed.
 *
 * The half that touches a device is `lib/location.ts`.
 */

/** Where the rep's answer is kept. Device-local; see the note in lib/location.ts. */
export const LOCATION_CHOICE_KEY = 'yieldd-location-notice';

/** What the rep said to our own disclosure. Absent means they have not been asked. */
export type LocationChoice = 'allowed' | 'declined';

/**
 * What the app is allowed to do next.
 *
 * `request` and `disclose` are deliberately separate. Both mean "there is no
 * permission yet"; only one of them is allowed to reach the OS.
 */
export type LocationAccess =
  /** Permission is already granted. Read it - no prompt, no disclosure. */
  | 'use'
  /** The disclosure was accepted, so the OS prompt may now be shown. */
  | 'request'
  /** Nobody has been asked yet. Show our explanation, and nothing else. */
  | 'disclose'
  /** Do not read, do not prompt, do not explain. */
  | 'refuse';

/**
 * Read an answer back out of storage.
 *
 * Anything unrecognised - junk, a half-written value, a key some future version
 * writes differently - reads as "never answered" rather than as a refusal. The
 * failure mode of guessing wrong in that direction is that the rep sees the
 * disclosure once more, which is recoverable. Guessing "declined" would silently
 * turn a storage glitch into a permanent opt-out nobody could undo.
 */
export function parseLocationChoice(raw: string | null | undefined): LocationChoice | null {
  return raw === 'allowed' || raw === 'declined' ? raw : null;
}

export type LocationAccessInput = {
  /** What the rep answered, or null if they have never been asked. */
  choice: LocationChoice | null;
  /** Whether the OS says the permission is granted right now. */
  granted: boolean;
  /** Whether the OS would still show a prompt if one were requested. */
  canAskAgain: boolean;
};

/**
 * The whole permission rule, in the order the clauses have to be read.
 *
 * ORDER IS THE POINT. `granted` is tested before `declined` on purpose, and
 * that is a decision rather than an oversight: a rep who declined our notice and
 * then went into their phone's own settings and switched location on has asked
 * for this feature more deliberately than any in-app tap could. Honouring that
 * is what keeps a mis-tap on the disclosure from being a dead end for the life
 * of the install, without adding a second thing that nags them.
 *
 * `canAskAgain` is tested next, before the answer, because when the OS has
 * stopped offering a prompt there is nothing any answer can do about it. Showing
 * a disclosure whose Continue button leads nowhere is worse than showing
 * nothing: it reads as a broken app. Same reasoning as the `canAskAgain` branch
 * on the camera screen.
 *
 * Then, and only then, the rep's own answer:
 *
 * - `declined` refuses, and never prompts again. Nagging somebody for a field
 *   they have already turned down is worse than the missing field.
 * - `allowed` is the ONLY path to the OS prompt, which is precisely what the
 *   store policy asks for.
 * - never answered means explain first, and do not touch the OS.
 */
export function decideLocationAccess({
  choice,
  granted,
  canAskAgain,
}: LocationAccessInput): LocationAccess {
  if (granted) return 'use';
  if (!canAskAgain) return 'refuse';
  if (choice === 'declined') return 'refuse';
  return choice === 'allowed' ? 'request' : 'disclose';
}

/**
 * The disclosure itself.
 *
 * Kept here beside the rule, rather than inline in the component, so the verify
 * script can assert that the app still ships an explanation - the sentence that
 * says what is taken and the sentence that says why are the two the policy is
 * actually about, and a redesign that quietly dropped one would otherwise be
 * invisible until a review rejected the build.
 *
 * Plain language on purpose. This is read once, in a hall, by somebody who wants
 * to get on with scanning a card.
 */
export const LOCATION_NOTICE_TITLE = 'Yieldd notes where you are when you capture a lead.';

/** Why - the sentence the policy asks for. */
export const LOCATION_NOTICE_WHY =
  'So each lead records which venue and city you met them at.';

/** The limits, stated before they are asked rather than after. */
export const LOCATION_NOTICE_SCOPE =
  'Your position is read only while you are capturing a lead - never in the background, and never between captures.';

/**
 * That refusing costs them nothing.
 *
 * Load-bearing, not reassurance: a capture never waits for a fix and a lead with
 * no location is a normal lead, so this sentence is a true description of the
 * app rather than a promise it has to keep separately.
 */
export const LOCATION_NOTICE_OPTIONAL =
  'You can say no and keep using Yieldd exactly as before. Leads save just the same, with no location on them.';
