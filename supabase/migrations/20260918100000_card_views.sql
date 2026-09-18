-- Phase 3 — who reached a rep's digital card.
--
-- The Team table has shown a Leads column and nothing else since it was built,
-- and PENDING 48 asks for the number beside it: how many people got to this
-- person's card. Nothing counted anything until now.
--
-- ---------------------------------------------------------------------------
-- What this does NOT count, and why that has to be said out loud
--
-- It does not count QR scans. All four QR codes in the app encode a vCard, not
-- a URL — the scanner's phone decodes the text itself and saves a contact
-- without a single request leaving it. That is deliberate (see the note on
-- app/(app)/(tabs)/qr.tsx: an exhibition hall is where this gets used and where
-- the wifi is worst), and it is also the reason a scan is unobservable. No
-- amount of schema fixes that.
--
-- So what lands here is someone opening the LINK — from WhatsApp, SMS, email,
-- the share sheet or a pasted copy, all of which already carry the URL. A rep
-- who only ever holds up their phone at a stand will show zero, correctly.
-- Whatever the column ends up being called, it cannot be called scans.
--
-- ---------------------------------------------------------------------------
-- A row per person per day, not a counter
--
-- A bare integer on business_cards cannot answer "how many this month" or
-- "which show", which are the two questions that follow immediately. Rows can.
--
-- The grain is one row per (card, visitor, day), enforced by a unique index and
-- an ON CONFLICT DO NOTHING. That is what makes the figure distinct PEOPLE
-- rather than page loads, and it caps a refresher — or someone hammering the
-- endpoint — at one row a day without needing a rate-limit table or an IP,
-- neither of which this database has.
--
-- The cost, recorded because it is not reversible: repeat opens within a day
-- are discarded, so a total-opens figure can never be reconstructed from this
-- table. Wanting that later means another migration and a gap in the data.
create table if not exists public.card_views (
  id              uuid primary key default gen_random_uuid(),

  -- Nullable, and SET NULL rather than CASCADE on purpose. Deleting a card must
  -- not silently wipe its owner's history and drop their column back to zero.
  card_id         uuid references public.business_cards(id) on delete set null,

  -- The thing actually being counted. business_cards carries no organization_id,
  -- so both of these are read off profiles inside record_card_view().
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,

  -- A random id the visitor's browser keeps. Not an identity and not derived
  -- from one: no IP, no fingerprint, nothing that outlives their local storage.
  visitor_hash    text not null,

  source          text not null default 'link',
  viewed_at       timestamptz not null default now(),
  viewed_on       date not null default (now() at time zone 'utc')::date,

  -- Every channel that can be written has to be listed here or the insert
  -- throws in a visitor's face. record_card_view() coerces anything else to
  -- 'link' so that cannot happen, and this is the second gate.
  constraint card_views_source check (
    source in ('link', 'qr', 'wa', 'sms', 'email', 'share', 'copy')
  ),
  constraint card_views_visitor_len check (char_length(visitor_hash) between 16 and 64),

  constraint card_views_once_a_day unique (card_id, visitor_hash, viewed_on)
);

create index on public.card_views (organization_id, viewed_on);
create index on public.card_views (profile_id, viewed_on);

comment on table public.card_views is
  'One row per person per card per day who opened a public /c/{slug} page. Written only by record_card_view(). Does NOT include QR scans: the QR carries a vCard, which never reaches a server.';
comment on column public.card_views.visitor_hash is
  'Random id from the visitor''s browser storage. Not an identity, not derived from one — it exists so a refresh is not a second person.';
comment on column public.card_views.card_id is
  'Null once the card is deleted. The count stays with profile_id.';

alter table public.card_views enable row level security;

-- Same shape as leads_select_own_or_admin, and for the same reason: a rep may
-- see their own numbers and no one else's. Without the profile_id half, a rep
-- could read a colleague's viewer rows straight off the table and reconstruct
-- the count the Team screen deliberately withholds.
create policy "card_views_select_own_or_admin" on public.card_views
  for select using (
    organization_id = (select public.current_organization_id())
    and (profile_id = (select auth.uid()) or (select public.is_admin()))
  );

-- No insert, update or delete policy anywhere: the only writer is the definer
-- function below, and nothing should ever edit a view after the fact.

-- Supabase ships `alter default privileges ... grant all on tables to anon,
-- authenticated`, so this table already carried anon=arwdDxtm the moment it
-- existed — RLS and GRANT are separate gates and this project has been caught
-- by that before. Revoke first, then hand back only the read.
revoke all on public.card_views from anon, authenticated;
grant select on public.card_views to authenticated;


