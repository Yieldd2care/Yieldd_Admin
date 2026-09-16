/**
 * Where a lead was captured: the shapes, and the two strings a screen shows.
 *
 * Pure on purpose. Nothing here imports `expo-location` or React Native, which
 * is the same split `lib/contactCard.ts` has from `lib/contacts.ts`: it lets
 * `npm run verify:capture-location` compile and assert this file on its own,
 * and it means the web bundle can reach it for free. The half that touches a
 * device is `lib/location.ts`.
 *
 * Everything here is optional at every level, because a lead with no location
 * is a normal lead. A GPS fix takes seconds and fails indoors, an exhibition
 * hall is indoors, and a capture is never allowed to wait for one.
 */

export type CaptureFix = {
  latitude: number;
  longitude: number;
  /** Metres of uncertainty, as the OS reported it. Absent is normal. */
  accuracyMetres?: number;
};

export type CaptureLocation = CaptureFix & {
  /**
   * The postal address for the fix, resolved ONCE at capture and stored.
   *
   * Absent is a normal lead, not an error: a fix can arrive and the geocode
   * still fail - no network, a rate limit, a point in the sea.
   */
  address?: string;
};

/**
 * The longest address the column will take. Matched by the check constraint in
 * the migration, which is set higher so this is what actually decides and a
 * real address can never be refused by the database.
 */
export const MAX_ADDRESS_LENGTH = 300;

/**
 * Is this a fix worth writing down?
 *
 * The 0,0 rejection is not paranoia about the Gulf of Guinea. Null Island is
 * what a geolocation stack hands back when it has nothing - a zeroed struct, a
 * mock provider left on, a browser polyfill - and a lead pinned there would be
 * a confident lie rather than a blank.
 */
export function isUsableFix(latitude: unknown, longitude: unknown): boolean {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return false;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  if (latitude < -90 || latitude > 90) return false;
  if (longitude < -180 || longitude > 180) return false;
  return !(latitude === 0 && longitude === 0);
}

/** `21.132694, 72.796357` - six decimals, which is about 11cm. */
export function formatCoordinates(latitude: number, longitude: number): string {
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

/**
 * One address component as the on-device geocoders hand them over. Written out
 * rather than imported from `expo-location` so this file stays pure - and
 * narrowed to the seven parts that are actually composed below.
 */
export type AddressParts = {
  name?: string | null;
  streetNumber?: string | null;
  street?: string | null;
  district?: string | null;
  subregion?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
};

/**
 * The components, in the order they are read aloud in India.
 *
 * `Mansarovar Bungalows, Majura Taluka, Surat, Gujarat, India` - building,
 * then street, then the sub-district, then the city, then the state, then the
 * country. Android also returns a ready-made `formattedAddress` and it is
 * deliberately NOT used: it is Android-only, so the same stall would read one
 * way on a Samsung and another on an iPhone, and this string is stored and
 * compared across both.
 *
 * The postal code is left out by the decision of 2026-09-15, which wrote the
 * wanted line without one.
 */
export function composeAddress(parts: AddressParts): string | undefined {
  const street = [parts.streetNumber, parts.street].map(clean).filter(Boolean).join(' ');

  const ordered = [
    clean(parts.name),
    street,
    clean(parts.district),
    clean(parts.subregion),
    clean(parts.city),
    clean(parts.region),
    clean(parts.country),
  ];

  /**
   * Repeats are the rule, not the exception: a geocoder will happily return
   * Surat as both the city and the sub-district, and "Surat, Surat, Gujarat"
   * reads as a mistake. Compared case-insensitively, kept in the order they
   * first appeared.
   */
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const part of ordered) {
    if (!part) continue;
    const key = part.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(part);
  }

  if (kept.length === 0) return undefined;
  return kept.join(', ').slice(0, MAX_ADDRESS_LENGTH);
}

function clean(value: string | null | undefined): string {
  return value?.trim() ?? '';
}

/** Just the location fields of a lead, so this file need not know about leads. */
export type LocatedLead = {
  captureLatitude?: number;
  captureLongitude?: number;
  captureAccuracyMetres?: number;
  captureAddress?: string;
};

/**
 * What the lead screen prints, and whether it prints anything at all.
 *
 * Three outcomes, and the middle one is the one that is easy to get wrong:
 *
 *   address + fix   the address
 *   fix, no address the coordinates
 *   neither         nothing, and the whole block is left off the screen
 *
 * A fix with no address is an ordinary lead and has to look like one. So does a
 * lead with neither - which is every lead captured before this existed, since
 * nothing is ever backfilled. Neither may render as a blank row or a dash.
 */
export function captureLocationLine(lead: LocatedLead): string | null {
  if (!isUsableFix(lead.captureLatitude, lead.captureLongitude)) return null;
  const address = lead.captureAddress?.trim();
  if (address) return address;
  return formatCoordinates(lead.captureLatitude as number, lead.captureLongitude as number);
}

/**
 * `geo:` on Android, Apple Maps on iOS.
 *
 * Opening the phone's own map costs nothing and needs no library, no key and no
 * billing, which is the whole reason the lead screen shows an address and not
 * an embedded map. The label is passed so the pin is named rather than dropped
 * anonymously.
 */
export function mapsUrl(latitude: number, longitude: number, label?: string, ios = false): string {
  const at = `${latitude},${longitude}`;
  const name = encodeURIComponent(label?.trim() || 'Captured here');
  return ios
    ? `http://maps.apple.com/?ll=${at}&q=${name}`
    : `geo:${at}?q=${at}(${name})`;
}
