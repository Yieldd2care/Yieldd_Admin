import { supabase } from '../supabase';
import { readAsBytes } from '../files';

/**
 * Files that belong to a lead.
 *
 * The bucket policies join back to the owning row rather than checking a path
 * prefix — `SELECT` on `storage.objects` IS list permission, so a prefix-only
 * rule would let any rep enumerate and download every card image in the
 * organisation. The consequence is an ordering rule, and it is not optional:
 *
 *   the lead row must exist, already carrying its final object key, before the
 *   upload is permitted.
 *
 * That is exactly the order the outbox drains in — the row goes first, the
 * file follows — so an offline capture works without any special handling.
 *
 * Removal runs the same contract in reverse, and it is the half that is easy to
 * get wrong: `card_images_delete` and `voice_notes_delete` both authorise by
 * joining back to `public.leads`, so the row must STILL EXIST when its objects
 * are deleted. Delete the row first and nothing can ever reach the files again
 * — the only actor left with a path to them is the service-role sweep in the
 * delete-account function, which works at whole-organisation scale.
 */

export const CARD_IMAGES_BUCKET = 'card-images';
export const VOICE_NOTES_BUCKET = 'voice-notes';

/** `{organization_id}/{lead_id}.jpg` — the key the policies expect. */
export function cardImagePath(organizationId: string, leadId: string): string {
  return `${organizationId}/${leadId}.jpg`;
}

/**
 * `{organization_id}/{lead_id}-extra.jpg` — the optional product photo.
 *
 * Same bucket and same policies as the card; the `-extra` suffix is the only
 * thing keeping the two keys apart. It has to be a suffix rather than a
 * subdirectory because the policies compare the whole object name against a
 * column, and a nested key would still need its own column anyway — which it
 * has, `leads.extra_photo_path`, added with the policy amendment in migration
 * 20260915100000.
 */
export function extraPhotoPath(organizationId: string, leadId: string): string {
  return `${organizationId}/${leadId}-extra.jpg`;
}

/**
 * `{organization_id}/{voice_note_id}.m4a`
 *
 * The extension follows the actual recording — a phone produces m4a, a browser
 * produces webm — because the policy matches the key stored on the row, and a
 * file whose name lies about its contents is a problem for whatever plays it.
 */
export function voiceNotePath(
  organizationId: string,
  voiceNoteId: string,
  extension = '.m4a'
): string {
  const ext = extension.startsWith('.') ? extension : `.${extension}`;
  return `${organizationId}/${voiceNoteId}${ext}`;
}

/** m4a on a phone, webm in a browser — both are on the bucket's allow list. */
export function audioContentType(extension = '.m4a'): string {
  return extension.includes('webm') ? 'audio/webm' : 'audio/m4a';
}

export type UploadOutcome =
  | { ok: true; path: string }
  | { ok: false; message: string; permanent: boolean };

async function upload(
  bucket: string,
  path: string,
  uri: string,
  contentType: string
): Promise<UploadOutcome> {
  let bytes: Uint8Array;
  try {
    bytes = await readAsBytes(uri);
  } catch {
    // The file is gone — the OS cleared its cache, or the app was reinstalled.
    // Retrying will never find it, so the lead keeps its text and drops the photo.
    return { ok: false, message: 'That photo is no longer on this device.', permanent: true };
  }

  const { error } = await supabase.storage.from(bucket).upload(path, bytes, {
    contentType,
    // The lead id is in the key, so a repeat is the same file, not a new one.
    // Overwriting makes a retry after a half-finished upload safe.
    upsert: true,
  });

  if (!error) return { ok: true, path };

  // A row-level-security refusal here means the lead row is not there yet, or
  // the caller is not the person who captured it. Neither is fixed by retrying.
  const message = error.message ?? '';
  const permanent = /row-level security|not found|Bucket not found/i.test(message);
  if (__DEV__) console.warn('[storage]', bucket, message);

  return {
    ok: false,
    message: permanent
      ? 'That photo could not be attached to the lead.'
      : "The photo hasn't uploaded yet. It will retry when you're online.",
    permanent,
  };
}

