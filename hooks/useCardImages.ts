import { useQuery } from '@tanstack/react-query';

import { CARD_IMAGES_BUCKET, signedUrls } from '../lib/api/storage';
import type { StoredLead } from '../stores/useLeadsStore';

/**
 * How long a signed card URL is asked for, and how long the answer is reused.
 *
 * The two are deliberately different. The URL is good for an hour; the cache
 * is dropped after fifty minutes so a rep scrolling a long list never reaches
 * a row whose link died while they were looking at it. Ten minutes of slack is
 * far more than any screen needs and costs one extra request an hour.
 */
const URL_TTL_SECONDS = 3600;
const CACHE_MS = 50 * 60_000;

export const cardImageKeys = {
  forPaths: (paths: string[]) => ['card-images', ...paths] as const,
};

/**
 * Which stored path, if any, this lead's photo lives at.
 *
 * `imageUri` is misleadingly named: it holds the object key inside the private
 * bucket, not a URL. That is on purpose — signed links expire, so storing one
 * on the row would leave dead links behind — but it means nothing can render
 * it without a trip through here first.
 */
/** Which of a lead's two photos is being asked for. */
export type PhotoKind = 'card' | 'extra';

type PhotoFields = Pick<
  StoredLead,
  'imageUri' | 'localImageUri' | 'extraPhotoUri' | 'localExtraPhotoUri'
>;

function pathsOf(lead: PhotoFields): string[] {
  const out: string[] = [];
  // A photo still on the device is not in the bucket yet, so it has no key to
  // sign. It is handled by the caller, which prefers it outright.
  if (!lead.localImageUri && lead.imageUri) out.push(lead.imageUri);
  if (!lead.localExtraPhotoUri && lead.extraPhotoUri) out.push(lead.extraPhotoUri);
  return out;
}

/**
 * Signed URLs for a list of leads, fetched in one request.
 *
 * Keyed on the paths themselves rather than on the event, so scrolling,
 * filtering and searching the same leads all hit the same cache entry instead
 * of re-signing the same objects under a different name.
 */
export function useCardImages(leads: (PhotoFields & Pick<StoredLead, 'id'>)[]) {
  // Sorted so that the same set of leads in a different order is the same
  // query. Without it, a re-sorted list looks like a cache miss and re-signs
  // every object.
  const paths = Array.from(new Set(leads.flatMap(pathsOf))).sort();

  const { data } = useQuery({
    queryKey: cardImageKeys.forPaths(paths),
    queryFn: () => signedUrls(CARD_IMAGES_BUCKET, paths, URL_TTL_SECONDS),
    enabled: paths.length > 0,
    staleTime: CACHE_MS,
    gcTime: CACHE_MS,
    // A missing thumbnail is a cosmetic loss and the row is still usable
    // without it, so this must not retry its way through a bad connection at
    // a stall while real work waits behind it.
    retry: false,
  });

  /**
   * What to draw for one lead, or null for the initials fallback.
   *
   * The local file wins over the signed URL. A lead captured minutes ago at a
   * stall has its photo on the phone and possibly nothing in the bucket yet,
   * and even once both exist the local one needs no network and no signature.
   */
  return function photoUri(lead: PhotoFields, kind: PhotoKind = 'card'): string | null {
    // `kind` defaults to 'card' so every existing call site is unchanged.
    const local = kind === 'card' ? lead.localImageUri : lead.localExtraPhotoUri;
    if (local) return local;
    const path = kind === 'card' ? lead.imageUri : lead.extraPhotoUri;
    if (!path) return null;
    return data?.[path] ?? null;
  };
}
