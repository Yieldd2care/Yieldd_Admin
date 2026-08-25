-- Rename org_is_pro() -> is_pro_user() (ALTER FUNCTION ... RENAME preserves every
-- dependent RLS policy automatically, since Postgres tracks the reference by OID,
-- not by text — events_admin_insert keeps working with no changes needed).
alter function public.org_is_pro() rename to is_pro_user;

-- can_use_ai(): pro orgs always can; free orgs can until they've used their
-- 3 free voice notes (voice transcription is the only AI-metered feature today).
create or replace function public.can_use_ai()
returns boolean
language sql security definer set search_path = public stable
as $$
  select
    public.is_pro_user()
    or (
      select count(*) from public.voice_notes vn
      join public.leads l on l.id = vn.lead_id
      where l.organization_id = public.current_organization_id()
    ) < 3
$$;

-- Refactor voice_notes_insert to call the new helper instead of inlining the same logic.
alter policy "voice_notes_insert" on public.voice_notes
with check (
  recorded_by = auth.uid()
  and exists (select 1 from public.leads l where l.id = voice_notes.lead_id and l.organization_id = public.current_organization_id())
  and public.can_use_ai()
);
