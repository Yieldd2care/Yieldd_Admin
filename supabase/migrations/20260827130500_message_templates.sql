-- A6 — Real message templates.
--
-- components/app/MessageTemplateManager.tsx + stores/useTemplatesStore.ts
-- implement a full CRUD manager at ORG level: named templates per channel, an
-- exclusive default per channel, an optional file attachment, and a separate
-- subject line for email. The schema had two `text` columns on events and two
-- more on event_members, which cannot represent any of that.

create table public.message_templates (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  created_by            uuid not null references public.profiles(id) on delete restrict,
  channel               message_channel not null,
  name                  text not null,
  subject               text,
  body                  text not null,
  is_default            boolean not null default false,
  attachment_path       text,          -- object key in the template-attachments bucket
  attachment_name       text,
  attachment_size_bytes bigint,
  attachment_mime_type  text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint message_templates_name_len
    check (char_length(name) between 1 and 80),
  constraint message_templates_subject_email_only
    check (channel = 'email' or subject is null),
  constraint message_templates_attachment_complete
    check ((attachment_path is null) = (attachment_name is null)),

  -- Target for the composite FKs below. RI triggers run as the table owner and
  -- bypass RLS, so a plain FK on id alone would let a known template uuid from
  -- ANOTHER organisation be attached to an event you can legitimately write.
  -- Pinning organization_id into the reference makes that impossible.
  constraint message_templates_org_id_unique unique (organization_id, id)
);

create index on public.message_templates (organization_id, channel);

-- Exactly one default per (organisation, channel).
create unique index message_templates_one_default_per_channel
  on public.message_templates (organization_id, channel)
  where is_default;

create trigger trg_message_templates_updated_at
  before update on public.message_templates
  for each row execute function public.set_updated_at();

alter table public.message_templates enable row level security;

create policy "message_templates_select_org" on public.message_templates
for select using (organization_id = (select public.current_organization_id()));

-- created_by is pinned here the same way leads_insert_event_member pins
-- captured_by, so authorship cannot be forged.
create policy "message_templates_admin_insert" on public.message_templates
for insert with check (
  organization_id = (select public.current_organization_id())
  and public.is_admin()
  and created_by = auth.uid()
);

-- Split from insert deliberately: a `for all` policy whose WITH CHECK pinned
-- created_by = auth.uid() would stop admin B editing admin A's template.
create policy "message_templates_admin_update" on public.message_templates
for update using (
  organization_id = (select public.current_organization_id()) and public.is_admin()
)
with check (organization_id = (select public.current_organization_id()));

create policy "message_templates_admin_delete" on public.message_templates
for delete using (
  organization_id = (select public.current_organization_id()) and public.is_admin()
);


-- Flipping the default is two writes. security DEFINER, not invoker: as
-- invoker a rep's call would hit the admin-only UPDATE policy, update zero
-- rows and return SUCCESS having changed nothing. So the admin check is
-- explicit and it raises instead.
create or replace function public.set_default_message_template(p_template_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org     uuid;
  v_channel message_channel;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can change the default template';
  end if;

  select organization_id, channel
    into v_org, v_channel
    from public.message_templates
   where id = p_template_id;

  -- Same message for "missing" and "another org's" so the function cannot be
  -- used to probe which uuids exist elsewhere.
  if v_org is null or v_org <> public.current_organization_id() then
    raise exception 'Template not found';
  end if;

  -- Clear THEN set, as two statements. A single
  --   set is_default = (id = p_template_id)
  -- is order-dependent against the partial unique index and can raise 23505 if
  -- the scan reaches the new default before clearing the old one. It cannot be
  -- worked around by deferring: only constraints are deferrable, and unique
  -- constraints cannot be partial.
  update public.message_templates
     set is_default = false
   where organization_id = v_org
     and channel = v_channel
     and is_default
     and id <> p_template_id;

  update public.message_templates
     set is_default = true
   where id = p_template_id;
end;
$$;

revoke all    on function public.set_default_message_template(uuid) from public, anon;
grant  execute on function public.set_default_message_template(uuid) to authenticated;


-- Event / member linkage.
--
-- ON DELETE SET NULL names its columns explicitly (PG 15+). Without the column
-- list it would try to null organization_id too, which is NOT NULL on both
-- tables, and every template delete would fail.
alter table public.events
  add column if not exists whatsapp_template_id uuid,
  add column if not exists email_template_id    uuid;

alter table public.events
  add constraint events_whatsapp_template_fk
    foreign key (organization_id, whatsapp_template_id)
    references public.message_templates (organization_id, id)
    on delete set null (whatsapp_template_id),
  add constraint events_email_template_fk
    foreign key (organization_id, email_template_id)
    references public.message_templates (organization_id, id)
    on delete set null (email_template_id);

create index on public.events (whatsapp_template_id);
create index on public.events (email_template_id);

alter table public.event_members
  add column if not exists whatsapp_template_override_id uuid,
  add column if not exists email_template_override_id    uuid;

-- event_members has no organization_id of its own, so these are plain FKs;
-- the org boundary is enforced one level up via event_id.
alter table public.event_members
  add constraint event_members_whatsapp_override_fk
    foreign key (whatsapp_template_override_id)
    references public.message_templates (id) on delete set null,
  add constraint event_members_email_override_fk
    foreign key (email_template_override_id)
    references public.message_templates (id) on delete set null;

create index on public.event_members (whatsapp_template_override_id);
create index on public.event_members (email_template_override_id);


-- Drop the legacy free-text columns rather than keeping them as a "fallback".
-- Two writable sources of truth per field, with nothing reconciling them, is
-- how they drift. Nothing reads these and there are zero rows, so this is free
-- now and expensive later.
alter table public.events
  drop column if exists whatsapp_template,
  drop column if exists email_template;

alter table public.event_members
  drop column if exists whatsapp_template_override,
  drop column if exists email_template_override;

comment on table public.message_templates is
  'Org-scoped message templates. Resolution order for a send: event_members.*_override_id -> events.*_template_id -> the org default (is_default) -> an app-level hardcoded default.';
