import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  composeAddress,
  isUsableFix,
  type CaptureFix,
  type CaptureLocation,
} from './captureLocation';
import {
  decideLocationAccess,
  parseLocationChoice,
  LOCATION_CHOICE_KEY,
  type LocationChoice,
} from './captureConsent';

/**
 * Taking the device's position at capture, without ever making a capture wait
 * for it.
 *
 * THE RULE THIS FILE EXISTS TO ENFORCE: a GPS fix takes seconds and fails
 * indoors, and an exhibition hall is indoors. So the capture path only ever
 * reads a fix that is ALREADY in hand - `currentCaptureFix()` is synchronous
 * and cannot be awaited by mistake - and anything slower happens afterwards and
 * is attached to the lead when it arrives. Same contract the card reader and
 * the transcription already work under.
 *
 * NOTE ON THE expo-location IMPORT: it is loaded lazily, inside a native
 * branch, and must stay that way, because this module is reached from the leads
 * store and the leads store is reached from the web dashboard. The package does
 * ship a web entry point, but `reverseGeocodeAsync` there is a stub that throws
 * `GeocoderError` unconditionally, and `getCurrentPositionAsync` would put a
 * browser permission prompt in front of somebody looking at a dashboard. Web
 * takes neither path: every function here returns nothing on web.
 *
 * NOTE ON ASKING: the OS permission prompt is never the first thing the rep
 * sees. Google Play requires a prominent disclosure - our own explanation of
 * what is taken and why - before the system dialog, and `readPosition` below
 * will not reach `requestForegroundPermissionsAsync` until that has been
 * accepted. The rule lives in `lib/captureConsent.ts`, the screen that shows it
 * in `components/capture/CaptureLocationNotice.tsx`. The answer is kept on the
 * device rather than on the profile, because the permission it is about is a
 * property of the handset: the same rep on a new phone is asked again, which is
 * right, and a second rep on this phone is not, because the OS permission they
 * would be answering for is already settled device-wide.
 *
 * NOTE ON THE AsyncStorage IMPORT: top-level, unlike expo-location below, and
 * that is fine - the package ships a localStorage-backed web build and is
 * already in the web bundle through lib/supabase.ts. Reading it never happens
 * on web regardless, because every entry point here returns early there.
 *
 * NOTE ON THE GEOCODER: `reverseGeocodeAsync` resolves on the device using the
 * platform's own geocoder - Android's is Google underneath already, iOS uses
 * Apple's. No Google Cloud account, no API key, no billing, no quota. The Expo
 * docs do warn that "geocoding is resource consuming and has to be used
 * reasonably", which is why the answer is cached per place below and stored on
 * the lead, never re-resolved when a screen renders.
 */

/** How stale a fix may be and still be called "here". */
const FIX_MAX_AGE_MS = 5 * 60_000;

/**
 * How long to wait for a fresh fix before giving up on it.
 *
 * `getCurrentPositionAsync` takes no timeout of its own and will sit there
 * indefinitely inside a hall with no sky. Nothing is blocked while it does -
 * this whole file runs off the capture path - but a promise that never settles
 * would wedge the in-flight guard below, so the wait is bounded.
 */
const FIX_TIMEOUT_MS = 20_000;

type TimedFix = CaptureFix & { at: number };

/** The last fix worth keeping. Module state, because it outlives every screen. */
let lastFix: TimedFix | undefined;

/** The read in progress, shared so two captures never start two of them. */
let inFlight: Promise<CaptureFix | undefined> | null = null;

/**
 * Whether the OS let us have it, for this run. `null` means nobody has looked.
 *
 * Only ever written once the answer is real - see the switch in `readPosition`,
 * which returns without touching this when the rep has not answered the
 * disclosure yet. Caching a `false` while the answer is merely pending would
 * silently kill location for the rest of the run at the exact moment the rep
 * tapped Continue, which is the one bug this whole file is shaped to avoid.
 */
let permitted: boolean | null = null;

/**
 * The rep's answer to our own disclosure, read once and kept as a promise.
 *
 * A PROMISE RATHER THAN A VALUE, deliberately. `readPosition` is already async
 * and already off the capture path, so it can await this; and because the read
 * always settles, it can never wedge the in-flight guard the way awaiting a
 * human's answer would. This is the distinction the timeout note above is
 * about: await the storage read, never await the person.
 *
 * Holding it here rather than in the component that shows the disclosure means
 * location does not depend on any screen having mounted. The leads store calls
 * `settledCaptureLocation()` after a lead is saved, and that has to work on a
 * cold start whether or not a capture screen ever rendered.
 */
