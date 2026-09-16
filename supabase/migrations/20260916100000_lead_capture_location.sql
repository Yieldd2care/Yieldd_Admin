-- Where each lead was captured - PENDING.md 43.
--
-- Four nullable columns and nothing else. No backfill, ever: every lead
-- captured before this migration has no location and never will, and that is a
-- normal lead rather than a gap to be filled in with a guess.
--
-- ---------------------------------------------------------------------------
-- What these hold
--
-- The DEVICE's position at the moment of capture, resolved once to a postal
-- address and stored. Not the company address printed on the card - that is
-- `company_address`, which is a different fact about a different place.
--
-- `capture_address` is written by the phone from the platform's own on-device
-- geocoder (Android's is Google underneath; iOS uses Apple's). Nothing on a
-- screen ever re-resolves it: one list of sixty leads must not become sixty
-- geocode calls every time somebody scrolls, and the Expo docs say in as many
-- words that "geocoding is resource consuming and has to be used reasonably".
--
-- The three parts are independently nullable ON PURPOSE. A fix can arrive and
-- the geocode still fail - no network, a rate limit, a point in the sea - so
-- coordinates with no address is a state the product has to render, and it
-- renders as the coordinates. Accuracy is null whenever the OS declined to say.
--
-- ---------------------------------------------------------------------------
-- No GRANT here, and that is checked rather than assumed
--
-- 20260827130400 records the trap: column-level ACLs do NOT extend to columns
-- added later, so `organizations` needed an explicit grant for every new
-- column or an admin got 42501. `leads` is not in that position. Its privileges
-- are TABLE-level - `pg_attribute.attacl` is null for every one of its columns,
-- verified against the live database before this file was written - so a new
-- column inherits them and an insert touching these four is accepted.
--
-- Its four policies (leads_select_own_or_admin, leads_insert_event_member,
-- leads_update_own_or_admin, leads_delete_admin_only) are all row-level and
-- name no columns, so they need no change either.
--
-- If that ever stops being true the symptom is 42501 on a capture, and the fix
-- is a `grant insert (...), update (...) on public.leads to authenticated`.
--
-- ---------------------------------------------------------------------------
-- No index, and that is a decision
--
-- Nothing queries BY location. The dashboard map plots the rows the viewer has
-- already been given, filtered by event, and `leads` is already indexed on
-- organization_id and event_id. An index here would be paid for on every
-- capture to speed up no query that exists.
--
-- Rehearsed in a rolled-back transaction against the live database before push.
-- ---------------------------------------------------------------------------

alter table public.leads
  add column if not exists capture_latitude   double precision,
  add column if not exists capture_longitude  double precision,
  add column if not exists capture_accuracy_m double precision,
  add column if not exists capture_address    text;

/*
 * The constraints are a floor, not the product's rule.
 *
 * The device already refuses a fix outside these bounds (lib/captureLocation.ts,
 * isUsableFix) and caps the address well below 500. These exist so a bad write
 * from anywhere else - a script, a future edge function, a hand-run UPDATE -
 * cannot put a lead on a map at latitude 4000. They are deliberately wider than
 * what the app produces, so a legitimate capture can never be refused by the
 * database: a 23514 on this path would surface to a rep as a failed sync of a
 * lead that is otherwise perfect.
 *
 * Latitude and longitude are checked together. Half a fix is not a location,
 * and a row holding one without the other would render as a pin in the sea.
 */
alter table public.leads
  add constraint leads_capture_latitude_range
    check (capture_latitude is null or capture_latitude between -90 and 90),
  add constraint leads_capture_longitude_range
    check (capture_longitude is null or capture_longitude between -180 and 180),
  add constraint leads_capture_fix_is_whole
    check ((capture_latitude is null) = (capture_longitude is null)),
  add constraint leads_capture_accuracy_positive
    check (capture_accuracy_m is null or capture_accuracy_m >= 0),
  add constraint leads_capture_address_len
    check (capture_address is null or char_length(capture_address) between 1 and 500);

comment on column public.leads.capture_latitude is
  'Latitude of the DEVICE when this lead was captured, in degrees. Null for every lead captured before PENDING 43, and for any capture where no fix arrived in time - an exhibition hall is indoors and a capture never waits for GPS. Always null or non-null together with capture_longitude.';

comment on column public.leads.capture_longitude is
  'Longitude of the device at capture, in degrees. See capture_latitude.';

comment on column public.leads.capture_accuracy_m is
  'Radius of uncertainty in metres, as the OS reported it. Null when the OS did not say. Captures are taken at Balanced accuracy (about 100m), which is enough to answer which venue and which city and cheap enough to run all day on one battery.';

comment on column public.leads.capture_address is
  'The postal address for the fix, resolved ONCE on the device at capture and stored. Never re-resolved when a screen renders. Null is ordinary and means the geocode failed on its own - the coordinates still stand and the lead screen shows those instead. This is where the rep was standing, NOT the company address on the card; that is company_address.';
