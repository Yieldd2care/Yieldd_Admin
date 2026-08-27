-- A9 — Two gaps found while re-auditing Part B.

-- ---------------------------------------------------------------------------
-- 1. Deactivation was almost cosmetic.
--
-- current_organization_id() and is_admin() read only organization_id and role.
-- Neither looked at profiles.status, and the only two policies that mention
-- "status" (events_admin_insert, leads_insert_event_member) check
-- event_members.status, not the profile. So a rep marked 'deactivated' kept
-- reading the organisation's leads, events and templates, and could still edit
-- their own leads.
--
-- J3 promises that deactivating a rep never deletes their leads. It should
-- also mean they lose access. Both helpers are the choke point every org-scoped
-- policy already flows through, so gating them here closes it everywhere at
-- once — no policy rewrites, no missed table.
--
-- A deactivated user still satisfies `id = auth.uid()` in
-- profiles_select_self_or_org, so they can still read their own row and be
-- shown an explanatory screen rather than an empty shell.
--
-- Note they cannot deactivate themselves back into access: A1's
-- enforce_profile_update_rules() rejects any self-change of status, and only an
-- admin may change anyone else's.
-- ---------------------------------------------------------------------------

create or replace function public.current_organization_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select organization_id
    from public.profiles
   where id = auth.uid()
     and status = 'active';
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select role = 'admin'
       from public.profiles
      where id = auth.uid()
        and status = 'active'),
    false
  );
$$;


-- ---------------------------------------------------------------------------
-- 2. An invitee could not read their own invite.
--
-- `invites` has only invites_admin_all, so the person holding the link has no
-- way to see who invited them or whether the link is still good. Without this
-- the invite screen can only offer a blank signup form, and an expired link
-- fails deep inside handle_new_user() where GoTrue rewrites the message to a
-- generic "Database error saving new user".
--
-- Deliberately narrow: keyed on the 128-bit token, returns display names only
-- and no UUIDs, so possessing the secret reveals nothing beyond what the
-- invitation itself already told the recipient.
-- ---------------------------------------------------------------------------

create or replace function public.peek_invite(p_token text)
returns table (
  organization_name text,
  event_name        text,
  inviter_name      text,
  invited_name      text,
  invite_role       user_role,
  expires_at        timestamptz,
  is_valid          boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select
    o.name,
    e.name,
    p.full_name,
    i.full_name,
    i.role,
    i.expires_at,
    (i.status = 'pending' and i.expires_at > now())
  from public.invites i
  join public.organizations o on o.id = i.organization_id
  join public.profiles      p on p.id = i.invited_by
  left join public.events   e on e.id = i.event_id
  where i.token = p_token
  limit 1;
$$;

-- CREATE FUNCTION grants EXECUTE to PUBLIC by default. Revoking that first is
-- the same trap A2 had to fix for find_duplicate_lead — granting to `anon`
-- without revoking PUBLIC leaves the function open to everyone regardless.
revoke execute on function public.peek_invite(text) from public;
grant  execute on function public.peek_invite(text) to anon, authenticated;

comment on function public.peek_invite(text) is
  'Unauthenticated lookup of an invite by its secret token, for the invite landing screen. Returns names only — never ids. The app calls this BEFORE signUp so an expired link produces a clear message instead of GoTrue''s generic "Database error saving new user".';
