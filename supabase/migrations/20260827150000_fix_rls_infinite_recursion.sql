-- A10 — Fix infinite recursion between the events / event_members policies.
--
-- THIS IS A PRODUCT-STOPPING BUG, present since the initial schema:
--
--   events_select_members     reads event_members
--   event_members_select      reads events
--
-- Each table's RLS invokes the other's, forever. Postgres aborts with
--   42P17: infinite recursion detected in policy for relation "events"
--
-- Verified consequences for any non-admin rep:
--   * cannot list events
--   * cannot read event_members (so no leaderboard, no roster)
--   * cannot read event_custom_field_defs (its policy joins BOTH tables)
--   * CANNOT CAPTURE A LEAD — leads_insert_event_member reads event_members,
--     which reads events, which reads event_members...
--
-- That last one is the entire product. It was never noticed because nothing in
-- the app talks to the database yet.
--
-- DATABASE_SCHEMA.md §6 already documents the correct pattern for exactly this
-- footgun ("a policy on profiles that queries profiles recurses infinitely...
-- wrapping the lookup in a security definer function breaks that recursion").
-- It just was not applied to the events pair. A security definer function runs
-- with the definer's rights, so the inner read does not re-enter RLS.

-- ---------------------------------------------------------------------------
-- Helpers. All security definer + stable, mirroring current_organization_id().
-- ---------------------------------------------------------------------------

create or replace function public.event_organization_id(p_event_id uuid)
returns uuid
language sql security definer set search_path = public stable
as $$
  select organization_id from public.events where id = p_event_id;
$$;

create or replace function public.is_event_member(p_event_id uuid)
returns boolean
language sql security definer set search_path = public stable
as $$
  select exists (
    select 1 from public.event_members em
     where em.event_id = p_event_id
       and em.profile_id = auth.uid()
  );
$$;

create or replace function public.is_active_event_member(p_event_id uuid)
returns boolean
language sql security definer set search_path = public stable
as $$
  select exists (
    select 1 from public.event_members em
     where em.event_id = p_event_id
       and em.profile_id = auth.uid()
       and em.status = 'active'
  );
$$;

create or replace function public.event_leaderboard_visible(p_event_id uuid)
returns boolean
language sql security definer set search_path = public stable
as $$
  select coalesce(
    (select leaderboard_visible_to_reps from public.events where id = p_event_id),
    false
  );
$$;

-- Backs the Free-tier "one active event" gate without the INSERT policy having
-- to read `events` (which would re-enter the SELECT policy).
create or replace function public.active_event_count()
returns int
language sql security definer set search_path = public stable
as $$
  select count(*)::int
    from public.events
   where organization_id = public.current_organization_id()
     and status in ('upcoming', 'live');
$$;

revoke execute on function
  public.event_organization_id(uuid),
  public.is_event_member(uuid),
  public.is_active_event_member(uuid),
  public.event_leaderboard_visible(uuid),
  public.active_event_count()
from public;

grant execute on function
  public.event_organization_id(uuid),
  public.is_event_member(uuid),
  public.is_active_event_member(uuid),
  public.event_leaderboard_visible(uuid),
  public.active_event_count()
to authenticated, service_role;


-- ---------------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------------

alter policy "events_select_members" on public.events
using (
  organization_id = (select public.current_organization_id())
  and (public.is_admin() or public.is_event_member(id))
);

alter policy "events_admin_insert" on public.events
with check (
  organization_id = (select public.current_organization_id())
  and public.is_admin()
  and created_by = auth.uid()
  and (public.is_pro_user() or public.active_event_count() = 0)
);


-- ---------------------------------------------------------------------------
-- event_members
-- ---------------------------------------------------------------------------

alter policy "event_members_select" on public.event_members
using (
  public.event_organization_id(event_id) = (select public.current_organization_id())
  and (
    public.is_admin()
    or profile_id = auth.uid()
    or public.event_leaderboard_visible(event_id)
  )
);

alter policy "event_members_admin_write" on public.event_members
using (
  public.event_organization_id(event_id) = (select public.current_organization_id())
  and public.is_admin()
)
with check (
  public.event_organization_id(event_id) = (select public.current_organization_id())
);


-- ---------------------------------------------------------------------------
-- event_custom_field_defs — its SELECT policy joined BOTH recursing tables
-- ---------------------------------------------------------------------------

alter policy "field_defs_select_members" on public.event_custom_field_defs
using (
  public.event_organization_id(event_id) = (select public.current_organization_id())
  and (public.is_admin() or public.is_event_member(event_id))
);

alter policy "field_defs_admin_write" on public.event_custom_field_defs
using (
  public.event_organization_id(event_id) = (select public.current_organization_id())
  and public.is_admin()
)
with check (
  public.event_organization_id(event_id) = (select public.current_organization_id())
);


-- ---------------------------------------------------------------------------
-- leads — the capture path. This is the one that matters most.
-- ---------------------------------------------------------------------------

alter policy "leads_insert_event_member" on public.leads
with check (
  organization_id = (select public.current_organization_id())
  and captured_by = auth.uid()
  and public.is_active_event_member(event_id)
  -- Still deliberately NO lead-count check: the 100-lead Free cap is a soft,
  -- app-level upsell prompt, not a database gate. MVP_PLAN: "never block the scan."
);
