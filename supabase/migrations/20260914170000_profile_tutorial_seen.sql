-- 33d — the first-run tutorial, and remembering it has been shown.
--
-- On profiles, NOT organizations, and that is the whole decision here. The
-- referral question (20260914120000) is an org-level fact: one organisation
-- heard about Yieldd once, and asking a second person from the same company
-- would be asking the same question twice. A tutorial is the opposite. It
-- teaches one person how the app works, so every rep an admin invites has to
-- get their own, and an admin finishing it must not silently consume it for
-- their whole team.
--
-- A timestamp rather than a boolean, for the same reason `accepted_at` is one
-- on invites: "when" answers "whether" for free, and it is the only way to tell
-- later whether people who joined in a given week actually saw it.

alter table public.profiles
  add column if not exists tutorial_seen_at timestamptz;

-- CRITICAL, and the same trap 20260827130400 documents for organizations —
-- `profiles` has a column-level UPDATE ACL too. Verified against the live
-- project before writing this: `authenticated` holds UPDATE on exactly
-- avatar_url, created_at, designation, email, full_name, id,
-- notifications_enabled, organization_id, phone, role, status, updated_at,
-- and nothing else. Column-level ACLs do NOT extend to columns added later, so
-- without the grant below, dismissing the tutorial fails with
--     42501: permission denied for table profiles
-- even though the row policy allows it — and because the tutorial is dismissed
-- in the background, that error would be swallowed and the tutorial would come
-- back on every single launch with nothing on screen to explain why.
grant update (tutorial_seen_at) on public.profiles to authenticated;

-- No new policy is needed: profiles_self_update already covers a person
-- writing their own row, which is the only write this column ever takes.
--
-- enforce_profile_update_rules() was read before adding this and does not
-- touch it. It guards id, organization_id, role, status and email only, so a
-- column outside that list passes through and simply gets updated_at stamped.

comment on column public.profiles.tutorial_seen_at is
  'When this person finished or skipped the first-run tutorial on Home (#33d). Null means it has not been shown yet, and is the only thing that makes it appear. Per person, not per organisation: an invited rep needs their own.';
