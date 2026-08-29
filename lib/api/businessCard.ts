import { supabase } from '../supabase';
import { readAsBytes, fileSize } from '../files';
import { readSocialLinks, safeExternalUrl, type SocialLink } from '../cardLinks';
import type { Inserts } from '../db';

/**
 * The digital business card and its public page.
 *
 * One row per person (`profile_id` is unique) and `slug` is the whole of the
 * public URL, so two things drive the shape of this file:
 *
 *   1. **Reads have to be filtered explicitly.** `business_cards_public_read`
 *      lets any signed-in user read every PUBLISHED card, so an unfiltered
 *      `select` here would return strangers' cards, not the caller's. The
 *      owner filter is load-bearing, not a tidy-up.
 *   2. **The public page reads as `anon`,** which holds a column-level grant
 *      rather than a table-level one — deliberately, so a column added later
 *      is private until someone opts it in. `select('*')` therefore fails for
 *      a visitor, and PUBLIC_COLUMNS below has to stay in step with the grant
 *      in 20260827130300_business_card_fields.sql.
 */

export const CARD_PHOTOS_BUCKET = 'card-photos';

/** Exactly the columns granted to `anon`. Adding one here without the matching GRANT gives visitors a 42501. */
const PUBLIC_COLUMNS =
  'slug, display_name, designation, company_name, phone, email, secondary_email, photo_path, website_url, linkedin_url, office_address, bio, social_links, is_published';

const OWNER_COLUMNS = `id, profile_id, ${PUBLIC_COLUMNS}`;

export type BusinessCard = {
  id: string | null;
  slug: string;
  displayName: string;
  designation: string | null;
  companyName: string | null;
  phone: string | null;
  email: string | null;
  secondaryEmail: string | null;
  websiteUrl: string | null;
  linkedinUrl: string | null;
  officeAddress: string | null;
  bio: string | null;
  photoPath: string | null;
  /** Resolved from the public bucket, so nothing stores a URL that a project move would invalidate. */
  photoUrl: string | null;
  socialLinks: SocialLink[];
  isPublished: boolean;
};

type CardRow = {
  id?: string;
  slug: string;
  display_name: string;
  designation: string | null;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  secondary_email: string | null;
  photo_path: string | null;
  website_url: string | null;
  linkedin_url: string | null;
  office_address: string | null;
  bio: string | null;
  social_links: unknown;
  is_published: boolean;
};

/** `card-photos` is a public bucket, so this is a plain permanent URL rather than a signed one that expires. */
export function cardPhotoUrl(path: string | null): string | null {
  if (!path) return null;
  const { data } = supabase.storage.from(CARD_PHOTOS_BUCKET).getPublicUrl(path);
  return data?.publicUrl ?? null;
}