let storedChoice: Promise<LocationChoice | null> | null = null;

function choice(): Promise<LocationChoice | null> {
  storedChoice ??= AsyncStorage.getItem(LOCATION_CHOICE_KEY)
    .then(parseLocationChoice)
    // Storage unavailable reads as "not asked yet", not as a refusal. The rep
    // sees the disclosure once more, which is recoverable; the other direction
    // would be a permanent opt-out caused by a glitch.
    .catch(() => null);
  return storedChoice;
}

/**
 * Whether the disclosure still has to be shown, for whoever is asking.
 *
 * TRUE AT MOST ONCE PER APP RUN, which is what the `offered` flag is for.
 * `router.replace` keeps the outgoing screen mounted for the length of the
 * transition, so camera and manual are both alive for a few hundred
 * milliseconds on the way between them - without this, both would put a dialog
 * up and the rep would answer one into the back of the other.
 *
 * The flag is set when the disclosure is handed out, not when it is answered,
 * so backing out of it also settles the question for the run.
 *
 * Here rather than in the component so that every expo-location call in the app
 * stays behind this file's platform guard and its lazy import.
 */
let offered = false;

export async function captureLocationDisclosure(): Promise<boolean> {
  if (Platform.OS === 'web' || offered) return false;
  try {
    const Location = await import('expo-location');
    const current = await Location.getForegroundPermissionsAsync();
    const access = decideLocationAccess({
      choice: await choice(),
      granted: current.granted,
      canAskAgain: current.canAskAgain,
    });
    if (access !== 'disclose') return false;
  } catch {
    // No location provider, services off, the module failing to load at all:
    // there is nothing to disclose if there is nothing that could be read.
    return false;
  }
  offered = true;
  return true;
}

/**
 * Record what the rep answered, and let them get on with it.
 *
 * SYNCHRONOUS WHERE IT MATTERS. The in-memory answer is replaced with an
 * already-resolved promise before this returns, so the `primeCaptureLocation()`
 * fired immediately afterwards sees the new answer. Were the memo only updated
 * once the write came back, that prime would read the stale `null`, decide the
 * rep still had to be shown a disclosure they had just accepted, and never
 * reach the OS prompt at all - a disclosure that looked like it worked and
 * quietly did nothing.
 *
 * `permitted` is cleared for the same reason: the run may already have looked
 * at the OS and found nothing while the answer was pending.
 *
 * The write itself is optimistic and unawaited, the way dismissing the tutorial
 * is in lib/auth/tutorial.ts. A failed write costs one more sighting of the
 * disclosure on the next cold start, which is not worth a message on screen.
 */
export function setCaptureLocationChoice(answer: LocationChoice): void {
  if (Platform.OS === 'web') return;
  storedChoice = Promise.resolve(answer);
  permitted = null;
  offered = true;
  AsyncStorage.setItem(LOCATION_CHOICE_KEY, answer).catch((err) => {
    if (__DEV__) console.warn('[location] could not record the disclosure answer', err);
  });
}

/**
 * Addresses already resolved, keyed by place rather than by fix.
 *
 * Four decimal places is about 11 metres, so every lead captured at the same
 * stall shares one geocode instead of paying for its own. This is the "used
 * reasonably" the Expo docs ask for, and it is also what stops a rep working
 * one hall all day from hammering a rate-limited on-device service.
 */
const addresses = new Map<string, string | undefined>();
const ADDRESS_CACHE_LIMIT = 200;

function placeKey(fix: CaptureFix): string {
  return `${fix.latitude.toFixed(4)},${fix.longitude.toFixed(4)}`;
}

function remember(position: { coords: { latitude: number; longitude: number; accuracy: number | null } }) {
  const { latitude, longitude, accuracy } = position.coords;
  if (!isUsableFix(latitude, longitude)) return;
  lastFix = {
    latitude,
    longitude,
    accuracyMetres: typeof accuracy === 'number' && accuracy >= 0 ? accuracy : undefined,
    at: Date.now(),
  };
}

function fresh(): CaptureFix | undefined {
  if (!lastFix || Date.now() - lastFix.at > FIX_MAX_AGE_MS) return undefined;
  const { latitude, longitude, accuracyMetres } = lastFix;
  return { latitude, longitude, accuracyMetres };
}

