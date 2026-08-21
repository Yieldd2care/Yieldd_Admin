-- Yieldd — Initial schema
-- See DATABASE_SCHEMA.md at the repo root for the full design write-up and rationale.

create extension if not exists pgcrypto;

-- =========================================================================
-- 1. Enum types
-- =========================================================================

create type user_role as enum ('admin', 'rep');
create type member_status as enum ('invited', 'active', 'deactivated');
create type org_plan_tier as enum ('free', 'pro');

create type event_status as enum ('upcoming', 'live', 'closed');
create type custom_field_type as enum ('text', 'number', 'dropdown');

create type lead_source as enum ('card_scan', 'manual');
create type extraction_status as enum ('pending', 'completed', 'failed');
create type lead_temperature as enum ('hot', 'warm', 'cold');
create type lead_status as enum ('new', 'contacted', 'qualified', 'won', 'lost');

create type transcription_status as enum ('pending', 'processing', 'completed', 'failed');

create type activity_type as enum (
  'captured', 'assigned', 'reassigned', 'status_changed', 'temperature_set',
  'note_added', 'follow_up_set', 'outcome_logged', 'message_sent', 'merged_duplicate'
);

create type message_channel as enum ('whatsapp', 'email');
create type message_status as enum ('queued', 'sent', 'skipped', 'failed');

create type invite_status as enum ('pending', 'accepted', 'expired', 'revoked');

create type subscription_status as enum ('active', 'past_due', 'canceled', 'incomplete');
create type billing_cycle as enum ('annual', 'single_event');
create type payment_status as enum ('pending', 'success', 'failed', 'refunded');
create type upgrade_trigger as enum ('lead_wall', 'voice_lock', 'roi_curiosity', 'second_person', 'sales_manual');
create type upgrade_action as enum ('shown', 'dismissed', 'upgraded');

-- =========================================================================
-- 2. Tables
-- =========================================================================

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan_tier org_plan_tier not null default 'free',
  seats_included int not null default 1,
  seats_purchased int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  role user_role not null default 'rep',
  status member_status not null default 'active',
  full_name text not null,
  email text not null unique,
  phone text unique,
  designation text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  name text not null,
  city text,
  start_date date not null,
  end_date date not null,
  status event_status not null default 'upcoming',
  cost_stall_paisa bigint,
  cost_fabrication_paisa bigint,
  cost_travel_paisa bigint,
  cost_staff_paisa bigint,
  cost_marketing_paisa bigint,
  total_cost_paisa bigint generated always as (
    coalesce(cost_stall_paisa, 0) + coalesce(cost_fabrication_paisa, 0) +
    coalesce(cost_travel_paisa, 0) + coalesce(cost_staff_paisa, 0) +
    coalesce(cost_marketing_paisa, 0)
  ) stored,
  leaderboard_visible_to_reps boolean not null default false,
  whatsapp_template text,
  email_template text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_dates_valid check (end_date >= start_date)
);

create table public.event_members (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status member_status not null default 'invited',
  whatsapp_template_override text,
  email_template_override text,
  invited_at timestamptz not null default now(),
  joined_at timestamptz,
  unique (event_id, profile_id)
);

create table public.event_custom_field_defs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  label text not null,
  field_type custom_field_type not null default 'text',
  options jsonb,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  invited_by uuid not null references public.profiles(id),
  phone text not null,
  role user_role not null default 'rep',
  token text not null unique,
  status invite_status not null default 'pending',
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  captured_by uuid not null references public.profiles(id) on delete restrict,
  assigned_to uuid references public.profiles(id) on delete set null,
  source lead_source not null default 'manual',
  full_name text not null,
  company text,
  designation text,
  phone text,
  email text,
  card_image_url text,
  extraction_status extraction_status not null default 'pending',
  custom_field_values jsonb not null default '{}'::jsonb,
  consent_given boolean not null default false,
  consent_at timestamptz,
  note text,
  temperature lead_temperature,
  status lead_status not null default 'new',
  deal_value_paisa bigint,
  deal_closed_at timestamptz,
  follow_up_date date,
  duplicate_of_lead_id uuid references public.leads(id) on delete set null,
  saved_to_contacts boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leads_won_requires_value check (status <> 'won' or deal_value_paisa is not null)
);

