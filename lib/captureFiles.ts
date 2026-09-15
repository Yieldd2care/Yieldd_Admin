import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';

/**
 * Moving a capture's files out of the OS cache, so a lead cannot evaporate.
 *
 * The camera and the recorder both hand back URIs in the cache directory —
 * `Paths.cache` — which iOS and Android are free to reclaim whenever storage
 * runs low. That was survivable under the old flow: the rep had already typed
 * the name and the number on the confirm screen, so losing the photo cost a
 * photo and nothing else (`lib/api/storage.ts` classifies a missing file as a
 * permanent upload failure and drops it, keeping the lead).
 *
 * It is not survivable now. The card is read AFTER submit, so between a capture
 * taken in airplane mode and the network coming back, the photo is the only
 * place the person's name exists. An eviction there is total, silent loss of a
 * lead — the one outcome this rework is not allowed to introduce. So every file
 * a capture depends on is copied into the document directory, which the system
 * does not reclaim, before the draft is allowed to reference it.
 *
 * ---------------------------------------------------------------------------
 * Two-step, because the lead id does not exist yet
 *
 * The rep photographs a card long before `addLead()` mints an id, so files land
 * in `captures/pending/` and the whole directory is renamed to `captures/{id}/`
 * once there is an id. One `move` of a directory, rather than a copy per file.
 *
 * ---------------------------------------------------------------------------
 * Every function here fails soft, and that is the point
 *
 * A durability optimisation must never be the reason a capture fails. If a copy
 * throws — storage full, a sandbox quirk, a URI shape nobody predicted — the
 * original cache URI is returned unchanged and the capture proceeds exactly as
 * it does today. The worst case is the behaviour we already had.
 *
 * On web there is no filesystem and the camera hands back a `blob:` URL, so
 * everything here is a no-op that returns its input.
 */

const ROOT = 'captures';
const PENDING = 'pending';

const isWeb = Platform.OS === 'web';

function capturesDir(...segments: string[]): Directory {
  return new Directory(Paths.document, ROOT, ...segments);
}

/** `create` throws when the directory is already there unless told otherwise. */
function ensureDir(dir: Directory): void {
  dir.create({ intermediates: true, idempotent: true });
}

/**
 * Copy one freshly captured file into durable storage.
 *
 * `name` is the role, not the original filename — `front.jpg`, `back.jpg`,
 * `extra.jpg`, `voice.m4a`. Fixed names make the directory self-describing and
 * make a retake overwrite its predecessor instead of accumulating.
 */
export async function persistCapture(uri: string, name: string): Promise<string> {
  if (isWeb || !uri) return uri;

  try {
    const dir = capturesDir(PENDING);
    ensureDir(dir);

    const destination = new File(dir, name);
    // A retake writes the same name; without overwrite the copy would throw and
    // the rep would silently keep the first photo.
    if (destination.exists) destination.delete();

    await new File(uri).copy(destination);
    return destination.uri;
  } catch {
    // Deliberately silent. See the header: the cache URI still works today.
    return uri;
  }
}

/**
 * Rename `captures/pending/` to `captures/{leadId}/` and rewrite the URIs.
 *
 * Returns a function that maps any URI the draft is holding to its new home.
 * A URI that was never under `pending/` — because its copy failed and it is
 * still the cache original — passes through untouched, which is what keeps the
 * fail-soft promise intact end to end.
 */
export async function claimCaptureFiles(leadId: string): Promise<(uri?: string) => string | undefined> {
  const identity = (uri?: string) => uri;
  if (isWeb) return identity;

  try {
    const pending = capturesDir(PENDING);
    if (!pending.exists) return identity;

    const target = capturesDir(leadId);
    // A retried capture with the same id would otherwise collide.
    if (target.exists) target.delete();

    const from = pending.uri;
    await pending.move(target);
    const to = target.uri;

    return (uri?: string) => (uri && uri.startsWith(from) ? to + uri.slice(from.length) : uri);
  } catch {
    return identity;
  }
}

/**
 * Delete one lead's durable files, once every one of them has reached the
 * server. Called from the sync drain; without it a heavy user accumulates a
 * permanent, growing photo archive in a directory the OS will never reclaim.
 */
export function discardCaptureFiles(leadId: string): void {
  if (isWeb) return;
  try {
    const dir = capturesDir(leadId);
    if (dir.exists) dir.delete();
  } catch {
    /* A leftover directory is a disk-space problem, never a correctness one. */
  }
}

/** Throw away a half-finished capture the rep abandoned. */
export function discardPendingCapture(): void {
  if (isWeb) return;
  try {
    const dir = capturesDir(PENDING);
    if (dir.exists) dir.delete();
  } catch {
    /* As above. */
  }
}

/**
 * Whether a URI still points at a real file.
 *
 * Used when the capture draft is rehydrated from storage: a persisted path to a
 * file that no longer exists renders as a broken image and uploads as a
 * permanent failure, so it is cleared instead. Unknown shapes (`blob:`, `http:`)
 * answer `true` — this is a check for eviction, not a URI validator.
 */
export function captureFileExists(uri?: string | null): boolean {
  if (!uri) return false;
  if (isWeb || !uri.startsWith('file:')) return true;
  try {
    return new File(uri).exists;
  } catch {
    return false;
  }
}
