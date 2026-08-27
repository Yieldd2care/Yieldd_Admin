-- A2 — Harden the signup path.
--
-- Three defects in the original handle_new_user():
--
--   1. coalesce(... ->> 'full_name', 'New user') does not catch '' or '   ',
--      so a whitespace-only company name created an organisation literally
--      named ''.
--   2. The invite lookup took no row lock, so two people redeeming the same
--      token could both proceed.
--   3. Worst: a token that was SUPPLIED but did not match (expired, revoked,
--      typo'd) fell through to the `else` branch and silently created a brand
--      new organisation with role = 'admin'. An invitee clicking a stale link
--      ended up in their own empty workspace wondering where the team went.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite    public.invites%rowtype;
  v_org_id    uuid;
  v_token     text;
  v_full_name text;
  v_company   text;
begin
  v_token     := nullif(trim(new.raw_user_meta_data ->> 'invite_token'), '');
  v_full_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'New user');
  v_company   := coalesce(nullif(trim(new.raw_user_meta_data ->> 'company_name'), ''), 'My workspace');

  if v_token is not null then
    -- FOR UPDATE serialises concurrent redemptions. Under READ COMMITTED the
    -- loser re-evaluates the status='pending' qualifier after acquiring the
    -- lock, sees 'accepted', and matches no row — landing on the raise below
    -- rather than joining the org twice.
    select * into v_invite
      from public.invites
     where token = v_token
       and status = 'pending'
       and expires_at > now()
     limit 1
       for update;

    if not found then
      raise exception 'This invite link is invalid or has expired';
    end if;

    v_org_id := v_invite.organization_id;

    insert into public.profiles (id, organization_id, role, full_name, email)
    values (new.id, v_org_id, v_invite.role, v_full_name, new.email);

    update public.invites
       set status = 'accepted', accepted_at = now()
     where id = v_invite.id;

    if v_invite.event_id is not null then
      insert into public.event_members (event_id, profile_id, status, joined_at)
      values (v_invite.event_id, new.id, 'active', now());
    end if;
  else
    -- No token supplied: genuine self-serve signup, own org, own admin.
    insert into public.organizations (name)
    values (v_company)
    returning id into v_org_id;

    insert into public.profiles (id, organization_id, role, full_name, email)
    values (new.id, v_org_id, 'admin', v_full_name, new.email);
  end if;

  return new;
end;
$$;


-- profiles.email mirrors auth.users.email, and A1 now stops the client editing
-- it directly. Without this the two drift apart the first time someone changes
-- their email. GoTrue connects directly (no request.jwt.claims), so the UPDATE
-- lands on the guard's trusted bypass path.
create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email and new.email is not null then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.sync_profile_email();


-- find_duplicate_lead is security definer and was reachable by anon.
-- Revoking from `anon` alone is a no-op: CREATE FUNCTION grants EXECUTE to
-- PUBLIC by default, and that grant (shown as `=X/postgres` in proacl) covers
-- everyone regardless. PUBLIC has to be revoked explicitly.
revoke execute on function public.find_duplicate_lead(uuid, text) from public, anon;
grant  execute on function public.find_duplicate_lead(uuid, text) to authenticated, service_role;
