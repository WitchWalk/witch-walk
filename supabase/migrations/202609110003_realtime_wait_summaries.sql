begin;
-- Reuse the single authoritative aggregation implementation inside write triggers.
alter function public.get_wait_summaries() volatile;
-- Reports receive clock_timestamp(), which can be later than the enclosing
-- INSERT statement's start. Use the current clock so its AFTER trigger includes it.
do $$ begin
  execute replace(pg_get_functiondef('public.get_wait_summaries()'::regprocedure),
    'statement_timestamp()', 'clock_timestamp()');
end $$;
create table public.wait_summary_updates (
  attraction_id text primary key references wait_private.reporting_attractions(id) on delete cascade,
  revision bigint generated always as identity,
  summary jsonb not null,
  evaluated_at timestamptz not null default clock_timestamp()
);
alter table public.wait_summary_updates enable row level security;
revoke all on public.wait_summary_updates from public, anon, authenticated;
grant select on public.wait_summary_updates to anon, authenticated;
create policy read_safe_wait_summaries on public.wait_summary_updates for select to anon, authenticated using (true);

create function wait_private.refresh_wait_summary() returns trigger
language plpgsql security definer set search_path = '' as $$
declare location_id text; safe_summary jsonb;
begin
  location_id := case when TG_OP='DELETE' then OLD.attraction_id else NEW.attraction_id end;
  -- Cross-identity reports to one attraction are serialized before aggregation.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('summary:' || location_id, 0));
  select value into safe_summary from jsonb_array_elements(public.get_wait_summaries()) where value->>'attractionId'=location_id;
  if safe_summary is not null then
    insert into public.wait_summary_updates(attraction_id,summary) values(location_id,safe_summary)
    on conflict(attraction_id) do update set summary=excluded.summary, revision=default, evaluated_at=clock_timestamp();
  end if;
  return null;
exception when others then
  -- Availability of optional Realtime must not prevent an otherwise valid report.
  -- Normal summary reads remain authoritative and repair client state on refresh.
  raise warning 'Wait summary notification deferred';
  return null;
end;
$$;
revoke all on function wait_private.refresh_wait_summary() from public, anon, authenticated;
create trigger refresh_wait_summary after insert or update or delete on wait_private.wait_reports
for each row execute function wait_private.refresh_wait_summary();

-- Fresh reads always recalculate expiration; the table is only an event transport.
create function public.get_wait_snapshot() returns jsonb
language sql volatile security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('summary',s.value,'revision',coalesce(u.revision,0),
    'evaluated_at',clock_timestamp())), '[]'::jsonb)
  from jsonb_array_elements(public.get_wait_summaries()) s
  left join public.wait_summary_updates u on u.attraction_id=s.value->>'attractionId';
$$;
revoke all on function public.get_wait_snapshot() from public, anon, authenticated;
grant execute on function public.get_wait_snapshot() to anon, authenticated;
do $$ begin
  if not exists (select 1 from pg_publication where pubname='supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;
alter publication supabase_realtime add table public.wait_summary_updates;
commit;
