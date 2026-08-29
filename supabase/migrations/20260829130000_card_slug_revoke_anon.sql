-- The link functions were reachable by `anon`. Found by scripts/verify-business-card.mjs,
-- which asserted the refusal instead of trusting the previous migration's revoke.
--
-- 20260829120000 did `revoke execute … from public` and granted `authenticated`,
-- which is the shape A2 established for find_duplicate_lead. It was half the
-- job. Supabase ships `alter default privileges … grant execute on functions
-- to anon`, so a newly created function carries an EXPLICIT `anon=X` entry in
-- its ACL from the moment it exists. Revoking the PUBLIC grant does not touch
-- that entry, and the ACL after the last migration read:
--
--   {postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--
-- So the trap runs in both directions, and A2's note only recorded one of
-- them: revoking from `anon` alone leaves PUBLIC, and revoking from PUBLIC
-- alone leaves `anon`. Both have to be named.
--
-- What it exposed: a visitor to a hosted card page could enumerate which card
-- links exist — including unpublished ones, which RLS otherwise hides — and
-- could burn database time generating suggestions. Neither reveals a person's
-- details, which is why this is a tightening rather than an incident, but a
-- namespace probe is not something a page's readers are entitled to.

revoke execute on function public.business_card_slug_available(text) from anon;
revoke execute on function public.suggest_card_slug(text)            from anon;
