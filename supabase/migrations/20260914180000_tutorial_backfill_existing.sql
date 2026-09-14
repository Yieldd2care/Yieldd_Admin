-- 33d — nobody who is already here gets taught the app they already use.
--
-- Separate from 20260914170000 because that one was already pushed. Keeping
-- the backfill in its own file is also the honest record: the column and the
-- decision about who it applies to are two different changes.
--
-- The rule is the user's, set on 2026-09-14 for the referral question
-- (20260914120000) and applied here for the same reason. A tutorial is for
-- someone seeing the app for the first time. Every profile that exists today
-- belongs to someone who has been using it for weeks, and one of them is the
-- Growth Saga demo login — which would otherwise stop and explain the app to
-- its owner in the middle of showing it to a prospect.
--
-- now() rather than a sentinel: the column means "when they finished with it",
-- and "when we decided they were finished with it" is close enough to true for
-- the only question it will ever be asked.
update public.profiles
   set tutorial_seen_at = now()
 where tutorial_seen_at is null;

-- Deliberately NOT a default on the column. A default would mean every new
-- profile is born having seen it, which is precisely backwards — the whole
-- mechanism depends on a new row arriving with null here.
