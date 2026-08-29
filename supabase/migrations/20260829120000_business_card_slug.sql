-- Phase 3 — claiming a public card link.
--
-- `business_cards.slug` is `not null unique` and is the whole of the public
-- URL, so the app has to be able to answer two questions before it writes a
-- row: is this link free, and if the obvious one is taken, what should I use
-- instead. Neither can be answered from the client.
--
-- RLS is the reason. `business_cards_public_read` exposes only PUBLISHED
-- cards and `business_cards_owner_manage` only the caller's own row, so an
-- unpublished card's slug is invisible to everyone but its owner. A
-- client-side `select … where slug = ?` would come back empty, the app would
-- report the link as available, and the insert would then fail 23505 — the
-- person would be told their chosen name was free and then that it was taken.
--
-- Both functions are `security definer` for that reason, and both apply the
-- same format rule as `business_cards_slug_format` so the two cannot drift.

-- ---------------------------------------------------------------------------
-- Is this link free?
--
-- "Free" includes a slug the caller already owns, so re-saving a card without
-- touching its link is not reported as a conflict with itself.
-- ---------------------------------------------------------------------------
create or replace function public.business_card_slug_available(p_slug text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    p_slug ~ '^[a-z0-9]([a-z0-9-]{0,58}[a-z0-9])?$'
    and not exists (
      select 1 from public.business_cards c
      where c.slug = p_slug
        and c.profile_id is distinct from auth.uid()
    );
$$;

-- ---------------------------------------------------------------------------
-- What link should this name get?
--
-- Server-side because the alternative is the client probing one candidate per
-- round trip on hall wifi.
-- ---------------------------------------------------------------------------
create or replace function public.suggest_card_slug(p_base text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base      text;
  v_candidate text;
  n           int := 1;
begin
  v_base := lower(coalesce(p_base, ''));
  v_base := regexp_replace(v_base, '[^a-z0-9]+', '-', 'g');
  v_base := trim(both '-' from v_base);
  -- 52 leaves room for the longest suffix below inside the 60-char limit.
  v_base := trim(both '-' from left(v_base, 52));

  -- An India-first product cannot assume a Latin name. 'महेश सिंह' and
  -- 'மகேஷ்' both reduce to the empty string here, which would violate
  -- business_cards_slug_format. They get an opaque but valid link rather than
  -- an error the person cannot act on.
  if v_base = '' then
    -- gen_random_uuid() rather than pgcrypto's gen_random_bytes(): pgcrypto
    -- lives in the `extensions` schema, which `set search_path = public`
    -- deliberately excludes. This one is in pg_catalog and always reachable.
    v_base := 'card-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  end if;

  v_candidate := v_base;
  while exists (
    select 1 from public.business_cards c
    where c.slug = v_candidate
      and c.profile_id is distinct from auth.uid()
  ) loop
    n := n + 1;
    if n > 12 then
      -- Twelve Priya Sharmas is where a counted suffix stops being a nice
      -- link and starts being a queue. Random from here.
      v_candidate := v_base || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
      exit;
    end if;
    v_candidate := v_base || '-' || n;
  end loop;

  return v_candidate;
end;
$$;

-- Revoking from `anon` alone changes nothing: the PUBLIC grant survives it.
-- Same trap A2 had to fix for find_duplicate_lead.
revoke execute on function public.business_card_slug_available(text) from public;
revoke execute on function public.suggest_card_slug(text)            from public;
grant  execute on function public.business_card_slug_available(text) to authenticated;
grant  execute on function public.suggest_card_slug(text)            to authenticated;

comment on function public.business_card_slug_available(text) is
  'Whether a card link can be claimed by the caller. Tells an authenticated user that a slug exists — which is inherent to a public URL namespace, and is the same thing every username check discloses.';
