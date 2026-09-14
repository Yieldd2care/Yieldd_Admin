-- 33b — "Where did you hear about us?"
--
-- Two plain text columns, mirroring onboarding_intent (20260827130400). Not a
-- lookup table: one answer per organisation, a fixed list of options, and
-- nothing joins on it. The same reasoning that file gives for `category`
-- applies unchanged here.
--
-- On organizations rather than profiles, deliberately. An invited rep did not
-- hear about Yieldd from anywhere — they were invited by their admin, and
-- nextRouteAfterAuth() already sends every non-admin straight home without
-- passing the question. Putting it on profiles would mean asking a rep where
-- they heard about a product they were handed.
--
--   referral_source  the top-level answer
--   referral_detail  the platform, when the answer was Social media or AI

alter table public.organizations
  add column if not exists referral_source text,
  add column if not exists referral_detail text;

-- The value list is enforced, and that is a deliberate trade with a known cost.
-- Confirmed with the user on 2026-09-14 that the seven options are final, which
-- is what buys the guard. If an eighth top-level option is ever added, adding it
-- to lib/referral.ts is NOT enough: it needs a SECOND MIGRATION to widen this
-- constraint, exactly as 20260914100000 had to do for onboarding_intent's
-- 'skipped'. Forget that half and the write is rejected at runtime, on an
-- onboarding screen, as an opaque error. `npm run verify:referral` compares this
-- list against lib/referral.ts for precisely that reason.
--
-- referral_detail gets a length check only, by contrast. The platform names
-- under Social media and AI discovery are the half that moves — a new AI tool
-- appears every few months — and they are not worth a migration each.
alter table public.organizations
  add constraint organizations_referral_source_valid
    check (referral_source is null or referral_source in
      ('google', 'social', 'ai', 'friends', 'colleague', 'event', 'other',
       'skipped', 'predates')),
  add constraint organizations_referral_detail_len
    check (referral_detail is null or char_length(referral_detail) between 1 and 60);

-- Every organisation that already exists predates the question and must never be
-- asked it. The routing rule is "has this org answered?", so a null column means
-- "ask again, forever" — without this line every existing admin would be stopped
-- by the question on their next sign-in, including the Growth Saga demo login,
-- mid-demo, in front of a prospect.
--
-- 'predates' rather than 'skipped' on purpose. A skip is someone declining to
-- answer, which is itself a signal; this is an org that was never asked. Rolling
-- the two together would quietly corrupt the only report this column exists for.
--
-- Safe as a one-off: the column was created three statements ago, so every row
-- is null and this initialises a new column rather than rewriting live data.
-- It must sit after the constraint above, and 'predates' must be in that
-- constraint's list, or the migration fails on its own update.
update public.organizations
   set referral_source = 'predates'
 where referral_source is null;

-- CRITICAL, and the same trap 20260827130400 documents at length. The initial
-- schema did:
--     revoke update on public.organizations from authenticated;
--     grant  update (name) on public.organizations to authenticated;
--
-- Column-level ACLs do NOT extend to columns added later. Without the grant
-- below, an admin answering the question gets
--     42501: permission denied for table organizations
-- even though org_admin_update allows the row — and lib/api/organization.ts
-- would report it as "Only an admin can change company settings.", which sends
-- the next person debugging this straight at the policy instead of the ACL.
grant update (referral_source, referral_detail) on public.organizations to authenticated;

comment on column public.organizations.referral_source is
  'Where this organisation heard about Yieldd, asked once after signup: google, social, ai, friends, colleague, event, other. skipped -> the admin declined to answer. predates -> the org existed before the question did and was never asked. Null means the question has not been answered yet, and is the only thing that makes the screen appear again on the next sign-in.';

comment on column public.organizations.referral_detail is
  'The platform named under Social media or AI discovery, stored verbatim (LinkedIn, ChatGPT, ...). Null for every other answer.';
