-- Phase 11B-1: dormant backend foundation; no mobile integration or public reads.
begin;

create schema if not exists wait_private;
revoke all on schema wait_private from public, anon, authenticated;

create table wait_private.reporting_rules (
  singleton boolean primary key default true check (singleton),
  radius_meters double precision not null check (radius_meters > 0),
  maximum_accuracy_meters double precision not null check (maximum_accuracy_meters > 0),
  maximum_age interval not null check (maximum_age > interval '0'),
  cooldown interval not null check (cooldown > interval '0')
);
insert into wait_private.reporting_rules values (true, 122, 50, interval '30 seconds', interval '10 minutes');

-- Server-owned allowlist. Coordinates copied from the approved local dataset.
create table wait_private.reporting_attractions (
  id text primary key,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  enabled boolean not null default true
);
insert into wait_private.reporting_attractions (id, latitude, longitude) values
  ('salem-witch-museum', 42.5237449, -70.8911625),
  ('witch-house', 42.5215539, -70.8988987),
  ('house-seven-gables', 42.5218159, -70.8838227),
  ('peabody-essex-museum', 42.5215925, -70.8921931),
  ('witch-dungeon-museum', 42.5225674, -70.8971921),
  ('salem-maritime', 42.5190589, -70.8855837);

create table wait_private.wait_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  submission_key text not null check (char_length(submission_key) between 1 and 128),
  attraction_id text not null references wait_private.reporting_attractions(id),
  wait_minutes integer not null check (wait_minutes in (0, 10, 20, 30, 45, 60)),
  crowd_level text not null check (crowd_level in ('light', 'moderate', 'busy')),
  quick_status_tag text check (quick_status_tag in ('line-moving-quickly', 'ticket-line-only', 'line-wraps-outside', 'temporary-delay', 'entrance-moved')),
  submitted_at timestamptz not null default clock_timestamp(),
  accuracy_meters double precision not null check (accuracy_meters >= 0 and accuracy_meters < 'Infinity'::double precision),
  unique (reporter_id, submission_key)
);
create index wait_reports_cooldown on wait_private.wait_reports (reporter_id, attraction_id, submitted_at desc);
create index wait_reports_recent on wait_private.wait_reports (attraction_id, submitted_at desc);

alter table wait_private.reporting_rules enable row level security;
alter table wait_private.reporting_attractions enable row level security;
alter table wait_private.wait_reports enable row level security;
revoke all on all tables in schema wait_private from public, anon, authenticated;
-- Intentionally no direct-access RLS policies, including for the report owner.

create function public.submit_wait_report(
  p_attraction_id text,
  p_submission_key text,
  p_wait_minutes integer,
  p_crowd_level text,
  p_quick_status_tag text,
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy_meters double precision,
  p_location_timestamp timestamptz,
  p_mocked boolean
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  reporter uuid := auth.uid();
  rules wait_private.reporting_rules%rowtype;
  destination wait_private.reporting_attractions%rowtype;
  existing wait_private.wait_reports%rowtype;
  latest timestamptz;
  checked_at timestamptz;
  distance_meters double precision;
  report_id uuid;
begin
  if reporter is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_submission_key is null or char_length(btrim(p_submission_key)) not between 1 and 128
    or p_attraction_id is null or p_wait_minutes is null or p_wait_minutes not in (0,10,20,30,45,60)
    or p_crowd_level is null or p_crowd_level not in ('light','moderate','busy')
    or (p_quick_status_tag is not null and p_quick_status_tag not in
      ('line-moving-quickly','ticket-line-only','line-wraps-outside','temporary-delay','entrance-moved')) then
    return jsonb_build_object('kind', 'invalid');
  end if;

  -- Serialize this identity's submissions, including different idempotency keys.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(reporter::text, 0));
  checked_at := clock_timestamp();
  select * into existing from wait_private.wait_reports
    where reporter_id = reporter and submission_key = p_submission_key;
  if found then
    if existing.attraction_id <> p_attraction_id or existing.wait_minutes <> p_wait_minutes
      or existing.crowd_level <> p_crowd_level or existing.quick_status_tag is distinct from p_quick_status_tag then
      return jsonb_build_object('kind', 'idempotency-conflict');
    end if;
    -- An acknowledged retry does not create a new report or refresh its timestamp.
    return jsonb_build_object('kind', 'duplicate', 'reportId', existing.id, 'submittedAt', existing.submitted_at);
  end if;

  select * into strict rules from wait_private.reporting_rules where singleton;
  select * into destination from wait_private.reporting_attractions where id = p_attraction_id and enabled;
  if not found then return jsonb_build_object('kind', 'invalid'); end if;
  if p_mocked is distinct from false or p_latitude is null or p_longitude is null
    or not (p_latitude between -90 and 90) or not (p_longitude between -180 and 180)
    or p_accuracy_meters is null or not (p_accuracy_meters between 0 and rules.maximum_accuracy_meters) then
    return jsonb_build_object('kind', 'location-failed', 'reason', 'inaccurate');
  end if;
  if p_location_timestamp is null or not isfinite(p_location_timestamp)
    or p_location_timestamp > checked_at or checked_at - p_location_timestamp > rules.maximum_age then
    return jsonb_build_object('kind', 'location-failed', 'reason', 'expired');
  end if;
  distance_meters := 2 * 6371000 * asin(sqrt(least(1.0,
    power(sin(radians(destination.latitude - p_latitude) / 2), 2)
    + cos(radians(p_latitude)) * cos(radians(destination.latitude))
    * power(sin(radians(destination.longitude - p_longitude) / 2), 2))));
  if distance_meters > rules.radius_meters then
    return jsonb_build_object('kind', 'location-failed', 'reason', 'outside-radius');
  end if;
  select max(submitted_at) into latest from wait_private.wait_reports
    where reporter_id = reporter and attraction_id = p_attraction_id;
  if latest is not null and checked_at - latest < rules.cooldown then
    return jsonb_build_object('kind', 'cooldown', 'remainingMilliseconds',
      ceil(extract(epoch from (latest + rules.cooldown - checked_at)) * 1000));
  end if;
  insert into wait_private.wait_reports
    (reporter_id, submission_key, attraction_id, wait_minutes, crowd_level, quick_status_tag, submitted_at, accuracy_meters)
    values (reporter, p_submission_key, p_attraction_id, p_wait_minutes, p_crowd_level, p_quick_status_tag, checked_at, p_accuracy_meters)
    returning id into report_id;
  return jsonb_build_object('kind', 'success', 'reportId', report_id, 'submittedAt', checked_at);
end;
$$;
revoke all on function public.submit_wait_report(text,text,integer,text,text,double precision,double precision,double precision,timestamptz,boolean) from public, anon, authenticated;
grant execute on function public.submit_wait_report(text,text,integer,text,text,double precision,double precision,double precision,timestamptz,boolean) to authenticated;
commit;
