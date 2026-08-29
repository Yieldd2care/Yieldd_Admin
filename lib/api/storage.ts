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
 */

export const CARD_IMAGES_BUCKET = 'card-images';
export const VOICE_NOTES_BUCKET = 'voice-notes';

/** `{organization_id}/{lead_id}.jpg` — the key the policies expect. */
export function cardImagePath(organizationId: string, leadId: string): string {
  return `${organizationId}/${leadId}.jpg`;
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
