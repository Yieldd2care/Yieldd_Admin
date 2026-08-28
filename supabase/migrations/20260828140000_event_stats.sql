-- Event totals, computed on the server.
--
-- `leads_select_own_or_admin` means a rep can only read the leads they captured
-- or were assigned. Counting rows on the device therefore gives a rep a total
-- that is a fraction of the real one — and then cost-per-lead divides the FULL
-- event cost by that fraction, producing a number several times too large. On a
-- screen an exhibitor takes to their finance team, that is not acceptable.
--
-- So the aggregate is done here, under `security definer`, where every row is
-- visible, and only the totals come back. No individual lead crosses the
-- boundary, so nothing about "reps do not browse each other's leads" changes.
--
-- Money is a separate question from counts. How many leads the stall took is
-- something the team can see; what the stall cost and what the deals were worth
-- is the admin's business. The money columns come back NULL for a rep rather
-- than being withheld by the client, so a future caller cannot leak them by
-- forgetting a check.

create or replace function public.event_stats(p_event_id uuid)
returns table (
  total_leads          bigint,
  leads_today          bigint,
  deals_won            bigint,
  count_new            bigint,
  count_contacted      bigint,
  count_qualified      bigint,
  count_won            bigint,
  count_lost           bigint,
  with_voice_note      bigint,
  needs_note           bigint,
  consent_given        bigint,
  won_value_paisa      bigint,
  spend_paisa          bigint
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
-- Capture by hour, for the dashboard's activity chart.
-- ---------------------------------------------------------------------------

create or replace function public.event_hourly_capture(p_event_id uuid, p_day date default null)
returns table (hour_of_day int, lead_count bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org      uuid;
  v_timezone text;
  v_day      date;
begin
  select e.organization_id, e.timezone into v_org, v_timezone
  from public.events e where e.id = p_event_id;

  if v_org is null or v_org <> public.current_organization_id() then
    raise exception 'Event not found';
  end if;

  if not public.is_admin() and not public.is_event_member(p_event_id) then
    raise exception 'Event not found';
  end if;

  v_timezone := coalesce(v_timezone, 'Asia/Kolkata');
  v_day := coalesce(p_day, (now() at time zone v_timezone)::date);

  -- Every hour from 0 to 23 comes back, including the empty ones. A chart that
  -- silently drops quiet hours makes a slow morning look like a busy one.
  return query
  select h::int,
         count(l.id)::bigint
  from generate_series(0, 23) as h
  left join public.leads l
    on l.event_id = p_event_id
   and (l.created_at at time zone v_timezone)::date = v_day
   and extract(hour from (l.created_at at time zone v_timezone))::int = h
  group by h
  order by h;
end;
$$;

revoke execute on function public.event_hourly_capture(uuid, date) from public, anon;
grant  execute on function public.event_hourly_capture(uuid, date) to authenticated;


-- ---------------------------------------------------------------------------
-- Who captured what. Gated by the event's own leaderboard toggle.
-- ---------------------------------------------------------------------------

create or replace function public.event_leaderboard(p_event_id uuid)
returns table (profile_id uuid, full_name text, lead_count bigint, deals_won bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  select e.organization_id into v_org from public.events e where e.id = p_event_id;

  if v_org is null or v_org <> public.current_organization_id() then
    raise exception 'Event not found';
  end if;

  -- An admin always sees it. A rep sees it only when the event says they may —
  -- the same switch `event_members_select` already honours, so the roster and
  -- the leaderboard cannot disagree about who is allowed to see whom.
  if not public.is_admin() and not public.event_leaderboard_visible(p_event_id) then
    raise exception 'Leaderboard is not shared for this event';
  end if;

  return query
  select p.id,
         p.full_name,
         count(l.id)::bigint,
         count(l.id) filter (where l.status = 'won')::bigint
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
