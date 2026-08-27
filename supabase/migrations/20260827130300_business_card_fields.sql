-- A4 — The digital-card fields the builder collects but the schema lacked.
--
-- stores/useCardProfileStore.ts collects designation, mobile, secondaryEmail,
-- linkedin, website, officeAddress, bio and a repeating socialLinks list.
-- `mobile` maps onto the existing `phone` and `designation` already existed;
-- the rest had nowhere to go.

alter table public.business_cards
  add column if not exists secondary_email text,
  add column if not exists linkedin_url    text,
  add column if not exists website_url     text,
  add column if not exists office_address  text,
  add column if not exists bio             text,
  add column if not exists social_links    jsonb not null default '[]'::jsonb;

alter table public.business_cards
  add constraint business_cards_social_links_is_array
    check (jsonb_typeof(social_links) = 'array'),
  add constraint business_cards_bio_len
    check (bio is null or char_length(bio) <= 500),
  add constraint business_cards_slug_format
    check (slug ~ '^[a-z0-9]([a-z0-9-]{0,58}[a-z0-9])?$');

comment on column public.business_cards.social_links is
  'Array of {label,url}. The client-side soc_* ids are UI-only and must be stripped before write. jsonb_typeof only validates the container — element shape and URL scheme must still be checked by the renderer, since the owner controls every element.';

comment on constraint business_cards_slug_format on public.business_cards is
  'URL-safe slugs only. NOTE for Phase 3: slugify() in app/(app)/card/edit.tsx strips everything outside [a-z0-9], so a Devanagari or Tamil display_name yields '''' and would violate this. The card-creation path must fall back to user-<shortid> and truncate at 60 chars with a de-dup suffix.';


-- The public hosted card page is served to `anon`, and the initial schema did a
-- TABLE-level `grant select on business_cards to anon` while
-- business_cards_public_read has no column filter and is_published defaults to
-- true. That combination silently publishes every future column the moment it
-- is added.
--
-- Every column below is genuine card content — all of it goes into the vCard
-- that lib/vcard.ts hands out. The point of listing them explicitly is that
-- anything added later is private by default and has to be opted in.
revoke select on public.business_cards from anon;
grant select (
  slug,
  display_name,
  designation,
  company_name,
  phone,
  email,
  secondary_email,
  photo_url,
  website_url,
  linkedin_url,
  office_address,
  bio,
  social_links,
  is_published
) on public.business_cards to anon;
