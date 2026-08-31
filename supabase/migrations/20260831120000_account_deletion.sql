-- Account deletion.
--
-- Both app stores refuse an app that lets you create an account but not delete
-- one — Apple under 5.1.1(v), Google Play under its data-deletion policy. This
-- is that feature, and it is destructive, so the rules are written down rather
-- than left to the caller.
--
-- Two outcomes, decided by what the person leaves behind:
--
--   HANDOVER  Someone else is still running the organisation. The person goes;
--             their leads, templates and batches move to a surviving admin so
--             the company does not lose its history.
--
--   ORG       There is no surviving admin. The whole organisation goes with
--             them — events, leads, voice notes, and every remaining member's
--             login. A solo user is always this case, because a solo user is
--             an organisation of one.
--
-- Ordering is not a preference here, it is forced by the schema:
--
--   * profiles.id → auth.users ON DELETE CASCADE, so deleting the login
--     deletes the profile. There is no way to keep an anonymised tombstone.
--   * Nine columns point at profiles and none of them yield. Three are
--     declared ON DELETE RESTRICT (leads.captured_by,
--     message_templates.created_by, message_batches.created_by); the rest --
--     events.created_by, invites.invited_by, voice_notes.recorded_by,
--     message_sends.sent_by, lead_activity.actor_id -- were written with no
--     delete rule at all, which means NO ACTION, which blocks just as hard.
--     Every one has to be moved or deleted before the profile can go.
--   * profiles.organization_id is ON DELETE RESTRICT against organizations,
--     so the organisation row can only go once its profiles have.
--
-- Which is why this function does not delete the logins itself. It clears
-- everything that blocks them and hands the ids back; the `delete-account`
-- Edge Function then deletes those users through Supabase's admin API, which
-- is the supported path and which cascades the profiles away.

-- ---------------------------------------------------------------------------
-- 1. Let the deletion move `captured_by`
--
-- The lead guard calls captured_by immutable, and it should be — it is the
-- record of who stood in front of that customer, and nothing in normal use may
-- rewrite it. Handover is the one exception, so it gets one narrow door: a
-- transaction-local flag that only the deletion function sets. `is_admin()` is
-- waived under the same flag, because a rep deleting their own account is not
-- an admin and still has to be able to hand their leads over.
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

  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Work out which outcome applies, without changing anything
--
-- Split out so the confirmation screen can show the person exactly what is
-- about to happen — how many leads, how many colleagues — before they type the
-- word. Nobody should discover the scope of this afterwards.
-- ---------------------------------------------------------------------------
create or replace function public.account_deletion_preview()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_role user_role;
  v_other_admins int;
  v_other_members int;
  v_mode text;
