-- Totals across a SET of events, computed on the server.
--
-- The dashboard has reported on one event at a time since it was built. This is
-- the first figure in the product that spans them, and the obvious way to build
-- it — call event_stats() once per event and add the answers up on the device —
-- is wrong in a way nothing on screen would show.
--
-- `leads_select_own_or_admin` means a rep can only read the leads they captured
-- or were assigned. Summing on the client therefore gives a rep a fraction of
-- the real total, silently; and any cost figure then divides the FULL event
-- spend by that fraction. So the aggregate is done here, under `security
-- definer`, where every row is visible, and only the totals come back. No
-- individual lead crosses the boundary, so nothing about "reps do not browse
-- each other's leads" changes. Same reasoning as event_stats, which this is
-- modelled on.
--
-- Money is a separate question from counts, and the split is the same: how many
-- leads the team took is theirs to see, what the shows cost and what the deals
-- were worth is the admin's. Those columns come back NULL for a rep rather than
-- being withheld by the client, so a future caller cannot leak them by
-- forgetting a check.
--
-- Three things here have no equivalent in the single-event version:
--
--   1. A rep who selects a mix of events they are and are not on is REFUSED,
--      not quietly given the narrower total. A number whose scope is not the
--      scope the reader believes it is is worse than no number.
--
--   2. "Priced" is tracked separately from spend. events.total_cost_paisa is a
--      generated column that coalesces its seven components to 0, so an event
--      nobody costed is indistinguishable from one that cost nothing — and
--      across a set, those events' won deals would land in the ROI numerator
--      while contributing nothing to the denominator. The components themselves
--      stay NULL-permissive on purpose, so the question is answerable from them.
--
--   3. "Today" is resolved per event, in that event's own timezone. A set
--      spanning several shows has no single today, so each lead is judged
--      against its own event's calendar and the counts are added.

