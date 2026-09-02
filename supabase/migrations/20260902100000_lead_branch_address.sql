-- A branch address, alongside the head-office one already captured.
--
-- Reported 2026-09-02 (PENDING #18): plenty of Indian business cards print a
-- registered office and a branch or works address, and the card scan had one
-- field for both. Whichever the model picked, the other was lost.
--
-- Additive and nullable: every existing row keeps `company_address` exactly as
-- it is, and nothing is backfilled or rewritten. A branch address is genuinely
-- absent on most cards, so null is the honest default rather than a copy of the
-- main address.
alter table public.leads
  add column branch_address text;

comment on column public.leads.branch_address is
  'A second address printed on the card - a branch, works or regional office - when it is distinct from company_address. Null when the card prints only one.';
