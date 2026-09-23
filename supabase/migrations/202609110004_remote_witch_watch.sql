-- Phase 11D: private remote Witch Watch rules, token registry, and durable delivery queue.
begin;

alter table wait_private.reporting_attractions add column display_name text;
update wait_private.reporting_attractions set display_name = case id
  when 'salem-witch-museum' then 'Salem Witch Museum'
  when 'witch-house' then 'The Witch House'
  when 'house-seven-gables' then 'The House of the Seven Gables'
  when 'peabody-essex-museum' then 'Peabody Essex Museum'
  when 'witch-dungeon-museum' then 'Witch Dungeon Museum'
  when 'salem-maritime' then 'Salem Maritime National Historical Park'
  when 'salem-witch-village' then 'Salem Witch Village'
end;
alter table wait_private.reporting_attractions alter column display_name set not null;

create table wait_private.witch_watch_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  alerts_enabled boolean not null default true,
  busy_to_moderate_enabled boolean not null default true,
  moderate_to_light_enabled boolean not null default true,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);

create table wait_private.witch_watches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  attraction_id text not null references wait_private.reporting_attractions(id) on delete cascade,
  enabled boolean not null default true,
  crowd_alert_type text not null check (crowd_alert_type in ('busy-to-moderate', 'moderate-to-light')),
  wait_threshold_minutes integer check (wait_threshold_minutes in (10, 20, 30, 45)),
  last_known_crowd_status text check (last_known_crowd_status in ('light', 'moderate', 'busy')),
  last_known_estimated_wait integer check (last_known_estimated_wait >= 0),
  last_evaluated_revision bigint not null default 0,
  last_triggered_condition text,
  last_triggered_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  unique (user_id, attraction_id)
);
create index witch_watches_enabled_attraction on wait_private.witch_watches (attraction_id, user_id) where enabled;
create index witch_watches_user on wait_private.witch_watches (user_id);

create table wait_private.witch_watch_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null unique check (char_length(expo_push_token) between 20 and 512),
  platform text not null check (platform in ('ios', 'android')),
  enabled boolean not null default true,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  invalidated_at timestamptz
);
create index witch_watch_push_tokens_user on wait_private.witch_watch_push_tokens (user_id) where enabled;

create table wait_private.witch_watch_deliveries (
  id uuid primary key default gen_random_uuid(),
  watch_id uuid not null references wait_private.witch_watches(id) on delete cascade,
  push_token_id uuid not null references wait_private.witch_watch_push_tokens(id) on delete cascade,
  attraction_id text not null references wait_private.reporting_attractions(id) on delete cascade,
  summary_revision bigint not null,
  trigger_kind text not null check (trigger_kind in ('crowd', 'wait')),
  title text not null,
  body text not null,
  notification_data jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'retry', 'sent', 'failed')),
  attempts integer not null default 0,
  available_at timestamptz not null default clock_timestamp(),
  lease_until timestamptz,
  expo_ticket_id text,
  last_error_code text,
  sent_at timestamptz,
  receipt_checked_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  unique (watch_id, push_token_id, summary_revision, trigger_kind)
);
create index witch_watch_deliveries_ready on wait_private.witch_watch_deliveries (available_at, created_at)
  where status in ('pending', 'retry');
create index witch_watch_deliveries_receipts on wait_private.witch_watch_deliveries (sent_at)
  where status = 'sent' and expo_ticket_id is not null and receipt_checked_at is null;

alter table wait_private.witch_watch_preferences enable row level security;
alter table wait_private.witch_watches enable row level security;
alter table wait_private.witch_watch_push_tokens enable row level security;
alter table wait_private.witch_watch_deliveries enable row level security;
revoke all on wait_private.witch_watch_preferences, wait_private.witch_watches,
  wait_private.witch_watch_push_tokens, wait_private.witch_watch_deliveries from public, anon, authenticated;

