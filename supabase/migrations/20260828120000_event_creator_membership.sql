-- Whoever creates an event is a member of it.
--
-- `leads_insert_event_member` requires `is_active_event_member(event_id)` before
-- a lead can be captured. Nothing ever created that row for the admin who set
-- the event up: `handle_new_user()` adds an invited rep to `event_members`, but
-- an event created from the wizard had exactly zero members. So the person who
-- built the event was the one person who could not capture on it — the failure
-- would have surfaced at the booth as a bare row-level-security error on save.
--
-- Doing this in a trigger rather than in the app is deliberate. As two client
-- writes it can half-succeed — event created, membership not — and the admin is
-- then permanently locked out of their own event with nothing on screen to
-- explain it. Here it is part of the same transaction as the insert.
--
-- `security definer` because `event_members_admin_write` re-reads `events` for
-- the org check, and the row it needs to read is the one still being inserted.

create or replace function public.add_event_creator_as_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.event_members (event_id, profile_id, status, invited_at, joined_at)
  values (new.id, new.created_by, 'active', now(), now())
  on conflict (event_id, profile_id) do nothing;
  return new;
end;
$$;

revoke execute on function public.add_event_creator_as_member() from public, anon, authenticated;

drop trigger if exists trg_events_add_creator on public.events;

create trigger trg_events_add_creator
after insert on public.events
for each row execute function public.add_event_creator_as_member();

-- Existing events, if any, get the same treatment. There is one organisation on
-- this database today and no events at all, so this is a no-op now and a safety
-- net if it is ever replayed onto a database that does have them.
insert into public.event_members (event_id, profile_id, status, invited_at, joined_at)
select e.id, e.created_by, 'active', now(), now()
from public.events e
on conflict (event_id, profile_id) do nothing;
