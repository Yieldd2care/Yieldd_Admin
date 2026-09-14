-- 33c — a Skip option on every onboarding screen.
--
-- Skipping the fork has to be *recorded*, or it is not a skip. nextRouteAfterAuth()
-- ends with
--
--     return user.onboardingIntent ? home() : '/(app)/onboarding/fork';
--
-- so an admin whose organisation has a null onboarding_intent is sent back to
-- the fork after every single sign-in. A Skip button that writes nothing
-- therefore reappears forever, which reads as the button not working.
--
-- 'skipped' goes in this column rather than in a second flag elsewhere because
-- it is a genuine third answer to the question the fork asks — "neither, don't
-- ask me" — and because the routing rule above already treats any non-null
-- value as "this org has answered". No reader has to change.
--
-- The constraint added in 20260827130400 rejects it, so widen that constraint.
-- Additive only: every existing row still passes, so this cannot fail on live
-- data. Rehearsed in a rolled-back transaction before push.
--
-- The column-level GRANT from 20260827130400 already covers onboarding_intent,
-- so no new grant is needed here.

alter table public.organizations
  drop constraint if exists organizations_onboarding_intent_valid;

alter table public.organizations
  add constraint organizations_onboarding_intent_valid
    check (onboarding_intent is null or onboarding_intent in ('team', 'solo', 'skipped'));

comment on column public.organizations.onboarding_intent is
  'Which branch of the fork screen this org chose: team -> event creation, solo -> digital card, skipped -> the admin declined to answer. Null means the fork has not been shown yet, and is the only thing that makes it appear again on the next sign-in.';