async function readPosition(): Promise<CaptureFix | undefined> {
  try {
    const Location = await import('expo-location');

    if (permitted === null) {
      const current = await Location.getForegroundPermissionsAsync();
      /**
       * The OS prompt is reachable from exactly one branch of this switch, and
       * that branch requires the rep to have accepted the disclosure first.
       * That is the store policy, expressed as control flow - see
       * `decideLocationAccess` in lib/captureConsent.ts for the rule and the
       * order its clauses have to be read in.
       */
      switch (
        decideLocationAccess({
          choice: await choice(),
          granted: current.granted,
          canAskAgain: current.canAskAgain,
        })
      ) {
        case 'use':
          permitted = true;
          break;
        case 'request':
          permitted = (await Location.requestForegroundPermissionsAsync()).granted;
          break;
        default:
          /**
           * `disclose` or `refuse`, and NOTHING IS CACHED on the way out.
           *
           * `disclose` means the rep has not answered yet and may be about to;
           * writing `permitted = false` here would outlive that answer and take
           * location down for the rest of the run. `refuse` is not cached
           * either, and costs nothing to re-derive - the dynamic import is
           * module-cached after the first call and reading the permission is
           * cheap - while buying the thing the cache would break: a rep who
           * turns location on in their phone's own settings is picked up on the
           * very next capture, rather than whenever the app next restarts.
           */
          return undefined;
      }
    }
    if (!permitted) return undefined;

    /**
     * Whatever the OS is already holding, first.
     *
     * It is instant and free, and indoors it is very often the only thing that
     * will ever arrive - the hall has no sky, but the phone walked in through a
     * car park ten minutes ago and the fused provider still remembers.
     */
    const last = await Location.getLastKnownPositionAsync({ maxAge: FIX_MAX_AGE_MS });
    if (last) remember(last);

    /**
     * `Balanced`, not `High`. A hundred metres is more than enough to answer
     * "which city, which venue", which is what this feature is for, and asking
     * for ten metres indoors means a long wait for a fix that will not be any
     * better - paid for out of a battery that has to last a whole show.
     */
    const current = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      FIX_TIMEOUT_MS
    );
    if (current) remember(current);
  } catch {
    // Location services off, permission revoked mid-session, no provider at
    // all. None of these is an error the rep needs to hear about: a lead with
    // no coordinates is a normal lead.
  }
  return fresh();
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | undefined> {
  return Promise.race([
    promise,
    new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), ms)),
  ]);
}

function obtainFix(): Promise<CaptureFix | undefined> {
  const held = fresh();
  if (held) return Promise.resolve(held);
  if (inFlight) return inFlight;
  inFlight = readPosition().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/**
 * Start looking, and return immediately.
 *
 * Called when a capture screen opens, which is seconds to minutes before the
 * lead is saved - the rep still has to photograph the card, or type the form.
 * By the time `addLead` runs the fix is usually already sitting in `lastFix`
 * and rides the insert for free.
 *
 * Deliberately returns void rather than a promise: there is nothing here for a
 * screen to await, and offering one would invite exactly the mistake this file
 * is built to prevent. It also sets no state and subscribes to nothing, so a
 * screen full of text inputs can call it without re-rendering once - see the
 * high-frequency-subscription rule in AGENTS.md, which names a location watch.
 * This is not a watch. It is one read.
 */
export function primeCaptureLocation(): void {
  if (Platform.OS === 'web') return;
  void obtainFix();
}

/**
 * The fix already in hand, or nothing. Synchronous, and that is the point:
 * this is what the capture path calls, and it cannot be made to wait.
 */
export function currentCaptureFix(): CaptureFix | undefined {
  if (Platform.OS === 'web') return undefined;
  return fresh();
}

/**
 * The fix and its address, however long that takes. Never called from a screen
 * that is mid-capture - the leads store calls it after the lead is already
 * saved locally, and patches the answer in when it arrives.
 */
export async function settledCaptureLocation(): Promise<CaptureLocation | undefined> {
  if (Platform.OS === 'web') return undefined;
  const fix = await obtainFix();
  if (!fix) return undefined;
  return { ...fix, address: await resolveAddress(fix) };
}

async function resolveAddress(fix: CaptureFix): Promise<string | undefined> {
  const key = placeKey(fix);
  if (addresses.has(key)) return addresses.get(key);

  let address: string | undefined;
  try {
    const Location = await import('expo-location');
    const [first] = await Location.reverseGeocodeAsync({
      latitude: fix.latitude,
      longitude: fix.longitude,
    });
    if (first) address = composeAddress(first);
  } catch {
    // The geocode failing on its own is an ordinary outcome: no network, a rate
    // limit, a point in the sea. The coordinates still stand, and the lead
    // shows them instead.
  }

  // Cached even when it failed, so a dead spot is not retried once per lead for
  // the rest of the show. A new app run tries again.
  if (addresses.size >= ADDRESS_CACHE_LIMIT) addresses.clear();
  addresses.set(key, address);
  return address;
}
