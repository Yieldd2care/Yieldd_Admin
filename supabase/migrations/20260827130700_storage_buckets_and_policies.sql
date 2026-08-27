-- A8 — Storage buckets, path columns, and object policies.
--
-- Buckets and policies live in one file because a probe confirmed that
-- `postgres` CAN create policies on storage.objects on this project, despite
-- pg_has_role() reporting it is not a member of supabase_storage_admin. That
-- was checked empirically (policy created and counted inside a transaction,
-- then rolled back) rather than inferred — the inference was wrong.

-- ---------------------------------------------------------------------------
-- Store object KEYS, not URLs.
--
-- Private buckets are read through signed URLs, which expire, so a stored URL
-- is wrong by construction. And the public bucket is no better: moving this
-- project between regions changed the ref, which would have invalidated every
-- absolute URL already written. Store the key; build the URL client-side.
-- ---------------------------------------------------------------------------

alter table public.leads          rename column card_image_url to card_image_path;
alter table public.voice_notes    rename column audio_url      to audio_path;
alter table public.business_cards rename column photo_url      to photo_path;

comment on column public.leads.card_image_path is
  'Object key in the private card-images bucket: {organization_id}/{lead_id}.jpg';
comment on column public.voice_notes.audio_path is
  'Object key in the private voice-notes bucket: {organization_id}/{voice_note_id}.m4a';
comment on column public.business_cards.photo_path is
  'Object key in the public card-photos bucket: {profile_id}/{filename}';


-- ---------------------------------------------------------------------------
-- Buckets. `id` has no default, so it must be given explicitly.
-- on conflict keeps a re-run (or a bucket someone made in the Dashboard) from
-- taking the whole migration down with it.
-- file_size_limit is bigint BYTES.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('card-images', 'card-images', false, 10485760,
   array['image/jpeg','image/png','image/webp','image/heic','image/heif']),

  ('voice-notes', 'voice-notes', false, 26214400,
   array['audio/m4a','audio/x-m4a','audio/mp4','audio/aac','audio/mpeg','audio/wav','audio/webm']),

  -- Public: the hosted card page is served to anon, and a signed URL would
  -- expire on a static page.
  ('card-photos', 'card-photos', true, 5242880,
   array['image/jpeg','image/png','image/webp']),

  ('template-attachments', 'template-attachments', false, 26214400,
   array['application/pdf','image/jpeg','image/png',
         'application/msword','application/vnd.ms-excel','application/vnd.ms-powerpoint',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
         'application/vnd.openxmlformats-officedocument.presentationml.presentation'])
on conflict (id) do nothing;


-- ---------------------------------------------------------------------------
-- card-images (private)
--
-- These policies JOIN BACK to the owning lead rather than checking a path
-- prefix. That matters: SELECT on storage.objects IS list permission, so a
-- prefix-only policy would let any rep enumerate and download every card image
-- in the organisation — flatly contradicting leads_select_own_or_admin
-- ("reps do not browse each other's leads"). The join costs one index lookup
-- and mirrors the table RLS exactly.
--
-- Consequence: the lead row must exist, carrying its final object key, before
-- the upload is allowed. That is the order the offline outbox already uses —
-- the row drains first, the file follows.
-- ---------------------------------------------------------------------------

create policy "card_images_read" on storage.objects
for select to authenticated using (
  bucket_id = 'card-images'
  and exists (
    select 1 from public.leads l
     where l.card_image_path = storage.objects.name
       and l.organization_id = (select public.current_organization_id())
       and (public.is_admin() or l.captured_by = auth.uid() or l.assigned_to = auth.uid())
  )
);

create policy "card_images_insert" on storage.objects
for insert to authenticated with check (
  bucket_id = 'card-images'
  and exists (
    select 1 from public.leads l
     where l.card_image_path = storage.objects.name
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
     where l.card_image_path = storage.objects.name
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
     where l.card_image_path = storage.objects.name
       and l.organization_id = (select public.current_organization_id())
       and (public.is_admin() or l.captured_by = auth.uid())
  )
);


-- ---------------------------------------------------------------------------
-- voice-notes (private)
-- ---------------------------------------------------------------------------

create policy "voice_notes_read" on storage.objects
for select to authenticated using (
  bucket_id = 'voice-notes'
  and exists (
    select 1 from public.voice_notes vn
      join public.leads l on l.id = vn.lead_id
     where vn.audio_path = storage.objects.name
       and l.organization_id = (select public.current_organization_id())
       and (public.is_admin() or l.captured_by = auth.uid() or l.assigned_to = auth.uid())
  )
);

create policy "voice_notes_insert" on storage.objects
for insert to authenticated with check (
  bucket_id = 'voice-notes'
  and exists (
    select 1 from public.voice_notes vn
      join public.leads l on l.id = vn.lead_id
     where vn.audio_path = storage.objects.name
       and l.organization_id = (select public.current_organization_id())
       and vn.recorded_by = auth.uid()
  )
);

create policy "voice_notes_delete" on storage.objects
for delete to authenticated using (
  bucket_id = 'voice-notes'
  and exists (
    select 1 from public.voice_notes vn
      join public.leads l on l.id = vn.lead_id
     where vn.audio_path = storage.objects.name
       and l.organization_id = (select public.current_organization_id())
       and (public.is_admin() or vn.recorded_by = auth.uid())
  )
);


-- ---------------------------------------------------------------------------
-- card-photos (public)
--
-- A public bucket serves object reads without consulting RLS, so the SELECT
-- policy below only gates authenticated list() calls. Writes are owner-only by
-- {profile_id}/ path prefix — a prefix is correct here precisely because the
-- content is public anyway.
-- ---------------------------------------------------------------------------

create policy "card_photos_public_read" on storage.objects
for select to anon, authenticated using (bucket_id = 'card-photos');

create policy "card_photos_owner_insert" on storage.objects
for insert to authenticated with check (
  bucket_id = 'card-photos' and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "card_photos_owner_update" on storage.objects
for update to authenticated
using      (bucket_id = 'card-photos' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'card-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "card_photos_owner_delete" on storage.objects
for delete to authenticated using (
  bucket_id = 'card-photos' and (storage.foldername(name))[1] = auth.uid()::text
);


-- ---------------------------------------------------------------------------
-- template-attachments (private, org-scoped)
--
-- Templates are org-wide by design, so every member may read the brochure they
-- are about to send; only admins may add or remove one.
-- ---------------------------------------------------------------------------

create policy "template_attachments_read_org" on storage.objects
for select to authenticated using (
  bucket_id = 'template-attachments'
  and (storage.foldername(name))[1] = (select public.current_organization_id())::text
);

create policy "template_attachments_admin_insert" on storage.objects
for insert to authenticated with check (
  bucket_id = 'template-attachments'
  and (storage.foldername(name))[1] = (select public.current_organization_id())::text
  and public.is_admin()
);

create policy "template_attachments_admin_delete" on storage.objects
for delete to authenticated using (
  bucket_id = 'template-attachments'
  and (storage.foldername(name))[1] = (select public.current_organization_id())::text
  and public.is_admin()
);