create or replace function public.event_set_stats(p_event_ids uuid[])
returns table (
  events_counted         int,
  total_leads            bigint,
  leads_today            bigint,
  deals_won              bigint,
  count_new              bigint,
  count_contacted        bigint,
  count_qualified        bigint,
  count_won              bigint,
  count_lost             bigint,
  with_voice_note        bigint,
  needs_note             bigint,
  consent_given          bigint,
  won_value_paisa        bigint,
  expected_value_paisa   bigint,
  spend_paisa            bigint,
  priced_events          int,
  priced_won_value_paisa bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org      uuid    := public.current_organization_id();
  v_is_admin boolean := public.is_admin();
  v_ids      uuid[];
  v_count    int;
  v_mine     int;
begin
  -- Distinct and null-free. A duplicated id would otherwise count that event's
  -- spend twice while its leads joined only once.
  select array_agg(distinct t.id) into v_ids
  from unnest(coalesce(p_event_ids, '{}'::uuid[])) as t(id)
  where t.id is not null;

  v_count := coalesce(array_length(v_ids, 1), 0);

  -- An aggregate over no events is not zero, it is a question that was not
  -- asked. The caller resolves "all events" to a list before calling.
  if v_count = 0 then
    raise exception 'No events selected';
  end if;

  if v_org is null then
    raise exception 'Event not found';
  end if;

  -- Counted and compared rather than filtered: a foreign event has to RAISE.
  -- Dropping it from the set would return a total that is short by exactly the
  -- amount nobody can see.
  select count(*) into v_mine
  from public.events e
  where e.id = any(v_ids)
    and e.organization_id = v_org;

  if v_mine <> v_count then
    raise exception 'Event not found';
  end if;

  -- Membership per event, not merely same-organisation — the same rule
  -- event_stats applies, and the same predicate events_select_members uses, so
  -- the picker and this function cannot disagree about what a rep may read.
  if not v_is_admin and exists (
    select 1 from unnest(v_ids) as t(id)
    where not public.is_event_member(t.id)
  ) then
    raise exception 'Event not found';
  end if;

  return query
  with picked as (
    select e.id,
           e.timezone,
           e.total_cost_paisa,
           -- Whether anyone recorded a cost AT ALL, which total_cost_paisa
           -- cannot answer: it is `coalesce(component, 0) + ...`, so an
           -- uncosted event reads as 0 rather than as unknown.
           (coalesce(e.cost_stall_paisa,
                     e.cost_fabrication_paisa,
                     e.cost_furniture_paisa,
                     e.cost_travel_paisa,
                     e.cost_staff_paisa,
                     e.cost_accommodation_paisa,
                     e.cost_marketing_paisa) is not null) as is_priced
    from public.events e
    where e.id = any(v_ids)
  ),

  -- TWO aggregates, joined at the end, and this is not an accident. Spend must
  -- never be summed across the join to leads: an event with 300 leads would
  -- contribute its cost 300 times and report a spend figure 300x too large.
  spend_agg as (
    select count(*)::int                                as ev_count,
           count(*) filter (where p.is_priced)::int     as ev_priced,
           coalesce(sum(p.total_cost_paisa), 0)::bigint as ev_spend
    from picked p
  ),

  -- `count(l.id)`, never `count(*)`: this is a LEFT join, so an event with no
  -- leads still produces a row, and count(*) would score it as one lead. The
  -- same choice makes every filter below safe against that phantom row — note
  -- `l.note is null` is true for it, which would otherwise inflate needs_note.
  lead_agg as (
    select
      count(l.id)::bigint                                       as ct_total,
      -- Each show's own local day, added together. A set spanning timezones
      -- has no single "today".
      count(l.id) filter (
        where (l.created_at at time zone p.timezone)::date
            = (now()        at time zone p.timezone)::date
      )::bigint                                                 as ct_today,
      count(l.id) filter (where l.status = 'won')::bigint        as ct_won_deals,
      count(l.id) filter (where l.status = 'new')::bigint        as ct_new,
      count(l.id) filter (where l.status = 'contacted')::bigint  as ct_contacted,
      count(l.id) filter (where l.status = 'qualified')::bigint  as ct_qualified,
      count(l.id) filter (where l.status = 'won')::bigint        as ct_won,
      count(l.id) filter (where l.status = 'lost')::bigint       as ct_lost,
      count(l.id) filter (
        where exists (select 1 from public.voice_notes v where v.lead_id = l.id)
      )::bigint                                                 as ct_voice,
      count(l.id) filter (
        where l.note is null or btrim(l.note) = ''
      )::bigint                                                 as ct_needs_note,
      count(l.id) filter (where l.consent_given)::bigint         as ct_consent,
      -- Only `won` deals count. A value left on a lead that was later marked
      -- Lost is not revenue, and including it is how an ROI figure becomes
      -- fiction.
      coalesce(sum(l.deal_value_paisa) filter (where l.status = 'won'), 0)::bigint
                                                                as val_won,
      -- The pipeline these events produced: still open, plus already closed.
      coalesce(sum(l.deal_value_paisa) filter (where l.status in ('qualified', 'won')), 0)::bigint
                                                                as val_expected,
      -- Won value from priced events only. ROI is computed from this against
      -- ev_spend so that its numerator and denominator describe the same shows.
      -- There is deliberately no matching "priced spend" column: an unpriced
      -- event contributes 0 to total_cost_paisa, so the sum over priced events
      -- and the sum over all selected events are the same number.
      coalesce(sum(l.deal_value_paisa) filter (where l.status = 'won' and p.is_priced), 0)::bigint
                                                                as val_won_priced
    from picked p
    left join public.leads l on l.event_id = p.id
  )

  select s.ev_count,
         g.ct_total,
         g.ct_today,
         g.ct_won_deals,
         g.ct_new,
         g.ct_contacted,
         g.ct_qualified,
         g.ct_won,
         g.ct_lost,
         g.ct_voice,
         g.ct_needs_note,
         g.ct_consent,
         case when v_is_admin then g.val_won        else null end,
         case when v_is_admin then g.val_expected   else null end,
         case when v_is_admin then s.ev_spend       else null end,
         -- Not money itself, but it exists only to say how much of the money
         -- figure is real. Returned to an admin only, so a rep is never shown
         -- an unexplained "4 of 6" beside a card with no ROI on it.
         case when v_is_admin then s.ev_priced      else null end,
         case when v_is_admin then g.val_won_priced else null end
  from spend_agg s
  cross join lead_agg g;
end;
$$;

revoke execute on function public.event_set_stats(uuid[]) from public, anon;
grant  execute on function public.event_set_stats(uuid[]) to authenticated;

comment on function public.event_set_stats(uuid[]) is
  'Aggregate totals across a set of events. Counts are visible to a caller who is a member of every event in the set; money is admin-only and returns NULL otherwise. Raises unless every requested event belongs to the caller''s organisation.';
