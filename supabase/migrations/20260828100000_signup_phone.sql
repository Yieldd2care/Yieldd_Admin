-- Contact number at account creation (PENDING.md #4).
--
-- The signup form now collects a contact number and passes it in the auth
-- metadata alongside full_name / company_name. This teaches the trigger about
-- the fourth key so it lands on profiles.phone instead of being discarded.
--
-- profiles.phone stays NULLABLE on purpose. Two real paths produce a profile
-- with no number and must not fail at the database level:
--   * Google sign-in, which supplies a name and an email and nothing else;
--   * every account created before this migration.
-- Both are steered to the completion screen by the app. A NOT NULL here would
-- instead surface as "Database error saving new user", because GoTrue rewrites
-- any exception raised inside this trigger into that one opaque message.

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
  v_phone     text;
begin
  v_token     := nullif(trim(new.raw_user_meta_data ->> 'invite_token'), '');
  v_full_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'New user');
  v_company   := coalesce(nullif(trim(new.raw_user_meta_data ->> 'company_name'), ''), 'My workspace');
  v_phone     := nullif(trim(new.raw_user_meta_data ->> 'phone'), '');

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

    -- The admin already typed this person's number on the invite screen, so
    -- fall back to it when the rep left the field blank.
    insert into public.profiles (id, organization_id, role, full_name, email, phone)
    values (new.id, v_org_id, v_invite.role, v_full_name, new.email,
            coalesce(v_phone, nullif(trim(v_invite.phone), '')));

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

    insert into public.profiles (id, organization_id, role, full_name, email, phone)
    values (new.id, v_org_id, 'admin', v_full_name, new.email, v_phone);
  end if;

  return new;
end;
$$;
