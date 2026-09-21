-- PENDING #56 — "is this a real organisation?", asked once, in one place.
--
-- `signInWithOtp` creates the auth user the moment the code is SENT, not when
-- it is entered (lib/auth/emailCode.ts says so at length, because the invite
-- token depends on it). So `handle_new_user()` fires at send time and creates
-- an organisation and a profile for someone who may never type the code. Five
-- such organisations were made and deleted by hand while testing #33a on
-- 2026-09-14.
--
-- Nothing is broken by them. RLS scopes every one of those rows to a user who
-- never comes back, so they are invisible to everybody, and `npm run verify:otp`
-- clears up the ones it creates. The single thing they do break is a question
-- nobody has asked yet: "how many customers do we have?" — because the obvious
-- way to answer it is `select count(*) from organizations`, and that number is
-- wrong by one per abandoned signup.
--
-- This migration makes the right way to ask it exist, before anyone writes the
-- wrong way. It adds nothing to the signup path and removes nothing at all.
--
-- ---------------------------------------------------------------------------
-- Why this derives and does not delete
--
-- PENDING listed three options. The two that were rejected, and why:
--
--   * A periodic sweep that deletes organisations with no members and no
--     events. REJECTED, and it should stay rejected. An abandoned signup and a
--     real customer who has not finished onboarding are the same row shape —
--     `organizations('My workspace')` plus one incomplete profile — and this
--     project has no rollback net. The day the predicate is slightly wrong,
--     real organisations are gone with nothing to restore them from. That risk
--     buys nothing, because nothing is broken today. If a sweep is ever
--     genuinely wanted, the view below is exactly the predicate it would need,
--     already written and already reviewed; the complement is
--         select id from public.organizations
--          where id not in (select id from public.real_organizations);
--     and the person running it still has to look at what comes back first.
--
--   * A `provisional` flag written by `handle_new_user()` and cleared when
--     complete-profile finishes. REJECTED because of where that trigger runs.
--     GoTrue rewrites EVERY exception raised inside it into a 500 carrying the
--     fixed string "Database error saving new user" — the whole reason
--     20260914150000 had to add signup_conflict() to ask afterwards what the
--     error would not say. A new write in that trigger risks breaking live
--     signup for everyone, and the failure arrives as an unreadable 500. The
--     OTP signup path is live. It is load-bearing, and it is not worth touching
--     for a counting problem that can be solved by reading.
--
-- Deriving costs nothing to reverse: `drop view public.real_organizations`.
--
-- ---------------------------------------------------------------------------
-- What "completed" means on this schema
--
-- Not a guess — it is the app's own rule, and the two must not drift:
--
--     types/session.ts  profileNeedsCompletion(user)
--       => !user.phone || user.name === PLACEHOLDER_NAME
--
-- so a profile is complete when it has a phone number AND its name is no longer
-- the placeholder. Both halves are load-bearing, for the reason that file gives:
-- an emailed-code signup arrives with a null phone today, so the first test
-- happens to catch it, but that stops being true the moment anything saves a
-- number without a name.
--
-- 'New user' is PLACEHOLDER_NAME from lib/placeholders.ts, repeated here because
-- SQL cannot import it. It is the only constant this file duplicates, and that
-- is deliberate — `organizations.name = 'My workspace'` (PLACEHOLDER_ORG) is NOT
-- tested below, because the only screen that renames an organisation sits behind
-- the completion guard, so a renamed org already has a completed profile and the
-- second duplicated constant would buy nothing.
--
-- ---------------------------------------------------------------------------
-- The other arms, and why the definition is deliberately generous
--
-- A completed profile is the primary test, but it is not the only evidence that
-- a human came back. The arms below are OR'd, and the bias is towards counting
-- an organisation as real:
--
--   * A false positive costs one row in a number nobody bills against.
--   * A false negative is a paying customer who does not appear in the count.
--
-- Every arm is something an abandoned signup provably cannot have, because an
-- abandoned signup consists of precisely what handle_new_user() wrote and
-- nothing else: one organisation named 'My workspace' with a null
-- onboarding_intent, and one profile named 'New user' with a null phone.
--
-- `referral_source` is evidence only when it is NOT 'predates'. That value was
-- backfilled onto every organisation alive on 2026-09-14 by 20260914120000, so
-- it records that the question was never asked, not that anyone answered it.
-- Reading it as an answer would make the arm true for every old row and tell us
-- nothing. `onboarding_intent` needs no such exclusion — it was never
-- backfilled, so any non-null value, 'skipped' included, means someone reached
-- the fork screen, which is behind the completion guard anyway.
--
-- ---------------------------------------------------------------------------
-- What this honestly does NOT catch
--
-- An abandoned signup through the old email+password form. That form collected
-- a name, a company and a number before it submitted, so the row it leaves
-- behind has a completed profile and is indistinguishable from a real customer
-- who signed up and never opened the app again. No predicate can separate those
-- two, which is the same fact that makes a delete sweep unsafe. #56 is about
-- the code path, and the code path is what this reads.
--
-- ---------------------------------------------------------------------------
-- Who may read it
--
-- service_role only. Both of the other roles are revoked explicitly, and for
-- two different reasons:
--
--   * anon — an organisation count is not public, and unlike signup_conflict()
--     there is no forced trade here. That function accepted enumeration
--     exposure because the alternative was every duplicate-number signup dying
--     against an error naming the wrong cause. Nothing is lost by refusing anon
--     this, so it is refused.
--
--   * authenticated — this one matters more, because it looks harmless. The
--     view is `security_invoker = true`, so RLS still applies to whoever reads
--     it, and `org_select_members` scopes `organizations` to the caller's own
--     row. A signed-in person counting this view would therefore get 1, or 0,
--     and it would look like an answer. That is the same trap as counting a
--     rep's leads on the device: the aggregate comes back as a silent fraction
--     of the truth with no error anywhere. Staff counting customers hold the
--     service_role key and bypass RLS, which is the only way the number is
--     right.
--
-- The revoke has to name both roles and PUBLIC. Supabase's ALTER DEFAULT
-- PRIVILEGES grants anon, authenticated and service_role on anything `postgres`
-- creates in `public`, so this view arrives readable by the anon key unless
-- that is taken back — the same trap 20260827130100 documents for functions,
-- reached by a different route.
--
-- `security_invoker = true` also keeps `supabase db lint` quiet: a view without
-- it runs as its owner and is flagged as a security-definer view. It is set
-- here even though service_role bypasses RLS regardless, so that the day
-- somebody widens the grant they widen it onto a view that still respects RLS
-- rather than one that hands out every organisation in the database.
--
-- ---------------------------------------------------------------------------
-- One maintenance note
--
-- The columns are listed out rather than `o.*` on purpose: Postgres expands `*`
-- once, at creation, so a `select o.*` view silently stops showing columns added
-- to `organizations` afterwards. Four columns are enough to count and to group
-- by; anything else joins back to `organizations` on `id`.
--
-- Not rewired into anything, because nothing counts organisations yet. Every
-- `count(*) from public.organizations` in the repo is a leak assertion in a
-- verify script — a before/after delta proving the script cleaned up after
-- itself — and those must keep counting every row, abandoned ones included, or
-- they stop detecting the leak they exist to detect. The one other place that
-- asks this question informally is scripts/verify-otp-signup.mjs, which picks a
-- host organisation for the invite test with `o.name <> 'My workspace'`. That is
-- a fixture lookup rather than a count, and it is left alone deliberately —
-- rewiring a live signup test to prove a point is not worth it.
-- ---------------------------------------------------------------------------

