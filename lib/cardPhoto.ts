import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { fileSize } from './files';

/**
 * Getting a photo from the rep's gallery into a shape the card reader accepts.
 *
 * A live capture is always a JPEG of known size. A photo out of the gallery is
 * neither, and three separate things go wrong if it is passed straight through:
 *
 *  1. FORMAT. `lib/api/cardScan.ts` declares `mime_type: 'image/jpeg'` for every
 *     image it sends. That is true of the camera and not of the picker. On
 *     Android the cropper keeps a PNG as a PNG, and on iOS the library hands
 *     back the original HEIC — a format the model does not accept at all. The
 *     declared type is what gets validated, so a mislabelled file fails
 *     upstream with nothing the rep can do about it.
 *
 *     This is why the JPEG re-encode below is load-bearing rather than tidying.
 *     It makes that hardcoded mime type true by construction, which is what lets
 *     the draft store, `scanCard`'s signature and both confirm screens stay
 *     exactly as they are. Removing it to "save a pass" resurrects the bug.
 *
 *  2. PIXELS. The reader's model downscales anything over 2576px on its long
 *     edge before it looks at it, and hard-rejects anything over 8000px. A
 *     modern phone photo is past the first and a 108MP one can pass the second
 *     even after cropping. Sending more than that uploads bytes over a stall's
 *     mobile connection to have them thrown away at the other end.
 *
 *  3. BYTES. See MAX_BYTES.
 *
 * Both transforms are skipped when the photo already satisfies them, because
 * each JPEG re-encode loses a little more of the small print, and small print is
 * the entire payload of a business card.
 *
 * The camera path deliberately does NOT come through here. Its accuracy was
 * measured at 168/168 fields as it stands (`npm run compare:card-models`), and
 * re-encoding underneath it would invalidate that for no visible gain.
 */

/**
 * Just under the model's 2576px long-edge limit, above which it downscales
 * server-side anyway. A round number with a little headroom.
 *
 * Should the reader ever move to a model in the lower resolution tier, this only
 * becomes generous rather than wrong — the server would simply downscale further.
 * So erring high here costs a few bytes, never a misread field.
 */
const MAX_LONG_EDGE = 2560;

/**
 * Deliberately below the Edge Function's own ceiling, which is too generous.
 *
 * `extract-card` caps the base64 at 10 MiB *decoded* (13,981,014 characters),
 * having matched that number to the storage bucket. The real API limit is 10 MB
 * of base64, i.e. 10,485,760 characters — about 7.5 MiB decoded. Photos in
 * between pass the function's guard and are then rejected upstream, where the
 * message is not one the rep can act on. Catching it here, while they still have
 * the picker in hand, is the difference between "choose a different photo" and a
 * dead end.
 *
 * After a resize to MAX_LONG_EDGE a card lands two orders of magnitude under
 * this, so it is a backstop and not a path anyone should meet.
 */
const MAX_BYTES = 7 * 1024 * 1024;

/** High on purpose: JPEG artefacts cost legibility exactly where it matters. */
const JPEG_QUALITY = 0.85;

export type NormalisedPhoto = { ok: true; uri: string } | { ok: false; message: string };

/**
 * Whether the file behind a URI is already a JPEG.
 *
 * Read from the extension rather than the picker's `mimeType`, which cannot be
 * trusted here: on the path where no crop happens it reports the *source* type
 * of a file it has already re-encoded, so it will call a JPEG a HEIC.
 */
function isJpeg(uri: string): boolean {
  const path = uri.split(/[?#]/)[0].toLowerCase();
  return path.endsWith('.jpg') || path.endsWith('.jpeg');
}

function longEdgeOf(width?: number | null, height?: number | null): number | null {
  if (typeof width !== 'number' || typeof height !== 'number') return null;
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
  if (width <= 0 || height <= 0) return null;
  return Math.max(width, height);
}

/**
 * `fileSize` returns null when it cannot tell — a web blob URL, most often.
 * Unknown is not the same as too big, so an unknown size passes and the server's
 * own guard remains the backstop.
 */
async function underByteLimit(uri: string): Promise<NormalisedPhoto> {
  const bytes = await fileSize(uri);
  if (bytes !== null && bytes > MAX_BYTES) {
    return {
      ok: false,
      message: 'That photo is too large to read. Try one taken closer to the card.',
    };
  }
  return { ok: true, uri };
}

/**
 * `width` and `height` come straight off the picked asset, so the common case
 * costs no decode at all. They are optional because a caller without them is
 * still correct — the image is then measured by rendering it once.
 */
export async function normaliseCardPhoto(
  uri: string,
  width?: number | null,
  height?: number | null
): Promise<NormalisedPhoto> {
  try {
    const reportedLongEdge = longEdgeOf(width, height);

    // Nothing to do: already the right format, already small enough. No decode,
    // no second compression pass over the card's small print.
    if (isJpeg(uri) && reportedLongEdge !== null && reportedLongEdge <= MAX_LONG_EDGE) {
      return await underByteLimit(uri);
    }

    const source = await ImageManipulator.manipulate(uri).renderAsync();
    const longEdge = reportedLongEdge ?? Math.max(source.width, source.height);

    // Measuring it may have shown there was nothing to do after all.
    if (isJpeg(uri) && longEdge <= MAX_LONG_EDGE) {
      return await underByteLimit(uri);
    }

    const context = ImageManipulator.manipulate(source);
    if (longEdge > MAX_LONG_EDGE) {
      // One dimension only, so the aspect ratio is preserved for us.
      context.resize(
        source.width >= source.height ? { width: MAX_LONG_EDGE } : { height: MAX_LONG_EDGE }
      );
    }

    // `saveAsync` lives on the rendered image, not on the context — the context
    // only schedules the transforms, `renderAsync` is what waits for them.
    const rendered = await context.renderAsync();
    const saved = await rendered.saveAsync({
      format: SaveFormat.JPEG,
      compress: JPEG_QUALITY,
    });

    return await underByteLimit(saved.uri);
  } catch (err) {
    if (__DEV__) console.warn('[cardPhoto]', err);
    return { ok: false, message: "Couldn't open that photo. Try another one." };
  }
}
