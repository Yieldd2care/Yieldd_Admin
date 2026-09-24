-- Let a rep remove the duplicate they just captured — and nothing else.
--
-- Duplicate detection has worked for a while, but the answer went nowhere: the
-- scan path records `duplicate_of_lead_id` during the drain and no screen ever
-- read it back, so a second copy of a contact was stored in silence. The app
-- now asks "keep it or remove it?" on the saved screen, which needs a rep to be
-- able to delete a lead. Today only `leads_delete_admin_only` exists, and the
-- reps who scan cards are not admins.
--
-- The requirement was explicit: no general delete. There is no delete control
-- on the leads list, the lead detail screen, the edit screen or anywhere else,
-- and this policy is the database-side half of that promise — it is written so
-- that even a hand-crafted request cannot widen it into one.

-- ---------------------------------------------------------------------------
-- 1. The flag has to be immutable before it can be trusted to authorise
--
-- The policy below rests on `duplicate_of_lead_id is not null`. That is only a
-- narrowing if the caller cannot set the column themselves — and today they
-- can: `leads_update_own_or_admin` permits the UPDATE, this trigger guarded
-- only assigned_to / captured_by / organization_id, and the publishable key
-- ships inside the app bundle. A rep could PATCH the flag onto any lead they
-- captured and then delete it, which is precisely the general delete this
-- feature is not allowed to become.
--
-- Setting it is refused; CLEARING it is allowed, and that is load-bearing
-- rather than lax. `leads.duplicate_of_lead_id` references leads(id) `on delete
-- set null`, and Postgres implements that referential action as an UPDATE that
-- fires this BEFORE UPDATE trigger. A blanket `is distinct from` check would
-- therefore make an admin's deletion of an ORIGINAL fail, because the cascade
-- that nulls its duplicates' flags would raise. Clearing the flag can only ever
-- remove deletability, so allowing it costs nothing.
--
-- Replaced from the 20260831120000_account_deletion.sql body, NOT the one in
-- the initial schema: that later version added the `app.deleting_account`
-- escape hatch, and recreating this function from the older text would drop it
-- silently, with no error and no failing migration.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_lead_update_rules()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_deleting boolean := coalesce(current_setting('app.deleting_account', true), '') = 'on';
begin
  if new.assigned_to is distinct from old.assigned_to
     and not v_deleting
     and not public.is_admin() then
    raise exception 'Only an admin can reassign a lead';
  end if;

  if new.captured_by is distinct from old.captured_by and not v_deleting then
    raise exception 'captured_by is immutable';
  end if;

  if new.organization_id is distinct from old.organization_id then
    raise exception 'organization_id is immutable';
  end if;

  -- Set once, at capture, from the server's own find_duplicate_lead result.
  -- Never afterwards — see the note above on why this authorises a DELETE.
  if new.duplicate_of_lead_id is distinct from old.duplicate_of_lead_id
     and new.duplicate_of_lead_id is not null then
    raise exception 'duplicate_of_lead_id is set at capture and cannot be changed';
  end if;

  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. The delete policy
--
-- Permissive policies OR together, so this is purely additive:
-- `leads_delete_admin_only` keeps working exactly as before.
--
-- No GRANT is needed. Supabase's bootstrap runs `alter default privileges in
-- schema public grant all on tables to anon, authenticated, service_role`, and
-- nothing in this project has ever revoked table privileges on public.leads
-- (verified in pg_default_acl — see the note in 20260827130600). `authenticated`
-- already holds DELETE at the table level; the only thing that was stopping a
-- rep was the row-level USING clause.
--
-- Each term earns its place:
--
--   organization_id  — mirrors every other policy on this table.
--
--   captured_by = auth.uid()  — deliberately NOT `or assigned_to = auth.uid()`
--     and NOT `or is_admin()`, both of which the SELECT and UPDATE policies do
--     include. Being handed a lead to work is not authority to destroy it, and
--     admins are already covered by the untouched policy next door.
--
--   duplicate_of_lead_id is not null  — the narrowing, trustworthy only because
--     of the trigger above.
--
-- The guarantee this shape buys, which is the real answer to "could this delete
-- something it shouldn't": the FIRST capture of a contact always has a null
-- duplicate_of_lead_id, so this policy can never delete the original. A rep can
-- only ever remove a redundant second copy, and the contact survives the event
-- no matter which button they press.
--
-- Deliberately NO time window. `created_at` is the DEVICE clock — leads.ts
-- sends `input.capturedAt` so an offline capture lands at the time it happened
-- — so a phone with a skewed clock would fall outside any interval and produce
-- exactly the silent zero-row refusal this whole feature is built to avoid.
-- ---------------------------------------------------------------------------
create policy "leads_delete_own_duplicate" on public.leads
for delete using (
  organization_id = public.current_organization_id()
  and captured_by = auth.uid()
  and duplicate_of_lead_id is not null
);

comment on policy "leads_delete_own_duplicate" on public.leads is
  'Removal of a rep''s own flagged duplicate, from the post-capture prompt only. '
  'The app exposes no other delete control; duplicate_of_lead_id is insert-only '
  'so this cannot be widened into a general delete.';