-- ===========================================================================
-- The write. The first thing `anon` has ever been allowed to write.
-- ===========================================================================
--
-- Every other anon entry point in this schema is a read: the granted columns on
-- business_cards, the card-photos bucket, peek_invite and signup_conflict. There
-- is no insert, update or delete policy reachable by anon anywhere, and this
-- does not add one. anon gets no grant on card_views at all — only EXECUTE on
-- this function. There is no policy to get wrong, no way to write a row against
-- a card that does not exist, and no way to choose what the row says.
--
-- ---------------------------------------------------------------------------
-- What opening this to anon lets someone do, and what keeps it narrow
--
-- Someone holding the publishable key and a slug they already know can add
-- noise rows to that card's count. That is the whole of it, and the unique
-- index caps it at one row per visitor id per day — inflating a number visibly
-- means minting thousands of visitor ids, which is work for the privilege of
-- lying to a stranger's dashboard about their own card.
--
-- What it cannot do: read anything back (no grant, and RLS would refuse
-- anyway), learn whether a slug exists (a hit and a miss are both silence),
-- write against an unpublished card, or set profile_id, organization_id or
-- viewed_at — all four are resolved in here, never passed in.
create or replace function public.record_card_view(
  p_slug    text,
  p_visitor text,
  p_source  text default 'link'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_card_id uuid;
  v_profile uuid;
  v_org     uuid;
  v_source  text;
begin
  -- A visitor id that is not the shape the page issues is dropped rather than
  -- stored. crypto.randomUUID() is 36 characters of hex and dashes.
  if p_visitor is null
     or char_length(p_visitor) < 16
     or char_length(p_visitor) > 64
     or p_visitor !~ '^[A-Za-z0-9-]+$' then
    return;
  end if;

  select bc.id, bc.profile_id, p.organization_id
    into v_card_id, v_profile, v_org
    from public.business_cards bc
    join public.profiles p on p.id = bc.profile_id
   where bc.slug = p_slug
     and bc.is_published;

  -- No such card, or its owner switched it off. Silence rather than an error:
  -- fetchPublicCard() already treats those two as one case on the grounds that
  -- whether a link has ever existed is not a stranger's business, and an error
  -- message here would answer exactly that question.
  if v_card_id is null then
    return;
  end if;

  -- The owner reloading their own page is not a visitor. auth.uid() is null for
  -- a stranger, and `null = uuid` is null, so this never fires for one.
  if auth.uid() = v_profile then
    return;
  end if;

  v_source := coalesce(nullif(btrim(lower(p_source)), ''), 'link');
  if v_source not in ('link', 'qr', 'wa', 'sms', 'email', 'share', 'copy') then
    v_source := 'link';
  end if;

  insert into public.card_views (card_id, profile_id, organization_id, visitor_hash, source)
  values (v_card_id, v_profile, v_org, p_visitor, v_source)
  on conflict on constraint card_views_once_a_day do nothing;
end;
$$;

-- CREATE FUNCTION grants EXECUTE to PUBLIC by default. `anon` is granted here on
-- purpose — the caller is a stranger with a link — but PUBLIC has to be revoked
-- first all the same, the trap documented on peek_invite and signup_conflict.
revoke execute on function public.record_card_view(text, text, text) from public;
grant  execute on function public.record_card_view(text, text, text) to anon, authenticated;

comment on function public.record_card_view(text, text, text) is
  'Records that somebody opened a published card. Returns nothing, says nothing about whether the slug exists, and ignores the card owner''s own visits. The only writer of card_views.';


-- ===========================================================================
-- The read, for the Team table.
-- ===========================================================================
--
-- Both counts in one call, because the lead count was being done on the device:
-- fetchTeam() selected captured_by for every lead in the organisation and
-- reduced it in JavaScript, which PostgREST silently truncates at 1000 rows. So
-- the Leads column was already wrong on a busy organisation, and a second
-- column built the same way would have inherited it.
--
-- Visibility follows event_leaderboard: every member gets a row, and the
-- columns a rep may not see come back NULL rather than the rows disappearing.
-- That is what TeamMember.leadCount's `number | null` already means — null is
-- "you are not allowed to know", which the table draws as a dash, and zero is
-- "they have captured nothing".
create or replace function public.team_counts()
returns table (profile_id uuid, lead_count bigint, viewer_count bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org      uuid    := public.current_organization_id();
  v_is_admin boolean := public.is_admin();
  v_me       uuid    := auth.uid();
begin
  -- Signed out, or deactivated: current_organization_id() requires an active
  -- profile. Return no rows rather than raising.
  if v_org is null then
    return;
  end if;

  return query
  select p.id,
         case when v_is_admin or p.id = v_me then (
           select count(*)::bigint
             from public.leads l
            where l.captured_by = p.id
              and l.organization_id = v_org
         ) end,
         -- Distinct people, not visits — the row grain is already one a day, so
         -- this collapses somebody who came back next week onto one person.
         case when v_is_admin or p.id = v_me then (
           select count(distinct cv.visitor_hash)::bigint
             from public.card_views cv
            where cv.profile_id = p.id
         ) end
    from public.profiles p
   where p.organization_id = v_org;
end;
$$;

-- Revoking PUBLIC alone would leave `anon` holding an explicit ACL entry from
-- Supabase's default privileges, so both are named. This one is for members.
revoke execute on function public.team_counts() from public, anon;
grant  execute on function public.team_counts() to authenticated;

comment on function public.team_counts() is
  'Per-member lead and card-viewer counts for the caller''s organisation. A rep sees only their own; everyone else''s columns come back NULL. Replaces counting leads on the device, which PostgREST truncated at 1000 rows.';