export async function uploadCardImage(
  organizationId: string,
  leadId: string,
  uri: string
): Promise<UploadOutcome> {
  return upload(CARD_IMAGES_BUCKET, cardImagePath(organizationId, leadId), uri, 'image/jpeg');
}

/**
 * The product photo, into the same bucket as the card.
 *
 * Deliberately never passed to `scanCard` — it is a photo of a machine or a
 * banner, and feeding it to the card reader would cost a billed call and could
 * only drag the extraction off course.
 */
export async function uploadExtraPhoto(
  organizationId: string,
  leadId: string,
  uri: string
): Promise<UploadOutcome> {
  return upload(CARD_IMAGES_BUCKET, extraPhotoPath(organizationId, leadId), uri, 'image/jpeg');
}

export async function uploadVoiceNote(
  organizationId: string,
  voiceNoteId: string,
  uri: string,
  extension = '.m4a'
): Promise<UploadOutcome> {
  return upload(
    VOICE_NOTES_BUCKET,
    voiceNotePath(organizationId, voiceNoteId, extension),
    uri,
    audioContentType(extension)
  );
}

/**
 * A temporary URL for a private object.
 *
 * These expire, which is why the row stores the object key rather than a URL —
 * a link saved months ago would be dead, and after the project moved region a
 * stored full URL would have pointed at a different database entirely.
 */
/**
 * The same thing for a list, in one request.
 *
 * The lead list needs a URL for every card it is about to draw, and asking for
 * them one at a time is a round trip per row — a hundred leads at a stall on a
 * hall's wifi is the case that matters, and it is exactly the case where doing
 * it row by row is unusable.
 *
 * Returns a map keyed by the object path, so a caller holding leads can look
 * each one up without keeping the order straight. Paths that fail are simply
 * absent from the map rather than present as null: a missing card falls back
 * to initials, and the two are the same outcome to a caller.
 */
export async function signedUrls(
  bucket: string,
  paths: string[],
  expiresInSeconds = 3600
): Promise<Record<string, string>> {
  const unique = Array.from(new Set(paths.filter(Boolean)));
  if (unique.length === 0) return {};

  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(unique, expiresInSeconds);
  if (error) {
    // Not thrown. Every caller draws a fallback when a URL is missing, so a
    // failure here costs a placeholder rather than a broken screen.
    if (__DEV__) console.warn('[storage] signedUrls', error.message);
    return {};
  }

  const out: Record<string, string> = {};
  for (const row of data ?? []) {
    // `createSignedUrls` reports per-path failures inside the array rather
    // than on `error`, so a single deleted object must not lose the batch.
    if (row.path && row.signedUrl && !row.error) out[row.path] = row.signedUrl;
  }
  return out;
}

export async function signedUrl(
  bucket: string,
  path: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error) {
    if (__DEV__) console.warn('[storage] signedUrl', error.message);
    return null;
  }
  return data?.signedUrl ?? null;
}

/**
 * Delete objects, best effort.
 *
 * Swallows its errors like `signedUrls` above, and for a sharper reason: the
 * only caller deletes a lead's files immediately BEFORE deleting the lead row
 * (see the ordering contract at the top of this file). Throwing here would
 * abort that sequence half way, leaving the rep told nothing and the lead still
 * in their list. An object that survives is a storage-cost problem; a row that
 * survives a removal the rep was shown as done is a trust problem.
 *
 * Keys that do not exist are not an error — `remove` treats them as a no-op —
 * so callers may pass every key a lead could own without checking first.
 */
export async function removeObjects(bucket: string, paths: string[]): Promise<void> {
  const unique = Array.from(new Set(paths.filter(Boolean)));
  if (unique.length === 0) return;

  const { error } = await supabase.storage.from(bucket).remove(unique);
  if (error && __DEV__) console.warn('[storage] removeObjects', bucket, error.message);
}
