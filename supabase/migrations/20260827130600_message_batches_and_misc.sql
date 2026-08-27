-- A7 — Batch sends, typed outcomes, and the remaining column gaps.

-- ---------------------------------------------------------------------------
-- message_batches
--
-- message_sends.batch_id was an orphan uuid with no parent table, so
-- leads/send-queue.tsx had no source for the "3 of 8 sent" denominator.
--
-- RLS is enabled in this same file, and that is not optional. Supabase's
-- bootstrap runs
--   alter default privileges in schema public
--     grant all on tables to anon, authenticated, service_role;
-- so a new public table without RLS is not merely unprotected — it is fully
-- READABLE AND WRITABLE by the publishable key that ships inside the app
-- bundle. Verified in pg_default_acl: anon=arwdDxtm/postgres.
-- ---------------------------------------------------------------------------

create table public.message_batches (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id        uuid references public.events(id) on delete cascade,
  created_by      uuid not null references public.profiles(id) on delete restrict,
  channel         message_channel not null,
  total_count     int not null default 0,
  started_at      timestamptz not null default now(),
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  constraint message_batches_total_count_non_negative check (total_count >= 0)
);

create index on public.message_batches (organization_id, event_id);

alter table public.message_batches enable row level security;

create policy "message_batches_select" on public.message_batches
for select using (
  organization_id = (select public.current_organization_id())
  and (public.is_admin() or created_by = auth.uid())
);

create policy "message_batches_insert" on public.message_batches
for insert with check (
  organization_id = (select public.current_organization_id())
  and created_by = auth.uid()
);

create policy "message_batches_update" on public.message_batches
for update using (
  organization_id = (select public.current_organization_id())
  and created_by = auth.uid()
)
with check (organization_id = (select public.current_organization_id()));


-- message_sends gains a real parent and a real template reference.
-- template_used stays as the historical text snapshot: the template row can be
-- edited or deleted later, and the send record should still say what was sent.
alter table public.message_sends
  add column if not exists template_id uuid references public.message_templates(id) on delete set null;

alter table public.message_sends
  add constraint message_sends_batch_fk
    foreign key (batch_id) references public.message_batches(id) on delete set null;

create index on public.message_sends (template_id);


-- ---------------------------------------------------------------------------
-- Typed outcomes
--
-- activity_type already had the `outcome_logged` wrapper, but the outcome
-- itself could only live in untyped lead_activity.metadata — so the follow-ups
-- screen's "latest interaction note" was not queryable.
-- (CREATE TYPE then immediate use is fine; the same-transaction restriction
-- applies only to ALTER TYPE ... ADD VALUE.)
-- ---------------------------------------------------------------------------

create type lead_outcome as enum ('connected', 'no_answer', 'not_interested', 'meeting_set');

alter table public.lead_activity
  add column if not exists outcome lead_outcome;

create index on public.lead_activity (lead_id, created_at desc) where outcome is not null;


-- ---------------------------------------------------------------------------
-- leads
-- ---------------------------------------------------------------------------

alter table public.leads
  add column if not exists reviewed_at                  timestamptz,
  add column if not exists company_summary_generated_at timestamptz;

-- Backs the evening-review queue: without reviewed_at, "N of 14 remaining"
-- cannot distinguish skipped from pending and the queue cannot resume.
create index on public.leads (event_id, captured_by) where reviewed_at is null;

comment on column public.leads.company_summary_generated_at is
  'When company_summary was produced by the AI action. Provenance behind the "verify before sharing" caveat the capture screen shows; NULL means hand-entered.';


-- ---------------------------------------------------------------------------
-- invites
--
-- The invite screens collect Full name, Phone AND Email ID. full_name arrives
-- separately; email is added here. Adding email alone would have been useless
-- while phone stayed NOT NULL — every email-only invite would fail 23502.
-- ---------------------------------------------------------------------------

alter table public.invites
  add column if not exists full_name text,
  add column if not exists email     text;

alter table public.invites
  alter column phone drop not null;

-- Let the database mint the secret rather than trusting client entropy.
alter table public.invites
  alter column token set default encode(gen_random_bytes(16), 'hex');

alter table public.invites
  add constraint invites_contact_present
    check (phone is not null or email is not null);


-- ---------------------------------------------------------------------------
-- payments / profiles
-- ---------------------------------------------------------------------------

-- The single-event purchase is per event ("₹10,000 charged · IMTEX 2026"), but
-- payments had no way to say which. Nullable, because annual subscriptions are
-- org-wide and have no event.
alter table public.payments
  add column if not exists event_id uuid references public.events(id) on delete set null;

create index on public.payments (event_id);

alter table public.profiles
  add column if not exists notifications_enabled boolean not null default true;