create function public.register_witch_watch_push_token(p_token text, p_platform text, p_enabled boolean default true)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare watcher uuid := auth.uid(); normalized text := btrim(p_token);
begin
  if watcher is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_platform not in ('ios','android') or normalized !~ '^(Expo|Exponent)PushToken\[[A-Za-z0-9_-]+\]$' then
    return jsonb_build_object('kind','invalid');
  end if;
  insert into wait_private.witch_watch_push_tokens(user_id, expo_push_token, platform, enabled, invalidated_at)
    values(watcher, normalized, p_platform, coalesce(p_enabled,true), null)
  on conflict(expo_push_token) do update set user_id=watcher, platform=excluded.platform,
    enabled=excluded.enabled, invalidated_at=null, updated_at=clock_timestamp();
  return jsonb_build_object('kind','success');
end; $$;

create function public.disable_my_witch_watch_push_tokens() returns void
language sql security definer set search_path = '' as $$
  update wait_private.witch_watch_push_tokens set enabled=false, updated_at=clock_timestamp() where user_id=auth.uid();
$$;

create function public.replace_my_witch_watches(
  p_watches jsonb, p_alerts_enabled boolean, p_busy_to_moderate_enabled boolean,
  p_moderate_to_light_enabled boolean
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare watcher uuid := auth.uid(); item jsonb; seen text[] := '{}';
begin
  if watcher is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if jsonb_typeof(p_watches) <> 'array' or jsonb_array_length(p_watches) > 100 then return jsonb_build_object('kind','invalid'); end if;
  for item in select value from jsonb_array_elements(p_watches) loop
    if item->>'attractionId' is null or item->>'attractionId'=any(seen)
      or not exists(select 1 from wait_private.reporting_attractions where id=item->>'attractionId' and enabled)
      or item->>'crowdAlertType' not in ('busy-to-moderate','moderate-to-light')
      or (item->'waitThresholdMinutes' <> 'null'::jsonb and (item->>'waitThresholdMinutes')::integer not in (10,20,30,45))
      or (item->>'lastKnownCrowdStatus' is not null and item->>'lastKnownCrowdStatus' not in ('light','moderate','busy')) then
      return jsonb_build_object('kind','invalid');
    end if;
    seen := array_append(seen,item->>'attractionId');
  end loop;
  insert into wait_private.witch_watch_preferences(user_id,alerts_enabled,busy_to_moderate_enabled,moderate_to_light_enabled)
    values(watcher,coalesce(p_alerts_enabled,false),coalesce(p_busy_to_moderate_enabled,false),coalesce(p_moderate_to_light_enabled,false))
  on conflict(user_id) do update set alerts_enabled=excluded.alerts_enabled,
    busy_to_moderate_enabled=excluded.busy_to_moderate_enabled,
    moderate_to_light_enabled=excluded.moderate_to_light_enabled,updated_at=clock_timestamp();
  delete from wait_private.witch_watches where user_id=watcher and not(attraction_id=any(seen));
  insert into wait_private.witch_watches(user_id,attraction_id,enabled,crowd_alert_type,wait_threshold_minutes,
    last_known_crowd_status,last_known_estimated_wait)
  select watcher, value->>'attractionId', coalesce((value->>'enabled')::boolean,false), value->>'crowdAlertType',
    (value->>'waitThresholdMinutes')::integer, value->>'lastKnownCrowdStatus',
    (value->>'lastKnownEstimatedWait')::integer from jsonb_array_elements(p_watches)
  on conflict(user_id,attraction_id) do update set enabled=excluded.enabled,crowd_alert_type=excluded.crowd_alert_type,
    wait_threshold_minutes=excluded.wait_threshold_minutes,
    last_known_crowd_status=case when wait_private.witch_watches.enabled=false and excluded.enabled=true then excluded.last_known_crowd_status else wait_private.witch_watches.last_known_crowd_status end,
    last_known_estimated_wait=case when wait_private.witch_watches.enabled=false and excluded.enabled=true then excluded.last_known_estimated_wait else wait_private.witch_watches.last_known_estimated_wait end,
    updated_at=clock_timestamp();
  return jsonb_build_object('kind','success');
exception when invalid_text_representation then return jsonb_build_object('kind','invalid');
end; $$;

revoke all on function public.register_witch_watch_push_token(text,text,boolean), public.disable_my_witch_watch_push_tokens(),
  public.replace_my_witch_watches(jsonb,boolean,boolean,boolean) from public, anon, authenticated;
grant execute on function public.register_witch_watch_push_token(text,text,boolean), public.disable_my_witch_watch_push_tokens(),
  public.replace_my_witch_watches(jsonb,boolean,boolean,boolean) to authenticated;

create function wait_private.evaluate_witch_watches() returns trigger
language plpgsql security definer set search_path = '' as $$
declare current_crowd text; current_wait integer; report_count integer;
begin
  report_count := coalesce((new.summary->>'reportCount')::integer,0);
  current_crowd := case when report_count>0 then new.summary->>'crowdLevel' end;
  current_wait := case when report_count>0 then (new.summary->>'estimatedWaitMinutes')::integer end;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('watch:'||new.attraction_id,0));

  insert into wait_private.witch_watch_deliveries(watch_id,push_token_id,attraction_id,summary_revision,trigger_kind,title,body,notification_data)
  select w.id,t.id,w.attraction_id,new.revision,c.kind,'Witch Watch 🔔',
    case c.kind when 'crowd' then format('%s just changed from %s to %s%s',a.display_name,initcap(w.last_known_crowd_status),
      initcap(current_crowd),case when current_wait is null then '.' else format('. Estimated wait: %s min.',current_wait) end)
      else format('%s is now %s min or less.',a.display_name,w.wait_threshold_minutes) end,
    jsonb_build_object('attractionId',w.attraction_id,'kind','witch-watch')
  from wait_private.witch_watches w
  join wait_private.witch_watch_preferences p on p.user_id=w.user_id and p.alerts_enabled
  join wait_private.witch_watch_push_tokens t on t.user_id=w.user_id and t.enabled
  join wait_private.reporting_attractions a on a.id=w.attraction_id
  cross join lateral (select case
    when (w.crowd_alert_type='busy-to-moderate' and p.busy_to_moderate_enabled and w.last_known_crowd_status='busy' and current_crowd in ('moderate','light'))
      or (w.crowd_alert_type='moderate-to-light' and p.moderate_to_light_enabled and w.last_known_crowd_status='moderate' and current_crowd='light') then 'crowd'
    when w.wait_threshold_minutes is not null and w.last_known_estimated_wait>w.wait_threshold_minutes
      and current_wait is not null and current_wait<=w.wait_threshold_minutes then 'wait' end as kind) c
  where w.enabled and w.attraction_id=new.attraction_id and w.last_evaluated_revision<new.revision and c.kind is not null
  on conflict do nothing;

  update wait_private.witch_watches set last_known_crowd_status=current_crowd,
    last_known_estimated_wait=current_wait,last_evaluated_revision=new.revision,
    last_triggered_condition=case when exists(select 1 from wait_private.witch_watch_deliveries d where d.watch_id=witch_watches.id and d.summary_revision=new.revision)
      then current_crowd||':'||coalesce(current_wait::text,'-') else last_triggered_condition end,
    last_triggered_at=case when exists(select 1 from wait_private.witch_watch_deliveries d where d.watch_id=witch_watches.id and d.summary_revision=new.revision)
      then clock_timestamp() else last_triggered_at end,updated_at=clock_timestamp()
  where attraction_id=new.attraction_id and last_evaluated_revision<new.revision;
  return new;
exception when others then
  -- Optional push evaluation must never roll back the authoritative summary update.
  raise warning 'Witch Watch evaluation deferred: %', sqlstate;
  return new;
end; $$;
revoke all on function wait_private.evaluate_witch_watches() from public, anon, authenticated;
create trigger evaluate_witch_watches after insert or update on public.wait_summary_updates
for each row execute function wait_private.evaluate_witch_watches();

commit;
