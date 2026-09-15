-- The CSV export carries deal value again, as TWO columns, and only for an admin.
--
-- Reported as PENDING 47. The export already offered a "Deal value" tick, and
-- `lib/api/exportLeads.ts` wrote `deal_value_paisa` straight out of the row with
-- no admin check anywhere in the path. Both export screens rendered that tick
-- without reading `role`, and a rep reaches them on three ungated routes, so a
-- rep could export deal values for every lead RLS lets them read.
--
-- That contradicts the rule event_stats, event_set_stats and event_leaderboard
-- already enforce here rather than in the client: how many leads the stall took
-- is something the team can see, what the deals were worth is the admin's
-- business. This function is the export's share of that rule.
--
-- ---------------------------------------------------------------------------
-- Why `security invoker`, when every other function in this directory is definer
-- ---------------------------------------------------------------------------
--
-- event_stats is definer BECAUSE it has to widen visibility: a rep must get the
-- event's real total, not the fraction of it they captured.
--
-- The export needs the exact opposite. A rep exports their own leads and an
-- admin exports the organisation's, which is correct behaviour and not a
-- limitation to work around. Under `security definer` RLS would be bypassed and
-- `leads_select_own_or_admin` would have to be copied into the body by hand --
-- and one mistake in that copy turns an export into a whole-organisation data
-- leak. Invoker keeps exactly one copy of the rule, and `voice_notes_select`
-- goes on applying to the transcript join for free.
--
-- Invoker needs `authenticated` to hold SELECT on public.leads. It does: the
-- plain .from('leads').select() this replaces works for a rep today, and leads
-- carries table-level grants (the column-level GRANT trap documented in
-- 20260827130400_organization_category.sql is specific to public.organizations).
--
-- ---------------------------------------------------------------------------
-- What the two money columns mean
-- ---------------------------------------------------------------------------
--
-- Copied from 20260902140000_qualified_deal_value.sql so the CSV and the ROI
-- screen cannot drift apart:
--
--   expected  status is `qualified` OR `won`. Won is included deliberately: a
--             won deal was qualified first, and dropping it on close would make
--             the expected figure fall every time the team succeeded. A number
--             that goes down when things go right reads as a bug.
--   won       status is `won` alone.
--   lost      in neither. A value on a lead that went nowhere is not pipeline.
--
-- So per row: a qualified lead fills Expected and leaves Won blank; a won lead
-- fills both. One combined column that mixes a forecast with a closed deal is
-- how a finance team gets misled, which is the whole point of the report.
--
-- `deal_closed_at` is returned only for `won`. A qualified lead has no closing
-- date, and the deal-value sheet deliberately preserves the old date when a won
-- lead is re-qualified, so without this the file would print a closing date
-- beside an empty Won cell.
--
-- `money_visible` says WHY the three columns are blank: false means the caller
-- was never allowed them, true means this particular lead has none. The client
-- uses it to drop the headers entirely rather than print empty columns, so the
-- decision stays here and no caller has to ask who it is. Same idea as
-- `canSeeMoney` on event_stats.

create or replace function public.export_leads(
  p_event_id        uuid        default null,
  p_from            timestamptz default null,
  p_to              timestamptz default null,
  p_won_only        boolean     default false,
  p_with_transcript boolean     default false
)
returns table (
  created_at           timestamptz,
  full_name            text,
  designation          text,
  company              text,
  phone                text,
  email                text,
  company_landline     text,
  company_website      text,
  company_address      text,
  branch_address       text,
  status               lead_status,
  follow_up_date       date,
  note                 text,
  consent_given        boolean,
  money_visible        boolean,
  expected_value_paisa bigint,
  won_value_paisa      bigint,
  deal_closed_at       timestamptz,
  voice_summary        text,
  voice_transcript     text,
  custom_field_values  jsonb
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_is_admin boolean := public.is_admin();
begin
  return query
  select
    l.created_at,
    l.full_name,
    l.designation,
    l.company,
    l.phone,
    l.email,
    l.company_landline,
    l.company_website,
    l.company_address,
    l.branch_address,
    l.status,
    l.follow_up_date,
    l.note,
    l.consent_given,

    v_is_admin,
    case when v_is_admin and l.status in ('qualified', 'won')
      then l.deal_value_paisa else null end,
    case when v_is_admin and l.status = 'won'
      then l.deal_value_paisa else null end,
    case when v_is_admin and l.status = 'won'
      then l.deal_closed_at else null end,

    v.summary,
    v.transcript,
    l.custom_field_values
  from public.leads l
  -- LATERAL ... limit 1, never a plain left join on voice_notes: a lead with two
  -- notes would be emitted twice and the file would carry a duplicate row that
  -- nobody would read as an export bug. The nested select this replaces took
  -- voice_notes[0] in whatever order PostgREST happened to return; ordering here
  -- makes that choice deterministic instead.
  left join lateral (
    select vn.summary, vn.transcript
    from public.voice_notes vn
    where p_with_transcript and vn.lead_id = l.id
    order by vn.created_at asc
    limit 1
  ) v on true
  where (p_event_id is null or l.event_id = p_event_id)
    and (not coalesce(p_won_only, false) or l.status = 'won')
    and (p_from is null or l.created_at >= p_from)
    and (p_to is null or l.created_at <= p_to)
  order by l.created_at asc;
end;
$$;

-- CREATE FUNCTION grants EXECUTE to PUBLIC by default, and revoking from PUBLIC
-- alone still leaves `anon` holding it through its own grant. Name both roles.
revoke execute on function public.export_leads(uuid, timestamptz, timestamptz, boolean, boolean)
  from public, anon;
grant execute on function public.export_leads(uuid, timestamptz, timestamptz, boolean, boolean)
  to authenticated;

comment on function public.export_leads(uuid, timestamptz, timestamptz, boolean, boolean) is
  'Lead rows for the CSV export. Which rows come back is decided by leads_select_own_or_admin, not by this function, which is why it is security invoker. The expected and won value columns and the close date are admin-only and return NULL otherwise; money_visible says whether the caller was allowed them at all.';
