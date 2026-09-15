-- Why a signup was refused, asked as a separate question.
--
-- `profiles` has two unique columns — `email` (20260821061703 line 61) and
-- `phone` (line 62). GoTrue knows about the first: a repeat email is rejected
-- before handle_new_user() ever runs, with code `user_already_exists`, and
-- mapAuthError() turns that into a sentence. It knows nothing about the second.
-- A repeat phone therefore reaches the trigger, raises 23505 there, and GoTrue
-- rewrites it — as it rewrites EVERY exception raised inside that trigger —
-- into a 500 with no code and the fixed string "Database error saving new user".
--
-- The message is unrecoverable from. The app has been showing
--
--     "We could not finish setting up your account. If you followed an invite
--      link, ask for a fresh one."
--
-- which is a guess: a stale invite token is one cause, a duplicate phone is
-- another, and the person who hit the second one is sent to look for a problem
-- they do not have. Reported from the field on 2026-09-14.
--
-- Nothing can be fixed on the raising side — changing the text of the `raise`
-- in handle_new_user() does not help, because GoTrue discards it. So the client
-- asks afterwards, and this is what it asks.
--
-- ---------------------------------------------------------------------------
-- Exact equality, deliberately NOT phoneMatchKey()
--
-- `find_duplicate_lead` (20260831090000) compares the trailing ten digits,
-- because two humans typing the same number differently are the same person.
-- That is the wrong rule here. This function exists to explain a UNIQUE
-- violation, and that constraint compares the stored text exactly. Matching
-- more loosely would report "this number is taken" for a number that would in
-- fact have inserted cleanly — telling the user to change something that was
-- never the problem, which is the exact failure this migration is fixing.
--
-- The client normalises with normalizePhone() before both signUp and this call,
-- so the value compared here is the value that would have been written.
--
-- ---------------------------------------------------------------------------
-- Enumeration, and why this is an acceptable trade
--
-- Granting this to `anon` lets anyone holding the publishable key test whether
-- a given email or phone has an account. For email that changes nothing: GoTrue
-- already answers the same question at signup, by design, via
-- `user_already_exists`. For phone it is new exposure, and it is accepted
-- knowingly — the alternative is every duplicate-number signup dying against an
-- error that names the wrong cause.
--
-- What keeps it narrow: it returns two booleans and nothing else. No name, no
-- id, no organisation, no indication of whether the account is active. A caller
-- must already hold the exact value to learn anything, so it confirms a guess
-- and cannot be used to list anything.

create or replace function public.signup_conflict(p_email text, p_phone text)
returns table (email_taken boolean, phone_taken boolean)
language sql
security definer
set search_path = public
stable
as $$
  with asked as (
    select nullif(lower(btrim(coalesce(p_email, ''))), '') as e,
           nullif(btrim(coalesce(p_phone, '')), '')        as p
  )
  -- `pr.email = a.e` with a null `a.e` is null, never true, so an omitted
  -- argument reports false rather than matching every row.
  select exists (select 1 from public.profiles pr where pr.email = a.e),
         exists (select 1 from public.profiles pr where pr.phone = a.p)
  from asked a;
$$;

-- CREATE FUNCTION grants EXECUTE to PUBLIC by default. `anon` is granted here
-- on purpose — the caller is by definition not signed in yet — but PUBLIC has
-- to be revoked first all the same, the trap documented on find_duplicate_lead,
-- peek_invite and seats_in_use.
revoke execute on function public.signup_conflict(text, text) from public;
grant  execute on function public.signup_conflict(text, text) to anon, authenticated;

comment on function public.signup_conflict(text, text) is
  'Which of the two unique columns on profiles already holds these values. Returns booleans only — never a name, id or organisation. Called by the app after a signup fails with GoTrue''s opaque "Database error saving new user", so the message can name the real reason instead of guessing at a stale invite link.';