create table public.voice_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  recorded_by uuid not null references public.profiles(id),
  audio_url text not null,
  duration_seconds int,
  transcript text,
  summary text,
  transcription_status transcription_status not null default 'pending',
  transcribed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.lead_activity (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  activity_type activity_type not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.message_sends (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  sent_by uuid not null references public.profiles(id),
  channel message_channel not null,
  template_used text,
  status message_status not null default 'queued',
  batch_id uuid,
  created_at timestamptz not null default now()
);

create table public.business_cards (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  slug text not null unique,
  display_name text not null,
  designation text,
  company_name text,
  phone text,
  email text,
  photo_url text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  plan org_plan_tier not null default 'pro',
  status subscription_status not null default 'active',
  billing_cycle billing_cycle not null default 'annual',
  seats int not null default 5,
  amount_paisa bigint not null,
  currency text not null default 'INR',
  provider text not null default 'razorpay',
  provider_subscription_id text,
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  amount_paisa bigint not null,
  currency text not null default 'INR',
  status payment_status not null default 'pending',
  provider_payment_id text,
  gst_invoice_url text,
  trigger_source upgrade_trigger,
  created_at timestamptz not null default now()
);

create table public.upgrade_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  trigger upgrade_trigger not null,
  action upgrade_action not null,
  created_at timestamptz not null default now()
);

-- =========================================================================
-- 3. Indexes
-- =========================================================================

create index on public.profiles (organization_id);
create index on public.events (organization_id);
create index on public.event_members (profile_id);
create index on public.event_custom_field_defs (event_id);
create index on public.invites (organization_id);
create index on public.invites (token);

create index on public.leads (organization_id);
create index on public.leads (event_id);
create index on public.leads (captured_by);
create index on public.leads (assigned_to);
create index on public.leads (phone);
create index on public.leads (follow_up_date) where follow_up_date is not null;
create index on public.leads (event_id, status);

create index on public.voice_notes (lead_id);
create index on public.lead_activity (lead_id);
create index on public.message_sends (lead_id);
create index on public.message_sends (batch_id);

create index on public.subscriptions (organization_id);
create index on public.payments (organization_id);
create index on public.upgrade_events (organization_id);

-- =========================================================================
-- 4. Helper functions (security definer — avoid RLS recursion on profiles)
-- =========================================================================

create or replace function public.current_organization_id()
returns uuid
language sql security definer set search_path = public stable
as $$
  select organization_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql security definer set search_path = public stable
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()) = 'admin',
    false
  );
$$;

create or replace function public.org_is_pro()
returns boolean
language sql security definer set search_path = public stable
as $$
  select coalesce(
    (select plan_tier from public.organizations where id = public.current_organization_id()) = 'pro',
    false
  );
$$;

-- =========================================================================
-- 5. Row Level Security
-- =========================================================================

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.invites enable row level security;
alter table public.events enable row level security;
alter table public.event_members enable row level security;
alter table public.event_custom_field_defs enable row level security;
alter table public.leads enable row level security;
alter table public.voice_notes enable row level security;
alter table public.lead_activity enable row level security;
alter table public.message_sends enable row level security;
alter table public.business_cards enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.upgrade_events enable row level security;

-- ---- organizations ----

create policy "org_select_members" on public.organizations
for select using (id = public.current_organization_id());

create policy "org_admin_update_name" on public.organizations
for update using (id = public.current_organization_id() and public.is_admin())
with check (id = public.current_organization_id());

revoke update on public.organizations from authenticated;
grant update (name) on public.organizations to authenticated;

-- ---- profiles ----

create policy "profiles_select_self_or_org" on public.profiles
for select using (
  id = auth.uid() or organization_id = public.current_organization_id()
);

create policy "profiles_update_self" on public.profiles
for update using (id = auth.uid()) with check (id = auth.uid());

create policy "profiles_admin_manage_status" on public.profiles
for update using (organization_id = public.current_organization_id() and public.is_admin())
with check (organization_id = public.current_organization_id());

-- No insert policy: rows are created only by handle_new_user() (security definer trigger).

-- ---- invites ----

create policy "invites_admin_all" on public.invites
for all using (organization_id = public.current_organization_id() and public.is_admin())
with check (organization_id = public.current_organization_id() and public.is_admin());

-- ---- events ----

create policy "events_select_members" on public.events
for select using (
  organization_id = public.current_organization_id()
  and (
    public.is_admin()
    or exists (select 1 from public.event_members em where em.event_id = events.id and em.profile_id = auth.uid())
  )
);

create policy "events_admin_insert" on public.events
for insert with check (
  organization_id = public.current_organization_id()
  and public.is_admin()
  and created_by = auth.uid()
  and (
    public.org_is_pro()
    or (select count(*) from public.events e
        where e.organization_id = public.current_organization_id()
          and e.status in ('upcoming', 'live')) = 0
  )
);

