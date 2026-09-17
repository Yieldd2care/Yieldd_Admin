-- More than one number, one address, one job title per lead.
--
-- ADDITIVE ONLY, and no backfill, ever. `phone`, `email` and `designation` keep
-- their exact meaning: each is still the PRIMARY value - what the dialer dials,
-- what the WhatsApp link opens, what find_duplicate_lead matches on, what the
-- CSV prints in the Phone column, and what a list row shows. The three columns
-- below hold everything BEYOND that first value, in the order it was entered.
--
-- A lead captured before this migration has null in all three, which is an
-- ordinary lead with one number. Nothing is rewritten and nothing is moved.
--
-- ---------------------------------------------------------------------------
-- Why not text[] on the existing columns
--
-- Because `leads.phone` is what a customer is dialled on, and 20260831090000
-- already records the rule for it: a backfill over live rows is a one-way door.
-- Converting the column would also break find_duplicate_lead, which compares
-- l.phone as scalar text, and change export_leads' return type - so every
-- consumer would have to move in one commit, with no way back.
--
-- text[] rather than one jsonb column: PostgREST maps text[] to string[] in the
-- generated types, so there is no cast at every read and write - the three that
-- custom_field_values needs today. And jsonb_typeof(x) = 'array' would only
-- check the container; the element types would stay unchecked.
--
-- ---------------------------------------------------------------------------
-- No uniqueness rule, and no "phone must not also be in extra_phones" check
--
-- Both are real invariants and both are enforced on the DEVICE, in toInsert and
-- toUpdate, where a violation is silently corrected. They are deliberately
-- absent here because lib/api/leads.ts classifies 23514 as a PERMANENT failure:
-- a check the app can plausibly trip does not bounce back for a retry, it sets
-- syncError on the lead and strands a capture the rep can do nothing about.
-- Same reasoning as the location bounds in 20260916100000 - every bound below
-- is far wider than any screen will produce.
--
-- ---------------------------------------------------------------------------
-- No GRANT, and that is checked rather than assumed
--
-- 20260827130400 records the trap: column-level ACLs do NOT extend to columns
-- added later, so `organizations` needed an explicit grant per new column.
-- `leads` is not in that position - its privileges are TABLE-level, with
-- pg_attribute.attacl null for every column - so a new column inherits them.
-- Re-verified against the live database with:
--
--   npm run db:rehearse -- supabase/migrations/20260917100000_lead_extra_contact_points.sql \
--     --probe "select attname, attacl from pg_attribute
--              where attrelid = 'public.leads'::regclass and attname like 'extra%'"
--
-- All four policies are row-level and name no columns, so they are unaffected.
-- If this ever stops holding the symptom is 42501 on a save, and the fix is a
-- grant insert (...), update (...) on public.leads to authenticated.
--
-- ---------------------------------------------------------------------------
-- No index, and that is a decision
--
-- Nothing queries by these. Note that even extending duplicate detection would
-- not want one: that predicate matches a DERIVED expression - the last ten
-- digits after the non-digits are stripped - not containment, so a GIN index
-- would never be consulted. The plain leads(phone) index from the initial
-- schema is already dead weight for the same reason.
--
-- Rehearsed in a rolled-back transaction against the live database before push.
-- ---------------------------------------------------------------------------

alter table public.leads
  add column if not exists extra_phones       text[],
  add column if not exists extra_emails       text[],
  add column if not exists extra_designations text[];

/*
 * Shape only: one dimension, no null elements, a generous cap on how many and
 * how long. See the note above on why there is nothing here about duplicates.
 *
 * Two Postgres details that are easy to get wrong and fail loudly in rehearsal:
 *
 *   - array_position needs the explicit ::text cast, or the polymorphic second
 *     argument cannot be resolved against an untyped NULL.
 *   - array_length(x, 1) and array_ndims(x) both return NULL for '{}', not 0,
 *     so a bare comparison against a legitimately empty array is NULL and the
 *     whole check silently passes. Hence the coalesce on both.
 */
alter table public.leads
  add constraint leads_extra_phones_shape check (
    extra_phones is null or (
      coalesce(array_ndims(extra_phones), 1) = 1
      and coalesce(array_length(extra_phones, 1), 0) <= 10
      and array_position(extra_phones, null::text) is null
      and char_length(array_to_string(extra_phones, '')) <= 1000
    )
  ),
  add constraint leads_extra_emails_shape check (
    extra_emails is null or (
      coalesce(array_ndims(extra_emails), 1) = 1
      and coalesce(array_length(extra_emails, 1), 0) <= 10
      and array_position(extra_emails, null::text) is null
      and char_length(array_to_string(extra_emails, '')) <= 2000
    )
  ),
  add constraint leads_extra_designations_shape check (
    extra_designations is null or (
      coalesce(array_ndims(extra_designations), 1) = 1
      and coalesce(array_length(extra_designations, 1), 0) <= 5
      and array_position(extra_designations, null::text) is null
      and char_length(array_to_string(extra_designations, '')) <= 600
    )
  );

comment on column public.leads.extra_phones is
  'Further numbers for this person, BEYOND `phone` (the primary, and the only one anything dials by default) and `company_landline` (the switchboard). Order is the order the rep entered them and is preserved end to end - nothing may sort this. Null is the ordinary case and means one number. Duplicate detection matches on `phone` alone and deliberately does NOT look here: a lead captured under a second number will not flag against an earlier capture under the first. That miss is the accepted direction - 20260831090000 - because a wrong flag costs trust in every flag after it.';

comment on column public.leads.extra_emails is
  'Further addresses beyond `email`. Lower-cased on write, the same as `email`. A generic company address (info@, sales@) printed alongside a personal one belongs here, never in `email`.';

comment on column public.leads.extra_designations is
  'Further job titles, for a card that prints genuinely separate ones. A compound title on a single line - "Director - Sales & Marketing", "MD & CEO" - is ONE designation and stays whole in `designation`.';
