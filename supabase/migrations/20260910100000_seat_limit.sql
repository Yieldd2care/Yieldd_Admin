-- PENDING #31 — seats become a real limit.
--
-- Until now the limit existed only as a sentence. `app/(app)/settings/team.tsx`
-- and `app/(dash)/team.tsx` both computed `seats_included + seats_purchased` on
-- the client and rendered a warning; `createInvites` and `handle_new_user()`
-- accepted anyone regardless. There was no RPC check, no constraint and no
-- trigger. A client-side check is a suggestion — anyone with the anon key and
-- curl could post an invite row straight past it — so the rule goes here.
--
-- DECISION (2026-09-10, from the product owner): **refuse the invite.** The
-- admin is stopped at the moment they try to send it, on the screen they are
-- already looking at. Two alternatives were considered and rejected:
--
--   * Refusing the SIGNUP instead. The wrong person hits the wall — an invitee
--     who was handed a link by a colleague — and they hit it inside
--     handle_new_user(), where GoTrue rewrites every exception into the opaque
--     "Database error saving new user". Unfixable from there.
--   * Not blocking at all and treating it as a billing conversation. Honest,
--     but it leaves the number on both team screens meaning nothing.
--
-- ---------------------------------------------------------------------------
-- What holds a seat
--
--   active profiles      — a deactivated member does NOT hold one. That already
--                          matches what both team screens count, and it is what
--                          makes "deactivate someone to free a seat" true.
--   pending invites      — one that is neither revoked nor expired.
--
-- Counting pending invites is the whole reason this lands at invite time rather
-- than at signup. Without it an admin with one free seat could send five
-- invites that all pass, and four people would later be refused at signup —
-- exactly the outcome the decision above rejects. With it, the fifth invite is
-- refused while the admin is still on the screen.
--
-- An accepted invite swaps one pending invite for one active profile, so the
-- total does not move and `handle_new_user()` needs no check of its own. That
-- is deliberate: once an admin has legitimately sent an invite, the person
-- holding it can always get in.
--
-- The one case that can still exceed the limit is a plan being reduced while
-- invites are outstanding. Those invites stay good — the alternative is
-- ambushing an invitee for something their admin did — and the organisation
-- shows as over its seats until it renews. That is the billing conversation,
-- and it is the only place one is left.
-- ---------------------------------------------------------------------------

create or replace function public.seats_in_use(p_org uuid)
returns int
language sql
security definer
set search_path = public
stable
as $$
  select
    (select count(*)
       from public.profiles
      where organization_id = p_org
        and status = 'active')
  + (select count(*)
       from public.invites
      where organization_id = p_org
        and status = 'pending'
        and expires_at > now());
$$;

-- CREATE FUNCTION grants EXECUTE to PUBLIC by default, and revoking from PUBLIC
-- alone still leaves `anon` holding it through its own grant — the trap
-- documented on find_duplicate_lead and peek_invite. Name both roles.
revoke execute on function public.seats_in_use(uuid) from public, anon;
grant  execute on function public.seats_in_use(uuid) to authenticated;

comment on function public.seats_in_use(uuid) is
  'Seats an organisation is occupying: active profiles plus pending, unexpired invites. A deactivated member holds none. Used by the invites seat-limit trigger and safe for a screen to call.';


create or replace function public.enforce_invite_seats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r       record;
  v_total int;
  v_used  int;
begin
  -- One firing per statement with the whole batch visible, rather than per row.
  -- A per-row BEFORE trigger cannot see the other rows of its own INSERT, so a
  -- five-row batch into a one-seat organisation would pass five times.
  for r in select distinct organization_id from new_rows loop
    select seats_included + seats_purchased
      into v_total
      from public.organizations
     where id = r.organization_id;

    -- The rows are already inserted at AFTER time, so this count includes them.
    v_used := public.seats_in_use(r.organization_id);

    if v_used > v_total then
      if v_total <= 1 then
        raise exception
          'Your plan includes one seat, and it is yours. Add seats before inviting anyone.'
          using errcode = '54000';
      else
        raise exception
          'That would use % of % seats. Deactivate a member, revoke a pending invite, or add seats.',
          v_used, v_total
          using errcode = '54000';
      end if;
    end if;
  end loop;

  return null;
end;
$$;

comment on function public.enforce_invite_seats() is
  'Refuses an invite that would take an organisation past its seats. Raises SQLSTATE 54000, which lib/api/invites.ts surfaces verbatim to the admin.';

drop trigger if exists invites_seat_limit on public.invites;

create trigger invites_seat_limit
  after insert on public.invites
  referencing new table as new_rows
  for each statement
  execute function public.enforce_invite_seats();