create policy "events_admin_update" on public.events
for update using (organization_id = public.current_organization_id() and public.is_admin())
with check (organization_id = public.current_organization_id());

create policy "events_admin_delete" on public.events
for delete using (organization_id = public.current_organization_id() and public.is_admin());

-- ---- event_members ----

create policy "event_members_select" on public.event_members
for select using (
  exists (select 1 from public.events e where e.id = event_members.event_id and e.organization_id = public.current_organization_id())
  and (
    public.is_admin()
    or profile_id = auth.uid()
    or exists (select 1 from public.events e2 where e2.id = event_members.event_id and e2.leaderboard_visible_to_reps)
  )
);

create policy "event_members_admin_write" on public.event_members
for all using (
  exists (select 1 from public.events e where e.id = event_members.event_id and e.organization_id = public.current_organization_id())
  and public.is_admin()
)
with check (
  exists (select 1 from public.events e where e.id = event_members.event_id and e.organization_id = public.current_organization_id())
);

-- ---- event_custom_field_defs ----

create policy "field_defs_select_members" on public.event_custom_field_defs
for select using (
  exists (
    select 1 from public.events e
    join public.event_members em on em.event_id = e.id
    where e.id = event_custom_field_defs.event_id
      and e.organization_id = public.current_organization_id()
      and (public.is_admin() or em.profile_id = auth.uid())
  )
);

create policy "field_defs_admin_write" on public.event_custom_field_defs
for all using (
  exists (select 1 from public.events e where e.id = event_custom_field_defs.event_id and e.organization_id = public.current_organization_id())
  and public.is_admin()
)
with check (
  exists (select 1 from public.events e where e.id = event_custom_field_defs.event_id and e.organization_id = public.current_organization_id())
);

-- ---- leads ----

create policy "leads_select_own_or_admin" on public.leads
for select using (
  organization_id = public.current_organization_id()
  and (public.is_admin() or captured_by = auth.uid() or assigned_to = auth.uid())
);

create policy "leads_insert_event_member" on public.leads
for insert with check (
  organization_id = public.current_organization_id()
  and captured_by = auth.uid()
  and exists (
    select 1 from public.event_members em
    where em.event_id = leads.event_id and em.profile_id = auth.uid() and em.status = 'active'
  )
  -- Deliberately NO count check here — the 100-lead Free cap is a soft,
  -- app-level upsell prompt, not a database gate (MVP_PLAN: "never block the scan").
);

create policy "leads_update_own_or_admin" on public.leads
for update using (
  organization_id = public.current_organization_id()
  and (public.is_admin() or captured_by = auth.uid() or assigned_to = auth.uid())
)
with check (organization_id = public.current_organization_id());

create policy "leads_delete_admin_only" on public.leads
for delete using (organization_id = public.current_organization_id() and public.is_admin());

-- ---- voice_notes ----

create policy "voice_notes_select" on public.voice_notes
for select using (
  exists (
    select 1 from public.leads l
    where l.id = voice_notes.lead_id
      and l.organization_id = public.current_organization_id()
      and (public.is_admin() or l.captured_by = auth.uid() or l.assigned_to = auth.uid())
  )
);

create policy "voice_notes_insert" on public.voice_notes
for insert with check (
  recorded_by = auth.uid()
  and exists (select 1 from public.leads l where l.id = voice_notes.lead_id and l.organization_id = public.current_organization_id())
  and (
    public.org_is_pro()
    or (
      select count(*) from public.voice_notes vn
      join public.leads l2 on l2.id = vn.lead_id
      where l2.organization_id = public.current_organization_id()
    ) < 3
  )
);

-- ---- lead_activity ----

create policy "lead_activity_select" on public.lead_activity
for select using (
  exists (
    select 1 from public.leads l
    where l.id = lead_activity.lead_id
      and l.organization_id = public.current_organization_id()
      and (public.is_admin() or l.captured_by = auth.uid() or l.assigned_to = auth.uid())
  )
);

create policy "lead_activity_insert" on public.lead_activity
for insert with check (
  actor_id = auth.uid()
  and exists (
    select 1 from public.leads l
    where l.id = lead_activity.lead_id
      and l.organization_id = public.current_organization_id()
      and (public.is_admin() or l.captured_by = auth.uid() or l.assigned_to = auth.uid())
  )
);

-- ---- message_sends ----

