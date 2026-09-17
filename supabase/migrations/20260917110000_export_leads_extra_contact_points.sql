-- The CSV export carries a lead's further numbers, emails and job titles.
--
-- Three new returned columns, and nothing else changes: the row filter, the
-- money rules, the transcript join and `security invoker` are all copied from
-- 20260915130000 unchanged. Read that file for why any of them are the way
-- they are; this one only adds columns.
--
-- ---------------------------------------------------------------------------
-- Why this is a DROP and not a `create or replace`
--
-- `create or replace function` cannot change a RETURNS TABLE. Postgres refuses
-- with 42P13 "cannot change return type of existing function", and adding a
-- column to the returned table is exactly that. 20260831090000 hit the same
-- wall and recorded it. `npm run db:rehearse` catches it before a push, which
-- is what rehearsal is for.
--
-- The drop is what makes the GRANT block below mandatory rather than tidy: a
-- dropped function takes its ACL with it, and the CREATE that follows grants
-- EXECUTE to PUBLIC by default. Revoking from PUBLIC alone still leaves `anon`
-- holding it through its own grant, so both roles are named. This project has
-- been caught by that more than once.
--
-- ---------------------------------------------------------------------------
-- Why raw text[] and not a joined string
--
-- The joining is a presentation decision and it belongs in lib/exportRows.ts,
-- which is the file `verify:csv` and `verify:export` can compile on its own,
-- without React Native and without the network. Doing it here would bury the
-- separator in a function that needs a drop and a recreate to change, and put
-- it out of reach of the tests that check the file's shape.
--
-- Rehearsed in a rolled-back transaction against the live database before push.
-- ---------------------------------------------------------------------------

drop function if exists public.export_leads(uuid, timestamptz, timestamptz, boolean, boolean);

create function public.export_leads(
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
  extra_designations   text[],
  company              text,
  phone                text,
  extra_phones         text[],
  email                text,
  extra_emails         text[],
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
    l.extra_designations,
    l.company,
    l.phone,
    l.extra_phones,
    l.email,
    l.extra_emails,
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
  -- nobody would read as an export bug.
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

-- The drop above reset the ACL, and CREATE FUNCTION grants EXECUTE to PUBLIC by
-- default. Revoking from PUBLIC alone still leaves `anon` holding it through its
-- own grant, so both roles are named.
revoke execute on function public.export_leads(uuid, timestamptz, timestamptz, boolean, boolean)
  from public, anon;
grant execute on function public.export_leads(uuid, timestamptz, timestamptz, boolean, boolean)
  to authenticated;

comment on function public.export_leads(uuid, timestamptz, timestamptz, boolean, boolean) is
  'Lead rows for the CSV export. Which rows come back is decided by leads_select_own_or_admin, not by this function, which is why it is security invoker. The expected and won value columns and the close date are admin-only and return NULL otherwise; money_visible says whether the caller was allowed them at all. extra_phones, extra_emails and extra_designations come back as raw text[] - the joining into one cell is done in lib/exportRows.ts, where it is testable.';
