-- A3 — Event costs (5 -> 7 line items), stall number, and timezone.
--
-- app/(app)/events/new/cost.tsx collects SEVEN cost line items:
--   Stall, Fabrication, Furniture, Travel, Staff, Accommodation, Marketing
-- The schema had five. The wizard totals all seven on screen, so
-- events.total_cost_paisa silently disagreed with the number the user was
-- shown — and cost-per-lead and ROI % are both computed from it.

alter table public.events
  add column if not exists cost_furniture_paisa     bigint,
  add column if not exists cost_accommodation_paisa bigint,
  add column if not exists stall_number             text,
  add column if not exists timezone                 text not null default 'Asia/Kolkata';

-- Deliberately a SEPARATE statement: a comma-joined ALTER TABLE cannot
-- reference columns added in the same statement.
--
-- SET EXPRESSION (PG 17+) rewrites the stored values in place and keeps the
-- column's ordinal position and dependents. DROP + ADD would move
-- total_cost_paisa to the end of the table, which shows up in `select *`, in
-- generated TypeScript types, and in CSV exports.
alter table public.events
  alter column total_cost_paisa set expression as (
    coalesce(cost_stall_paisa,         0) +
    coalesce(cost_fabrication_paisa,   0) +
    coalesce(cost_furniture_paisa,     0) +
    coalesce(cost_travel_paisa,        0) +
    coalesce(cost_staff_paisa,         0) +
    coalesce(cost_accommodation_paisa, 0) +
    coalesce(cost_marketing_paisa,     0)
  );

-- PG 17 drops the column's statistics on rewrite. Legal inside a transaction
-- (only VACUUM isn't) and a no-op at zero rows, but correct to state.
analyze public.events;

-- NULL-permissive on purpose: an unset cost is not the same as a cost of zero,
-- and the wizard leaves untouched fields blank.
alter table public.events
  add constraint events_costs_non_negative check (
    coalesce(cost_stall_paisa,         0) >= 0 and
    coalesce(cost_fabrication_paisa,   0) >= 0 and
    coalesce(cost_furniture_paisa,     0) >= 0 and
    coalesce(cost_travel_paisa,        0) >= 0 and
    coalesce(cost_staff_paisa,         0) >= 0 and
    coalesce(cost_accommodation_paisa, 0) >= 0 and
    coalesce(cost_marketing_paisa,     0) >= 0
  );

comment on column public.events.stall_number is
  'Free-text stall/booth id, e.g. "B-42". Hardcoded across ~5 screens today; drives the event context bar and the exported ROI PDF header.';

comment on column public.events.timezone is
  'IANA zone anchoring every per-day aggregate for this event: "Day 3 of 4", leads-captured-today, capture-rate-by-hour. created_at is timestamptz, so without an anchor those buckets are wrong for anyone outside the server zone. Not CHECK-constrained because pg_timezone_names is not immutable — the app validates.';