create policy "message_sends_select" on public.message_sends
for select using (
  exists (
    select 1 from public.leads l
    where l.id = message_sends.lead_id
      and l.organization_id = public.current_organization_id()
      and (public.is_admin() or l.captured_by = auth.uid() or l.assigned_to = auth.uid())
  )
);

create policy "message_sends_insert" on public.message_sends
for insert with check (
  sent_by = auth.uid()
  and exists (
    select 1 from public.leads l
    where l.id = message_sends.lead_id
      and l.organization_id = public.current_organization_id()
      and (public.is_admin() or l.captured_by = auth.uid() or l.assigned_to = auth.uid())
  )
);

-- ---- business_cards ----

create policy "business_cards_public_read" on public.business_cards
for select using (is_published = true);

create policy "business_cards_owner_manage" on public.business_cards
for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

grant select on public.business_cards to anon;

-- ---- subscriptions / payments / upgrade_events ----

create policy "subscriptions_admin_read" on public.subscriptions
for select using (organization_id = public.current_organization_id() and public.is_admin());

create policy "payments_admin_read" on public.payments
for select using (organization_id = public.current_organization_id() and public.is_admin());

-- No insert/update/delete policies on subscriptions or payments for `authenticated`.
-- Writes happen exclusively via the service-role key inside a future payment-webhook Edge Function.

create policy "upgrade_events_insert_self" on public.upgrade_events
for insert with check (profile_id = auth.uid() and organization_id = public.current_organization_id());

create policy "upgrade_events_admin_read" on public.upgrade_events
for select using (organization_id = public.current_organization_id() and public.is_admin());

-- =========================================================================
-- 6. Triggers
-- =========================================================================

-- Signup -> profile + organization (or attach to an existing org via invite token)
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_invite public.invites%rowtype;
  v_org_id uuid;
begin
  select * into v_invite
  from public.invites
  where token = new.raw_user_meta_data ->> 'invite_token'
    and status = 'pending'
    and expires_at > now()
  limit 1;

  if found then
    v_org_id := v_invite.organization_id;

    insert into public.profiles (id, organization_id, role, full_name, email)
    values (
      new.id, v_org_id, v_invite.role,
      coalesce(new.raw_user_meta_data ->> 'full_name', 'New user'),
      new.email
    );

    update public.invites set status = 'accepted', accepted_at = now() where id = v_invite.id;

    if v_invite.event_id is not null then
      insert into public.event_members (event_id, profile_id, status, joined_at)
      values (v_invite.event_id, new.id, 'active', now());
    end if;
  else
    insert into public.organizations (name)
    values (coalesce(new.raw_user_meta_data ->> 'company_name', 'My workspace'))
    returning id into v_org_id;

    insert into public.profiles (id, organization_id, role, full_name, email)
    values (
      new.id, v_org_id, 'admin',
      coalesce(new.raw_user_meta_data ->> 'full_name', 'New user'),
      new.email
    );
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Generic updated_at maintenance

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_org_updated_at before update on public.organizations for each row execute function public.set_updated_at();
create trigger trg_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger trg_events_updated_at before update on public.events for each row execute function public.set_updated_at();
create trigger trg_cards_updated_at before update on public.business_cards for each row execute function public.set_updated_at();
create trigger trg_subs_updated_at before update on public.subscriptions for each row execute function public.set_updated_at();

-- Lead update guard: only an admin may reassign; a few fields are immutable.

create or replace function public.enforce_lead_update_rules()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.assigned_to is distinct from old.assigned_to and not public.is_admin() then
    raise exception 'Only an admin can reassign a lead';
  end if;
  if new.captured_by is distinct from old.captured_by then
    raise exception 'captured_by is immutable';
  end if;
  if new.organization_id is distinct from old.organization_id then
    raise exception 'organization_id is immutable';
  end if;
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_leads_before_update
  before update on public.leads
  for each row execute function public.enforce_lead_update_rules();

-- Duplicate-lead peek (E4): narrow, read-only door — general leads SELECT stays restricted.

create or replace function public.find_duplicate_lead(p_event_id uuid, p_phone text)
returns table (
  lead_id uuid,
  captured_by_name text,
  captured_at timestamptz,
  note text,
  voice_summary text
)
language sql security definer set search_path = public stable
as $$
  select l.id, p.full_name, l.created_at, l.note, vn.summary
  from public.leads l
  join public.profiles p on p.id = l.captured_by
  left join public.voice_notes vn on vn.lead_id = l.id
  where l.event_id = p_event_id
    and l.phone = p_phone
    and l.organization_id = public.current_organization_id()
  order by l.created_at asc
  limit 1;
$$;