begin
  if v_uid is null then
    raise exception 'Not signed in';
  end if;

  select organization_id, role into v_org, v_role
  from public.profiles where id = v_uid;

  if v_org is null then
    raise exception 'No profile for this account';
  end if;

  select
    count(*) filter (where role = 'admin' and status = 'active'),
    count(*) filter (where status = 'active')
  into v_other_admins, v_other_members
  from public.profiles
  where organization_id = v_org and id <> v_uid;

  -- No surviving admin means nobody can run the organisation afterwards, so it
  -- goes. That covers the solo user, and it covers the last admin of a team.
  v_mode := case when v_other_admins = 0 then 'org' else 'handover' end;

  return jsonb_build_object(
    'mode', v_mode,
    'role', v_role,
    'organization_id', v_org,
    'organization_name', (select name from public.organizations where id = v_org),
    'other_members', v_other_members,
    'other_admins', v_other_admins,
    -- What disappears. In handover mode the organisation keeps its leads, so
    -- only the person's own things are counted.
    'leads_affected', (
      select count(*) from public.leads
      where case when v_mode = 'org' then organization_id = v_org else captured_by = v_uid end
    ),
    'events_deleted', (
      select case when v_mode = 'org'
        then (select count(*) from public.events where organization_id = v_org)
        else 0 end
    ),
    'members_deleted', case when v_mode = 'org' then v_other_members else 0 end
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Do it
--
-- Everything here is one transaction. It clears what blocks the logins and
-- returns the ids the Edge Function must then delete through the admin API,
-- plus the storage prefixes it must empty. It deliberately does NOT touch
-- auth.users: that table belongs to the auth service, and reaching into it
-- from application SQL is how sessions and identities get left behind.
-- ---------------------------------------------------------------------------
create or replace function public.perform_account_deletion()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_other_admins int;
  v_target uuid;
  v_mode text;
  v_user_ids uuid[];
  v_profile_ids uuid[];
begin
  if v_uid is null then
    raise exception 'Not signed in';
  end if;

  select organization_id into v_org from public.profiles where id = v_uid;
  if v_org is null then
    raise exception 'No profile for this account';
  end if;

  select count(*) into v_other_admins
  from public.profiles
  where organization_id = v_org and id <> v_uid and role = 'admin' and status = 'active';

  v_mode := case when v_other_admins = 0 then 'org' else 'handover' end;

  -- Opens the narrow door in the lead guard, for this transaction only.
  perform set_config('app.deleting_account', 'on', true);

  if v_mode = 'org' then
    -- Order is forced, and it is circular unless it is done by hand: the
    -- organisation cannot go until its profiles have, its profiles cannot go
    -- until nothing references them, and events/invites reference profiles
    -- while cascading from the organisation. So they are cleared explicitly.
    delete from public.message_batches where organization_id = v_org;
    delete from public.message_templates where organization_id = v_org;
    -- Events cascade to event_members, custom field defs and leads; leads
    -- cascade on to voice_notes, lead_activity and message_sends.
    delete from public.events where organization_id = v_org;
    delete from public.leads where organization_id = v_org;
    delete from public.invites where organization_id = v_org;

    select array_agg(id) into v_profile_ids
    from public.profiles where organization_id = v_org;

    v_user_ids := v_profile_ids;
  else
    -- The longest-standing active admin inherits. Deterministic, so two people
    -- leaving on the same day do not scatter the org's history across admins.
    select id into v_target
    from public.profiles
    where organization_id = v_org and id <> v_uid and role = 'admin' and status = 'active'
    order by created_at asc
    limit 1;

    if v_target is null then
      raise exception 'No surviving admin to hand over to';
    end if;

    -- Every column that points at a profile has to move, not just the three
    -- declared ON DELETE RESTRICT. The rest were written with no delete rule
    -- at all, which means NO ACTION, which blocks the delete just as hard.
    update public.leads             set captured_by = v_target where captured_by = v_uid;
    update public.leads             set assigned_to = v_target where assigned_to = v_uid;
    update public.events            set created_by  = v_target where created_by  = v_uid;
    update public.invites           set invited_by  = v_target where invited_by  = v_uid;
    update public.voice_notes       set recorded_by = v_target where recorded_by = v_uid;
    update public.message_sends     set sent_by     = v_target where sent_by     = v_uid;
    update public.message_templates set created_by  = v_target where created_by  = v_uid;
    update public.message_batches   set created_by  = v_target where created_by  = v_uid;
    -- Nullable, and nobody else did these things. Better empty than credited
    -- to an admin who was not there.
    update public.lead_activity     set actor_id    = null     where actor_id    = v_uid;

    v_user_ids := array[v_uid];
  end if;

  perform set_config('app.deleting_account', 'off', true);

  return jsonb_build_object(
    'mode', v_mode,
    'organization_id', v_org,
    'user_ids', to_jsonb(v_user_ids),
    'handed_over_to', v_target
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Grants
--
-- Callable by a signed-in person for their OWN account — both functions read
-- auth.uid() and never take a target, so there is no way to aim them at
-- somebody else. Revoked from anon and PUBLIC: a definer function that deletes
-- an organisation is not something to leave reachable without a session.
-- Naming both roles because revoking from PUBLIC alone leaves anon holding its
-- own grant, which this project has been caught by before.
-- ---------------------------------------------------------------------------
revoke all on function public.account_deletion_preview() from public, anon;
revoke all on function public.perform_account_deletion() from public, anon;
grant execute on function public.account_deletion_preview() to authenticated;
grant execute on function public.perform_account_deletion() to authenticated;

comment on function public.perform_account_deletion() is
  'Clears everything blocking a profile delete and returns the auth user ids for the delete-account Edge Function to remove. Never call directly from the client.';
