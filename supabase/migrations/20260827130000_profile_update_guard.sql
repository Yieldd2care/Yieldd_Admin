-- A1 — Close the privilege-escalation hole on public.profiles.
--
-- The initial schema shipped:
--   create policy "profiles_update_self" on public.profiles
--   for update using (id = auth.uid()) with check (id = auth.uid());
--
-- No column restriction, and no guard trigger of the kind leads has. So any rep
-- could run
--     update profiles set role = 'admin' where id = auth.uid();
-- and unlock the entire organisation (is_admin() then opens events, invites,
-- every lead, subscriptions), or set organization_id to another org's uuid and
-- walk straight across the tenant boundary.
--
-- This mirrors the existing enforce_lead_update_rules() pattern.

create or replace function public.enforce_profile_update_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claims text;
begin
  -- Trusted callers bypass the guard: a direct connection (migrations, psql,
  -- GoTrue's own triggers) has no request.jwt.claims GUC at all, and
  -- service_role is the backend.
  --
  -- The nullif() is load-bearing. PostgREST can set this GUC to the empty
  -- string rather than leaving it unset, and ''::jsonb raises 22P02 — which
  -- would make EVERY profile update fail. Supabase's own auth.jwt() is written
  -- exactly this way for the same reason.
  v_claims := nullif(current_setting('request.jwt.claims', true), '');

  if v_claims is null or (v_claims::jsonb ->> 'role') = 'service_role' then
    new.updated_at := now();
    return new;
  end if;

  if new.id is distinct from old.id then
    raise exception 'profiles.id is immutable';
  end if;

  if new.organization_id is distinct from old.organization_id then
    raise exception 'organization_id is immutable';
  end if;

  if new.role is distinct from old.role then
    if not public.is_admin() then
      raise exception 'Only an admin can change a role';
    end if;
    if new.id = auth.uid() then
      raise exception 'You cannot change your own role';
    end if;
  end if;

  if new.status is distinct from old.status then
    if not public.is_admin() then
      raise exception 'Only an admin can change member status';
    end if;
    if new.id = auth.uid() then
      raise exception 'You cannot change your own status';
    end if;
  end if;

  -- profiles.email mirrors auth.users.email and is kept in sync by the trigger
  -- added in A2 (which arrives on the no-JWT bypass path above).
  if new.email is distinct from old.email then
    raise exception 'Change your email from account settings';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

-- This trigger maintains updated_at itself, so it replaces the generic one
-- rather than running alongside it.
drop trigger if exists trg_profiles_updated_at on public.profiles;

drop trigger if exists trg_profiles_before_update on public.profiles;
create trigger trg_profiles_before_update
  before update on public.profiles
  for each row execute function public.enforce_profile_update_rules();
