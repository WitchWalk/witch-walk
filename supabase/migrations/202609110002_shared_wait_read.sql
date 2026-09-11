begin;
alter table wait_private.reporting_rules add column recent_window interval not null default interval '30 minutes' check (recent_window > interval '0');

-- Only summaries leave the private schema. No caller-selected identity or time.
create function public.get_wait_summaries() returns jsonb
language sql stable security definer set search_path = '' as $$
  with recent as (
    -- One latest contribution per identity avoids repeated reports dominating a window.
    select distinct on (r.reporter_id, r.attraction_id) r.*
    from wait_private.wait_reports r cross join wait_private.reporting_rules rules
    where r.submitted_at >= statement_timestamp() - rules.recent_window
      and r.submitted_at <= statement_timestamp()
    order by r.reporter_id, r.attraction_id, r.submitted_at desc, r.id
  ), stats as (
    select attraction_id, count(*) as total,
      least(60, round((percentile_cont(0.5) within group (order by wait_minutes))::numeric / 5) * 5) as estimate,
      max(submitted_at) as newest, max(wait_minutes)-min(wait_minutes) as spread
    from recent group by attraction_id
  ), crowds as (
    select attraction_id, crowd_level, count(*) as total,
      case crowd_level when 'light' then 0 when 'moderate' then 1 else 2 end as rank
    from recent group by attraction_id, crowd_level
  ), winning_crowds as (
    select c.* from crowds c where c.total = (select max(c2.total) from crowds c2 where c2.attraction_id=c.attraction_id)
  ), crowd as (
    select attraction_id, (array['light','moderate','busy'])[1 + round((percentile_cont(0.5) within group(order by rank))::numeric)::integer] as level
    from winning_crowds group by attraction_id
  ), tags as (
    select distinct on (attraction_id) attraction_id, quick_status_tag
    from recent where quick_status_tag is not null
    group by attraction_id, quick_status_tag
    order by attraction_id, count(*) desc, max(submitted_at) desc, quick_status_tag
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'attractionId', a.id, 'estimatedWaitMinutes', s.estimate,
    'crowdLevel', c.level, 'newestReportTimestamp', extract(epoch from s.newest)*1000,
    'reportCount', coalesce(s.total,0), 'quickStatusTag', t.quick_status_tag,
    'waitSpreadMinutes', s.spread
  ) order by a.id), '[]'::jsonb)
  from wait_private.reporting_attractions a
  left join stats s on s.attraction_id=a.id
  left join crowd c on c.attraction_id=a.id
  left join tags t on t.attraction_id=a.id
  where a.enabled;
$$;
revoke all on function public.get_wait_summaries() from public, anon, authenticated;
grant execute on function public.get_wait_summaries() to anon, authenticated;
commit;