create or replace view public.real_organizations
with (security_invoker = true) as
select o.id,
       o.name,
       o.plan_tier,
       o.created_at
  from public.organizations o
 where
   -- Somebody finished setting themselves up. The primary test; the rest are
   -- here so that an old or unusual account cannot fall out of the count.
   exists (
     select 1
       from public.profiles p
      where p.organization_id = o.id
        and p.phone is not null
        and p.full_name <> 'New user'
   )
   -- A second member. Only an accepted invite can put one in an organisation,
   -- and only an admin who got into the app can send one.
   or (select count(*) from public.profiles p where p.organization_id = o.id) > 1
   -- An invite was sent, whatever became of it.
   or exists (select 1 from public.invites i where i.organization_id = o.id)
   -- Work happened.
   or exists (select 1 from public.events e where e.organization_id = o.id)
   or exists (select 1 from public.leads l where l.organization_id = o.id)
   -- Money happened, now or at any point. plan_tier alone would miss an
   -- organisation that paid and then lapsed back to free.
   or o.plan_tier <> 'free'
   or exists (select 1 from public.subscriptions s where s.organization_id = o.id)
   or exists (select 1 from public.payments pay where pay.organization_id = o.id)
   -- An onboarding question was answered, which means somebody came back after
   -- the code was sent and typed it. 'predates' is a backfill, not an answer.
   or o.onboarding_intent is not null
   or (o.referral_source is not null and o.referral_source <> 'predates');

revoke all on public.real_organizations from public, anon, authenticated;
grant select on public.real_organizations to service_role;

comment on view public.real_organizations is
  'Organisations that a person actually set up, as opposed to the empty one handle_new_user() leaves behind when a signup code is sent and never entered (PENDING #56). Count THIS, not public.organizations, to answer "how many customers do we have?". Readable by service_role only: under RLS a signed-in caller would count their own row and get 1, which looks like an answer and is not. Nothing is ever deleted on the strength of this view — see the header of its migration for why a sweep was rejected.';
