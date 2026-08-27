-- Card-scan Company section fields (see DATABASE_SCHEMA.md §4.7). Person section
-- fields (designation, note) already existed on `leads`.
alter table public.leads
  add column company_landline text,
  add column company_website text,
  add column company_address text,
  add column company_summary text;

-- Admin custom-field builder now supports checkbox/radio field types, and each
-- field can be marked required by the admin (see DATABASE_SCHEMA.md §4.6).
alter type custom_field_type add value if not exists 'checkbox';
alter type custom_field_type add value if not exists 'radio';

alter table public.event_custom_field_defs
  add column is_required boolean not null default false;
