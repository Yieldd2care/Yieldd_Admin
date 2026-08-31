-- Duplicate detection (E4, TASKS.md 2.14) — make the match actually work.
--
-- The original find_duplicate_lead compared `l.phone = p_phone`, exact string
-- equality. But toInsert() in lib/api/leads.ts stores `input.phone?.trim()` with
-- no normalisation, so leads.phone holds whatever the rep typed. "9820441720",
-- "+91 98204 41720" and "98204 41720" are the same person and never matched.
-- The feature could not fire.
--
-- Fixed HERE rather than by normalising the stored column. normalizePhone() is
-- lossy by design — its catch-all `'+' || digits` turns an 8-digit landline into
-- +24931234 and a US visitor's 415-555-0134 into +914155550134. leads.phone is
-- what openDialer dials, what whatsappDigits links, and what the CSV export
-- hands the customer. Rewriting it on live rows is a one-way door; comparing on
-- a derived key is not.
--
-- The key is the last 10 digits, with both sides gated at >= 8 digits so a rep
-- mid-typing cannot match anything. Indian formatting variants all collapse to
-- the same key, and so does a foreign number (+1 415-555-0134 and 4155550134
-- both key to 4155550134) — which the normalise-on-write route would have
-- mangled. Short local landlines match each other but not their STD form: a
-- MISS, not a false positive. That is the correct failure direction. A missed
-- flag costs nothing; a wrong one costs trust in every flag after it.
--
-- No index. The predicate is narrowed by event_id (indexed) and
-- organization_id (indexed) before the expression is evaluated, so this filters
-- a few hundred rows per event. An expression index would add write cost to the
-- app's hottest INSERT path to solve a problem nobody has measured, and would
-- need CREATE INDEX CONCURRENTLY — which cannot run inside a transaction, so it
-- could not share this file and keep the drop+create atomic. If the RPC ever
-- gets slow: measure first (count(*) on leads, explain analyze), then give the
-- index its own file.

-- drop first: `create or replace` cannot change a RETURNS TABLE, and this adds
-- captured_by. Without the id the app has to compare NAMES to decide whether the
-- match is your own lead, and two people really are called Priya Sharma.
drop function if exists public.find_duplicate_lead(uuid, text);

create function public.find_duplicate_lead(p_event_id uuid, p_phone text)
returns table (
  lead_id uuid,
  captured_by uuid,
  captured_by_name text,
  captured_at timestamptz,
  note text,
  voice_summary text
)
language sql security definer set search_path = public stable
as $$
  select l.id, l.captured_by, p.full_name, l.created_at, l.note, vn.summary
  from public.leads l
  join public.profiles p on p.id = l.captured_by
  -- lateral, not a plain left join: a lead with two voice notes multiplied the
  -- rows, and `limit 1` below then returned an arbitrary one of them. This picks
  -- the newest summary deterministically.
  left join lateral (
    select v.summary
    from public.voice_notes v
    where v.lead_id = l.id and v.summary is not null
    order by v.created_at desc
    limit 1
  ) vn on true
  where l.event_id = p_event_id
    and l.organization_id = public.current_organization_id()
    and length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) >= 8
    and length(regexp_replace(coalesce(l.phone,  ''), '\D', '', 'g')) >= 8
    and right(regexp_replace(coalesce(l.phone,  ''), '\D', '', 'g'), 10)
      = right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 10)
  order by l.created_at asc
  limit 1;
$$;

-- Re-apply the hardening from 20260827130100. A drop+create RESETS the ACL, and
-- CREATE FUNCTION grants EXECUTE to PUBLIC by default — so recreating a security
-- definer function silently reopens it to unauthenticated callers. Both `public`
-- and `anon` have to be named: revoking from anon alone is a no-op, because the
-- PUBLIC grant covers everyone regardless. This project has now hit that trap
-- three times (here originally, suggest_card_slug in 20260829130000, and the
-- note in 20260827140000). verify:duplicate asserts an anon caller gets 42501
-- rather than trusting this ran.
revoke execute on function public.find_duplicate_lead(uuid, text) from public, anon;
grant  execute on function public.find_duplicate_lead(uuid, text) to authenticated, service_role;