function toCard(row: CardRow): BusinessCard {
  return {
    id: row.id ?? null,
    slug: row.slug,
    displayName: row.display_name,
    designation: row.designation,
    companyName: row.company_name,
    phone: row.phone,
    email: row.email,
    secondaryEmail: row.secondary_email,
    websiteUrl: row.website_url,
    linkedinUrl: row.linkedin_url,
    officeAddress: row.office_address,
    bio: row.bio,
    photoPath: row.photo_path,
    photoUrl: cardPhotoUrl(row.photo_path),
    socialLinks: readSocialLinks(row.social_links),
    isPublished: row.is_published,
  };
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

export async function fetchMyCard(profileId: string): Promise<BusinessCard | null> {
  const { data, error } = await supabase
    .from('business_cards')
    .select(OWNER_COLUMNS)
    .eq('profile_id', profileId)
    .maybeSingle();

  if (error) throw new Error("Couldn't load your card. Check your connection and try again.");
  return data ? toCard(data as unknown as CardRow) : null;
}

export type PublicCardResult =
  | { state: 'found'; card: BusinessCard }
  | { state: 'missing' }
  | { state: 'error' };

/**
 * The hosted page's read. Runs as `anon` for most visitors.
 *
 * An unpublished card is reported as missing rather than as "unpublished" —
 * whether a link has ever existed is not a stranger's business.
 */
export async function fetchPublicCard(slug: string): Promise<PublicCardResult> {
  const { data, error } = await supabase
    .from('business_cards')
    .select(PUBLIC_COLUMNS)
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle();

  if (error) return { state: 'error' };
  if (!data) return { state: 'missing' };
  return { state: 'found', card: toCard(data as unknown as CardRow) };
}

// ---------------------------------------------------------------------------
// The link
// ---------------------------------------------------------------------------

export async function suggestSlug(base: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('suggest_card_slug', { p_base: base });
  if (error) return null;
  return typeof data === 'string' ? data : null;
}

export async function isSlugAvailable(slug: string): Promise<boolean | null> {
  const { data, error } = await supabase.rpc('business_card_slug_available', { p_slug: slug });
  if (error) return null;
  return typeof data === 'boolean' ? data : null;
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

export type CardInput = {
  slug: string;
  displayName: string;
  designation?: string | null;
  companyName?: string | null;
  phone?: string | null;
  email?: string | null;
  secondaryEmail?: string | null;
  websiteUrl?: string | null;
  linkedinUrl?: string | null;
  officeAddress?: string | null;
  bio?: string | null;
  photoPath?: string | null;
  socialLinks?: SocialLink[];
  isPublished?: boolean;
};

const blankToNull = (value: string | null | undefined) => {
  const text = (value ?? '').trim();
  return text === '' ? null : text;
};

function toRow(profileId: string, input: CardInput): Inserts<'business_cards'> {
  return {
    profile_id: profileId,
    slug: input.slug,
    display_name: input.displayName.trim(),
    designation: blankToNull(input.designation),
    company_name: blankToNull(input.companyName),
    phone: blankToNull(input.phone),
    email: blankToNull(input.email),
    secondary_email: blankToNull(input.secondaryEmail),
    website_url: blankToNull(input.websiteUrl),
    linkedin_url: blankToNull(input.linkedinUrl),
    office_address: blankToNull(input.officeAddress),
    bio: blankToNull(input.bio)?.slice(0, 500) ?? null,
    photo_path: input.photoPath ?? null,
    // The client-side `soc_*` ids are UI-only and must not be written — the
    // column comment says so, and a stored id would be a second identity for
    // a link that already has one.
    social_links: (input.socialLinks ?? [])
      .map((link) => ({ label: link.label.trim().slice(0, 40), url: safeExternalUrl(link.url) }))
      .filter((link): link is SocialLink => Boolean(link.url && link.label)),
    is_published: input.isPublished ?? true,
  };
}

/**
 * Save the caller's card, creating it if this is the first time.
 *
 * `profile_id` is unique, so one upsert covers both. The interesting case is a
 * slug collision: two people called Priya Sharma, or someone claiming a link
 * another person took while this screen was open. That surfaces as 23505 on
 * the slug's unique index, and the honest response is to save under the next
 * free link and say so — the person came here to publish a card, not to
 * negotiate a namespace.
 */
export async function saveMyCard(
  profileId: string,
  input: CardInput
): Promise<{ card: BusinessCard; slugChanged: boolean }> {
  const attempt = (row: Inserts<'business_cards'>) =>
    supabase
      .from('business_cards')
      .upsert(row, { onConflict: 'profile_id' })
      .select(OWNER_COLUMNS)
      .single();

  let { data, error } = await attempt(toRow(profileId, input));
  let slugChanged = false;

  if (error?.code === '23505') {
    const fallback = await suggestSlug(input.slug);
    if (!fallback) throw new Error('That link is already taken. Try a different one.');
    slugChanged = fallback !== input.slug;
    ({ data, error } = await attempt(toRow(profileId, { ...input, slug: fallback })));
  }

  if (error) {
    if (error.code === '23514') {
      throw new Error('That link can only use lowercase letters, numbers and dashes.');
    }
    if (error.code === '23505') throw new Error('That link is already taken. Try a different one.');
    throw new Error("That didn't save. Check your connection and try again.");
  }

  return { card: toCard(data as unknown as CardRow), slugChanged };
}

export async function setCardPublished(profileId: string, published: boolean): Promise<void> {
  const { error } = await supabase
    .from('business_cards')
    .update({ is_published: published })
    .eq('profile_id', profileId);
  if (error) throw new Error("That didn't save. Check your connection and try again.");
}

// ---------------------------------------------------------------------------
// The photo
// ---------------------------------------------------------------------------

const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // matches the bucket's own limit

/**
 * Upload a new profile photo and return its object key.
 *
 * The key is `{profile_id}/{random}.jpg` — the folder is what the bucket
 * policy checks, and the random filename is what makes a replacement visible.
 * A fixed name would be correct in the database and stale in the browser,
 * because `card-photos` is public and therefore CDN-cached; the old photo
 * would keep being served to everyone who had already opened the card.
 */
export async function uploadCardPhoto(
  profileId: string,
  uri: string
): Promise<{ path: string } | { error: string }> {
  const size = await fileSize(uri);
  if (size != null && size > MAX_PHOTO_BYTES) {
    return { error: 'That photo is larger than 5 MB. Try a smaller one.' };
  }

  let bytes: Uint8Array;
  try {
    bytes = await readAsBytes(uri);
  } catch {
    return { error: 'That photo is no longer on this device.' };
  }

  const path = `${profileId}/${Math.random().toString(36).slice(2, 10)}.jpg`;
  const { error } = await supabase.storage.from(CARD_PHOTOS_BUCKET).upload(path, bytes, {
    contentType: 'image/jpeg',
    upsert: true,
  });

  if (error) {
    if (__DEV__) console.warn('[card-photos]', error.message);
    return { error: "The photo didn't upload. Check your connection and try again." };
  }
  return { path };
}

/** Best-effort tidy-up of the photo a new one replaced. A leftover file is not worth an error the person can act on. */
export async function removeCardPhoto(path: string | null): Promise<void> {
  if (!path) return;
  await supabase.storage.from(CARD_PHOTOS_BUCKET).remove([path]);
}
