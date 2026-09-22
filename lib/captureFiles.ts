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
 * A capture is identified by its URI, so two captures must never share one.
 *
 * This file used to write every front to `pending/front.jpg`, on the reasoning
 * that a fixed name keeps the directory self-describing and makes a retake
 * overwrite its predecessor. Both halves were true and the conclusion was still
 * wrong: the second card of the day got the same URI string as the first, and
 * React Native's `<Image>` caches decoded bitmaps against that string with no
 * mtime or inode in the key — Fresco's `DefaultCacheKeyFactory` on Android,
 * `RCTImageCache` on iOS. So the details screen re-served the PREVIOUS card's
 * photo while the file on disk held the new one, and only stopped once
 * `claimCaptureFiles()` rebased the URI under a lead id and changed the string.
 *
 * A rep proof-reading a preview that shows somebody else's card is the whole
 * job of that screen failing silently, so the name now carries a counter.
 */
let sequence = 0;

/** `'front.jpg'` -> `['front', '.jpg']`. A name with no dot keeps an empty one. */
function splitRole(name: string): [string, string] {
  const dot = name.lastIndexOf('.');
  return dot <= 0 ? [name, ''] : [name.slice(0, dot), name.slice(dot)];
}

/**
 * Drop the previous file for one role, now that its replacement is on disk.
 *
 * Self-guarding, and returns nothing, because of where it is called from: this
 * runs AFTER the copy whose result the caller returns. Letting a failed delete
 * escape would turn a capture that succeeded into a fallback to the cache URI,
 * which is the one thing this module exists to avoid.
 */
function sweepPreviousRole(dir: Directory, role: string, keepUri: string): void {
  try {
    if (!dir.exists) return;
    for (const entry of dir.list()) {
      if (entry instanceof File && entry.name.startsWith(`${role}-`) && entry.uri !== keepUri) {
        entry.delete();
      }
    }
  } catch {
    /* A leftover file is disk space, never correctness. */
  }
}

/**
 * Copy one freshly captured file into durable storage.
 *
 * `name` is the role, not the original filename — `front.jpg`, `back.jpg`,
 * `extra.jpg`, `voice.m4a`. The role survives as the prefix, so the directory
 * still reads at a glance; what is appended is what keeps the URI unique.
 *
 * Copy first, sweep second, and that order is load-bearing. Deleting the old
 * photo before writing the new one is what the previous version did, and on a
 * copy that then failed it would have destroyed the shot the rep already had
 * AND handed back a cache URI the OS may reclaim — a durability helper causing
 * the loss it was added to prevent.
 */
export async function persistCapture(uri: string, name: string): Promise<string> {
  if (isWeb || !uri) return uri;

  const [role, extension] = splitRole(name);
  let dir: Directory;
  let destination: File;

  try {
    dir = capturesDir(PENDING);
    ensureDir(dir);

    destination = new File(dir, `${role}-${Date.now()}-${++sequence}${extension}`);
    await new File(uri).copy(destination);
  } catch {
    // Deliberately silent. See the header: the cache URI still works today.
    return uri;
  }

  sweepPreviousRole(dir, role, destination.uri);
  return destination.uri;
}

/**
 * Delete everything in `pending/` that the capture draft no longer references.
 *
 * The abandoned-capture problem, solved by what is referenced rather than by
 * what is named. A rep who photographs a card and then leaves — the close
 * button, the hardware back, the app being killed — used to leave the photo in
 * `pending/`, and `claimCaptureFiles()` moves that whole directory into the
 * next lead saved. A stranger's business card, filed under someone else.
 *
 * Deleting the directory wholesale is not the fix, and this is the trap worth
 * recording: `pending/` is shared with the manual-entry path, so a rep who
 * recorded a voice note, tapped the camera button and backed out would have the
 * recording deleted from under them. Passing the URIs the draft is holding
 * makes that impossible by construction — a live file is a referenced file.
 */
export function sweepOrphanedCaptures(keep: (string | null | undefined)[]): void {
  if (isWeb) return;
  try {
    const dir = capturesDir(PENDING);
    if (!dir.exists) return;

    const referenced = new Set(keep.filter((uri): uri is string => Boolean(uri)));
    for (const entry of dir.list()) {
      if (entry instanceof File && !referenced.has(entry.uri)) entry.delete();
    }
  } catch {
    /* As elsewhere: a leftover file is disk space, never correctness. */
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

/**
 * Delete every durable capture file on the device.
 *
 * discardCaptureFiles() above only fires once one lead has fully drained — see
 * the check in stores/useLeadsStore.ts. Emptying the outbox with drafts still
 * in it therefore strands their photos and recordings under `Paths.document`
 * forever, which is the one directory the OS never reclaims and the entire
 * reason they were copied there. Nothing would reference them and nothing
 * would delete them: someone else's business cards, left on a handset that no
 * longer has an account.
 *
 * So the sign-out teardown removes the root, `pending/` included. Safe while a
 * capture is in flight — persistCapture() and claimCaptureFiles() both fail
 * soft back to the cache URI, which is the behaviour the header promises.
 */
export function discardAllCaptureFiles(): void {
  if (isWeb) return;
  try {
    const dir = capturesDir();
    if (dir.exists) dir.delete();
  } catch {
    /* As below: a leftover directory is disk space, never correctness. */
  }
}

/*
 * There was a discardPendingCapture() here, which deleted `pending/` whole.
 * It was never called from anywhere, and it is deliberately not revived: the
 * directory is shared with the manual-entry path, so emptying it to throw away
 * an abandoned card photo also throws away a voice note that belongs to a
 * different draft. sweepOrphanedCaptures() above does the same job by what is
 * still referenced, which cannot make that mistake.
 */

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
