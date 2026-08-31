-- Weekly digest (TASKS 6.6) — the retention mechanism.
--
-- MVP_PLAN: the app is used ~15 days a year, and for the other ~340 this email
-- is the only thing keeping Yieldd in the customer's mind. It has to read as
-- useful on its own, without logging in:
--
--   "IMTEX: 312 leads · 41 contacted this week · 12 pending · 1 won (₹4.2L) ·
--    ROI 35% recovered"
--
-- Two pieces here: a column that makes sending idempotent, and a service-role
-- aggregate that produces the numbers.

-- ---------------------------------------------------------------------------
-- 1. The idempotency guard
-- ---------------------------------------------------------------------------
-- The sending account is care@yieldd.co, which is also the support inbox.
-- Exceeding Google's daily cap suspends that account's sending for 24 hours, so
-- a bug that sends in a loop does not just spam customers - it takes support
-- mail down with it. Normal volume is nowhere near the cap; a loop is.
--
-- This column is the defence that cannot be bypassed by a retry, a double
-- schedule, or two function instances racing: the send is claimed in the
-- database BEFORE the email goes out, and the claim is conditional on the last
-- one being old enough. Same shape as the device-generated lead ids - a replay
-- collides instead of duplicating.
alter table public.organizations
  add column if not exists last_digest_sent_at timestamptz;

comment on column public.organizations.last_digest_sent_at is
  'When the weekly digest last went out. Claimed before sending, so a retry or a duplicate schedule cannot double-send.';

-- ---------------------------------------------------------------------------
-- 2. Claim the send
-- ---------------------------------------------------------------------------
-- Returns true only for the caller that actually won the row. `for update` plus
-- the interval check means two concurrent runs cannot both get true.
create or replace function public.claim_weekly_digest(
  p_organization_id uuid,
  p_min_interval interval default interval '6 days'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last timestamptz;
begin
  select last_digest_sent_at into v_last
  from public.organizations
  where id = p_organization_id
  for update;

  if not found then
    return false;
  end if;

  if v_last is not null and v_last > now() - p_min_interval then
    return false;
  end if;

  update public.organizations
  set last_digest_sent_at = now()
  where id = p_organization_id;

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. The numbers
-- ---------------------------------------------------------------------------
-- Deliberately NOT event_stats(): that one authorises against
-- current_organization_id(), which is null for a scheduled job running as the
-- service role, and it has no notion of "this week".
--
-- One row per organisation that has something worth reporting. An organisation
-- with no leads is skipped entirely rather than emailed "0 leads" - a digest
-- that says nothing happened is a reason to unsubscribe.
create or replace function public.weekly_digest_rows()
returns table (
  organization_id   uuid,
  organization_name text,
  event_id          uuid,
  event_name        text,
  total_leads       bigint,
  contacted_week    bigint,
  pending_followups bigint,
  deals_won         bigint,
  won_value_paisa   bigint,
  spend_paisa       bigint,
  last_sent_at      timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  with latest_event as (
    -- The show being reported on: the most recent one that actually has leads.
    -- distinct on picks one row per organisation.
    select distinct on (e.organization_id)
      e.organization_id, e.id, e.name, e.total_cost_paisa
    from public.events e
    where exists (select 1 from public.leads l where l.event_id = e.id)
    order by e.organization_id, e.start_date desc, e.created_at desc
  )
  select
    o.id,
    o.name,
    le.id,
    le.name,
    count(l.id),
    count(l.id) filter (
      where exists (
        select 1 from public.lead_activity la
        where la.lead_id = l.id and la.created_at >= now() - interval '7 days'
      )
    ),
    count(l.id) filter (
      where l.follow_up_date is not null
        and l.follow_up_date <= current_date
        and l.status not in ('won', 'lost')
    ),
    count(l.id) filter (where l.status = 'won'),
    coalesce(sum(l.deal_value_paisa) filter (where l.status = 'won'), 0),
    coalesce(le.total_cost_paisa, 0),
    o.last_digest_sent_at
  from public.organizations o
  join latest_event le on le.organization_id = o.id
  join public.leads l on l.event_id = le.id
  group by o.id, o.name, le.id, le.name, le.total_cost_paisa, o.last_digest_sent_at
  having count(l.id) > 0;
$$;

-- Both are for the scheduled job only. CREATE FUNCTION grants EXECUTE to PUBLIC
-- by default, and these read every organisation's figures - so revoke from
-- `public` AND `anon` explicitly. Revoking anon alone is a no-op because the
-- PUBLIC grant covers everyone regardless. This project has hit that trap four
-- times now (find_duplicate_lead, suggest_card_slug, and the notes in
-- 20260827140000 / 20260829130000).
revoke execute on function public.claim_weekly_digest(uuid, interval) from public, anon, authenticated;
grant  execute on function public.claim_weekly_digest(uuid, interval) to service_role;

revoke execute on function public.weekly_digest_rows() from public, anon, authenticated;
grant  execute on function public.weekly_digest_rows() to service_role;
