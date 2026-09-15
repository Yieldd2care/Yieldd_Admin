-- One extra photo per lead — the product shot a rep takes beside the card.
--
-- The capture flow is being reworked so the rep adds what only they know
-- (a voice note, the event's fields, and this photo) and submits; the card is
-- read afterwards, in the sync pipeline. This column is the storage half of
-- that screen.
--
-- ---------------------------------------------------------------------------
-- Why this is a schema change and not just a second file write
--
-- All four `card-images` policies match the object key against ONE column:
--
--     where l.card_image_path = storage.objects.name
--
-- and `cardImagePath()` returns exactly one key per lead, `{org}/{lead}.jpg`.
-- A second object is therefore REFUSED by RLS, because no row holds its name.
-- PENDING.md recorded this trap when the back-of-card photo hit it, and chose
-- to discard the back rather than pay for the fix. The product photo is
-- different: it is the rep's own work, it is shown back to them on the lead,
-- and nothing else can reproduce it. So this time the fix gets paid for.
--
-- The policies join back to the owning lead rather than matching a path prefix,
-- and that is deliberate — see the header of 20260827130700. SELECT on
-- storage.objects IS list permission, so a prefix-only policy would let any rep
-- enumerate every card image in the organisation. The join is preserved here
-- exactly; only the column list it matches against widens.
--
-- ---------------------------------------------------------------------------
-- Drop-and-recreate, in ONE transaction, on purpose
--
-- A policy's USING/WITH CHECK expression cannot be altered in place, so each of
-- the four has to be dropped and recreated. Postgres runs DDL transactionally
-- and `supabase db push` applies a migration file as one transaction, so a
-- failure anywhere below rolls the whole thing back and the existing policies
-- stay live. That property is the only thing making this safe to run against a
-- bucket the product depends on — DO NOT split this file in two. A failure
-- between the drops and the creates would leave every card image in the
-- product unreadable, with no way back except restoring by hand.
--
-- `drop policy` is used WITHOUT `if exists`, also on purpose. If a policy name
-- here does not match what is live, the drop fails loudly and the transaction
-- rolls back; `if exists` would skip silently and commit a half-migrated bucket.
--
-- Rehearsed in a rolled-back transaction against the live database before push.
-- ---------------------------------------------------------------------------

alter table public.leads
  add column if not exists extra_photo_path text;

comment on column public.leads.extra_photo_path is
  'Object key in the private card-images bucket for the optional product photo: {organization_id}/{lead_id}-extra.jpg. Shares the bucket with card_image_path; the suffix is what keeps the two keys from colliding. Null for a lead with no extra photo.';


-- --------------------------------------------------------------------------
-- The four policies, reissued with the column list widened and NOTHING else
-- changed. The role asymmetry below is load-bearing and is copied verbatim
-- from 20260827130700:
--
--   read    admin, or the capturer, or the rep it is assigned to
--   insert  the capturer only
--   update  the capturer only; `with check` is the bucket id alone
--   delete  admin, or the capturer
--
-- The match is written as an explicit `or`, not `name in (a, b)`. The IN form
-- behaves correctly with a NULL member, but it is exactly the kind of subtlety
-- that gets "simplified" wrong by the next person to read it.
-- --------------------------------------------------------------------------

drop policy "card_images_read"   on storage.objects;
drop policy "card_images_insert" on storage.objects;
drop policy "card_images_update" on storage.objects;
drop policy "card_images_delete" on storage.objects;

create policy "card_images_read" on storage.objects
for select to authenticated using (
  bucket_id = 'card-images'
  and exists (
    select 1 from public.leads l
     where (l.card_image_path = storage.objects.name
            or l.extra_photo_path = storage.objects.name)
       and l.organization_id = (select public.current_organization_id())
       and (public.is_admin() or l.captured_by = auth.uid() or l.assigned_to = auth.uid())
  )
);

create policy "card_images_insert" on storage.objects
for insert to authenticated with check (
  bucket_id = 'card-images'
  and exists (
    select 1 from public.leads l
     where (l.card_image_path = storage.objects.name
            or l.extra_photo_path = storage.objects.name)
       and l.organization_id = (select public.current_organization_id())
       and l.captured_by = auth.uid()
  )
);

create policy "card_images_update" on storage.objects
for update to authenticated
using (
  bucket_id = 'card-images'
  and exists (
    select 1 from public.leads l
     where (l.card_image_path = storage.objects.name
            or l.extra_photo_path = storage.objects.name)
       and l.organization_id = (select public.current_organization_id())
       and l.captured_by = auth.uid()
  )
)
with check (bucket_id = 'card-images');

create policy "card_images_delete" on storage.objects
for delete to authenticated using (
  bucket_id = 'card-images'
  and exists (
    select 1 from public.leads l
     where (l.card_image_path = storage.objects.name
            or l.extra_photo_path = storage.objects.name)
       and l.organization_id = (select public.current_organization_id())
       and (public.is_admin() or l.captured_by = auth.uid())
  )
);


-- --------------------------------------------------------------------------
-- Mandatory, not tidying.
--
-- Every policy above is a lookup on these two columns, and the initial schema
-- indexed organization_id, event_id, captured_by, assigned_to, phone,
-- follow_up_date and (event_id, status) — but NOT card_image_path. So every
-- signed-URL batch and every upload has been a sequential scan of `leads` since
-- the bucket existed. Adding a second OR'd column makes that strictly worse:
-- without these, the cost of listing a rep's card thumbnails grows with the
-- organisation's entire lead history.
--
-- Partial, because both columns are null for every manually-entered lead and a
-- null row can never match an object name.
-- --------------------------------------------------------------------------

create index if not exists leads_card_image_path_idx
  on public.leads (card_image_path)
  where card_image_path is not null;

create index if not exists leads_extra_photo_path_idx
  on public.leads (extra_photo_path)
  where extra_photo_path is not null;
