-- A5 — Company category and the onboarding fork choice.
--
-- Decision: plain columns, not a lookup table. The 20 predefined categories in
-- stores/useCompanyStore.ts are a UI picker, user-added ones are free text,
-- there is exactly one per organisation, and nothing in the MVP reports across
-- organisations by category. A table would buy a join, a second RLS surface
-- and a seeding problem for no benefit. Normalise later if cross-org analytics
-- ever appear.

alter table public.organizations
  add column if not exists category          text,
  add column if not exists onboarding_intent text;

alter table public.organizations
  add constraint organizations_category_len
    check (category is null or char_length(category) between 1 and 60),
  add constraint organizations_onboarding_intent_valid
    check (onboarding_intent is null or onboarding_intent in ('team', 'solo'));

-- CRITICAL. The initial schema did:
--     revoke update on public.organizations from authenticated;
--     grant  update (name) on public.organizations to authenticated;
--
-- Column-level ACLs do NOT extend to columns added later. Without the grant
-- below, an admin updating category or onboarding_intent gets
--     42501: permission denied for table organizations
-- even though org_admin_update_name allows the row. Verified: `authenticated`
-- currently holds UPDATE on `name` and nothing else.
grant update (category, onboarding_intent) on public.organizations to authenticated;

-- The policy covers more than `name` now, so the name is misleading.
alter policy "org_admin_update_name" on public.organizations rename to "org_admin_update";

comment on column public.organizations.onboarding_intent is
  'Which branch of the fork screen this org chose: team -> event creation, solo -> digital card. Written once at signup; drives nothing else today but is the only record of intent.';
