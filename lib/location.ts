import { Platform } from 'react-native';

import {
  composeAddress,
  isUsableFix,
  type CaptureFix,
  type CaptureLocation,
} from './captureLocation';

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
 * Whether the rep let us have it. `null` means nobody has looked yet.
 *
 * Asked at most once per app run. A rep who says no is never asked again by
 * this code - the OS takes over refusing on iOS after the first denial, and
 * re-prompting on Android would be nagging somebody for a field they have
 * already declined.
 */
let permitted: boolean | null = null;

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
      // Only actually prompt when the OS still allows one. Otherwise take the
      // answer it has already recorded.
      const answer =
        current.granted || !current.canAskAgain
          ? current
          : await Location.requestForegroundPermissionsAsync();
      permitted = answer.granted;
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
