-- Phase 3 — cached company summaries.
--
-- A summary is read off the company's own website, so it is the same answer no
-- matter who asks for it. At one exhibition forty reps walk past the same
-- stall and scan the same card; without this table that is forty fetches of
-- the same homepage and forty model calls for forty identical paragraphs.
--
-- Keyed by domain rather than by lead or by company name. The name printed on
-- a card varies ("Northline Engineering", "NORTHLINE ENGG. PVT LTD") but
-- northline.co.in is northline.co.in.
--
-- Nothing here is private: every word of it came off a public website. It is
-- still not readable by the app, because the app has no reason to read it —
-- only the `summarise-company` function touches this table, and it does so
-- with the service role. RLS is enabled with no policies at all, which denies
-- every ordinary caller. That is deliberate, not an omission.
create table if not exists public.company_summaries (
  domain        text primary key,
  summary       text        not null,
  -- The pages the summary was actually written from, so a bad summary can be
  -- traced back to what it read instead of being guessed at.
  source_urls   text[]      not null default '{}',
  model         text,
  created_at    timestamptz not null default now(),
  refreshed_at  timestamptz not null default now()
);

comment on table public.company_summaries is
  'Cache of AI summaries written from a company''s own website, keyed by domain. Written only by the summarise-company Edge Function.';

alter table public.company_summaries enable row level security;

-- No policies by design — see the note above. Revoking the schema-wide grants
-- as well, because RLS and GRANT are separate gates and this project has been
-- caught by that before: a table with RLS on and a stray `grant select` still
-- answers `select` for anyone once a policy is added later by accident.
revoke all on public.company_summaries from anon, authenticated;

-- Refreshing an entry is an upsert on the primary key, so age is the only
-- thing ever queried besides the domain itself.
create index if not exists company_summaries_refreshed_at_idx
  on public.company_summaries (refreshed_at desc);
