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
 * The disclosure itself. THREE SHORT LINES, AND IT HAS TO STAY THAT WAY.
 *
 * Google Play asks for two things and only two: what is accessed, and what it is
 * used for. Everything past that is our own words, and our own words are what
 * make this screen dangerous. A permission screen that argues its case reads as a
 * permission screen with something to hide - the rep is standing in a hall
 * wanting to scan a card, and a wall of reassurance in front of a location
 * request is exactly the shape a scam has. Short is not a style preference here,
 * it is what makes the request look ordinary enough to accept.
 *
 * So: what, why, and the one limit that answers the question everybody actually
 * has, which is whether this follows them around. Nothing about how leads save,
 * nothing about what refusing costs - the No thanks button says that by
 * existing, and saying it in words invites the doubt it is trying to settle.
 *
 * Kept here rather than inline in the component so the verify script can hold
 * the wording to the policy: a redesign that dropped what or why would otherwise
 * be invisible until a review rejected the build.
 */
/**
 * Says the word "location", deliberately.
 *
 * "where you capture a lead" is friendlier and was the first draft, but a
 * reviewer skimming this screen is looking for the data type by name, and a
 * disclosure that talks around it is the kind that gets rejected as vague - the
 * same reason the iOS purpose string names the feature instead of waving at it.
 * Being plain about it is also the honest version: softening the noun to make
 * the ask feel smaller is the move that earns the suspicion.
 */
export const LOCATION_NOTICE_TITLE = 'Yieldd notes your location when you capture a lead';

/** Why - the one sentence the policy actually asks for. */
export const LOCATION_NOTICE_WHY =
  'So each lead records the venue and city you met them at.';

/** The only limit worth the line: it answers "is this following me?". */
export const LOCATION_NOTICE_SCOPE =
  'Only while you are capturing — never in the background.';
