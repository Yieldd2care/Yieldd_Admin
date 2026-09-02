-- Expected deal value: a value is required the moment a lead is Qualified, not
-- only when it is Won.
--
-- Reported 2026-09-02. Until now `deal_value_paisa` was filled in at Won, so an
-- event's economics only existed once deals had closed — which on a three-day
-- show is weeks later. Capturing it at Qualified gives the exhibitor a pipeline
-- figure while the stall is still standing.

-- ---------------------------------------------------------------------------
-- The rule, enforced where it cannot be bypassed.
-- ---------------------------------------------------------------------------
--
-- NOT VALID is deliberate and is not a way of avoiding the work. The constraint
-- is fully enforced for every insert and every update from this moment on; what
-- NOT VALID skips is the scan of rows written before the rule existed. There is
-- one such row on this database today (a `qualified` lead with no value), and
-- rejecting the migration over it would leave the rule unenforced for everyone.
--
-- That row is not let off: any update to it must now satisfy the constraint, so
-- it acquires a value the first time anyone touches it.
alter table public.leads
  add constraint leads_qualified_requires_value
  check (status <> 'qualified' or deal_value_paisa is not null)
  not valid;

comment on constraint leads_qualified_requires_value on public.leads is
  'A qualified lead carries its expected deal value. NOT VALID only for rows that predate the rule; every write since is checked.';


-- ---------------------------------------------------------------------------
-- Event totals, now carrying the expected pipeline alongside what has closed.
-- ---------------------------------------------------------------------------
--
-- `expected_value_paisa` sums `qualified` AND `won`. A won deal was qualified
-- first, and dropping it out on close would make the expected figure fall every
-- time the team succeeded — a number that goes down when things go right reads
-- as a bug, and gets the whole screen distrusted.
--
-- `lost` is excluded for the same reason `won_value_paisa` excludes it: a value
-- on a lead that went nowhere is not pipeline, and including it is how a
-- forecast becomes fiction.
--
-- Money stays admin-only, decided here rather than in the client, exactly as
-- before.
--
-- Dropped first, not `create or replace`: adding a column to the returned row
-- changes the function's return type, and Postgres refuses to replace one
-- in place. The grants below are reapplied for the same reason — a drop takes
-- them with it.
drop function if exists public.event_stats(uuid);

create or replace function public.event_stats(p_event_id uuid)
returns table (
  total_leads           bigint,
  leads_today           bigint,
  deals_won             bigint,
  count_new             bigint,
  count_contacted       bigint,
  count_qualified       bigint,
  count_won             bigint,
  count_lost            bigint,
  with_voice_note       bigint,
  needs_note            bigint,
  consent_given         bigint,
  won_value_paisa       bigint,
  expected_value_paisa  bigint,
  spend_paisa           bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org      uuid;
  v_timezone text;
  v_is_admin boolean := public.is_admin();
begin
  select e.organization_id, e.timezone into v_org, v_timezone
  from public.events e where e.id = p_event_id;

  if v_org is null or v_org <> public.current_organization_id() then
    raise exception 'Event not found';
  end if;

  -- Membership, not merely same-organisation: a rep who was never on this
  -- event has no business reading its totals.
  if not v_is_admin and not public.is_event_member(p_event_id) then
    raise exception 'Event not found';
  end if;

  return query
  select
    count(*)::bigint,
    -- "Today" is the event's own day, not the server's and not the phone's.
    -- A show in Bengaluru rolls over at midnight IST for everyone looking at it.
    count(*) filter (
      where (l.created_at at time zone coalesce(v_timezone, 'Asia/Kolkata'))::date
          = (now() at time zone coalesce(v_timezone, 'Asia/Kolkata'))::date
    )::bigint,
    count(*) filter (where l.status = 'won')::bigint,
    count(*) filter (where l.status = 'new')::bigint,
    count(*) filter (where l.status = 'contacted')::bigint,
    count(*) filter (where l.status = 'qualified')::bigint,
    count(*) filter (where l.status = 'won')::bigint,
    count(*) filter (where l.status = 'lost')::bigint,
    count(*) filter (where exists (select 1 from public.voice_notes v where v.lead_id = l.id))::bigint,
    count(*) filter (where l.note is null or btrim(l.note) = '')::bigint,
    count(*) filter (where l.consent_given)::bigint,
    -- Only `won` deals count. A value left on a lead that was later marked Lost
    -- is not revenue, and including it is how an ROI figure becomes fiction.
    case when v_is_admin
      then coalesce(sum(l.deal_value_paisa) filter (where l.status = 'won'), 0)::bigint
      else null end,
    -- The pipeline this event produced: still open, plus already closed.
    case when v_is_admin
      then coalesce(sum(l.deal_value_paisa) filter (where l.status in ('qualified', 'won')), 0)::bigint
      else null end,
    case when v_is_admin
      then (select e.total_cost_paisa from public.events e where e.id = p_event_id)::bigint
      else null end
  from public.leads l
  where l.event_id = p_event_id;
end;
$$;

revoke execute on function public.event_stats(uuid) from public, anon;
grant  execute on function public.event_stats(uuid) to authenticated;

comment on function public.event_stats(uuid) is
  'Aggregate totals for one event. Counts are visible to any active member; money is admin-only and returns NULL otherwise.';


-- ---------------------------------------------------------------------------
-- Rep-wise leaderboard, now with each rep's expected value.
-- ---------------------------------------------------------------------------
--
-- The money column follows event_stats and comes back NULL for a rep, even
-- though the leaderboard itself may be shared with them. Those are two
-- different permissions: "the team may see who captured how many" is the
-- leaderboard switch an admin turns on, and "what the deals are worth" is not
-- part of it. Withholding it here rather than in the client means a future
-- caller cannot leak it by forgetting a check.
drop function if exists public.event_leaderboard(uuid);

create or replace function public.event_leaderboard(p_event_id uuid)
returns table (
  profile_id           uuid,
  full_name            text,
  lead_count           bigint,
  deals_won            bigint,
  expected_value_paisa bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org      uuid;
  v_is_admin boolean := public.is_admin();
begin
  select e.organization_id into v_org from public.events e where e.id = p_event_id;

  if v_org is null or v_org <> public.current_organization_id() then
    raise exception 'Event not found';
  end if;

  -- An admin always sees it. A rep sees it only when the event says they may —
  -- the same switch `event_members_select` already honours, so the roster and
  -- the leaderboard cannot disagree about who is allowed to see whom.
  if not v_is_admin and not public.event_leaderboard_visible(p_event_id) then
    raise exception 'Leaderboard is not shared for this event';
  end if;

  return query
  select p.id,
         p.full_name,
         count(l.id)::bigint,
         count(l.id) filter (where l.status = 'won')::bigint,
         case when v_is_admin
           then coalesce(
                  sum(l.deal_value_paisa) filter (where l.status in ('qualified', 'won')),
                  0
                )::bigint
           else null end
  from public.event_members em
  join public.profiles p on p.id = em.profile_id
  left join public.leads l on l.event_id = p_event_id and l.captured_by = p.id
  where em.event_id = p_event_id
  group by p.id, p.full_name
  order by count(l.id) desc, p.full_name;
end;
$$;

revoke execute on function public.event_leaderboard(uuid) from public, anon;
grant  execute on function public.event_leaderboard(uuid) to authenticated;

comment on function public.event_leaderboard(uuid) is
  'Per-rep capture counts for one event, plus expected deal value. Counts follow the event''s leaderboard switch; the money column is admin-only and returns NULL otherwise.';
