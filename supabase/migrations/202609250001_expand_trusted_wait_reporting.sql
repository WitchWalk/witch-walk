-- Expand the trusted wait-reporting allowlist after verifying named visitor
-- check-in points. This migration is deliberately fail-closed: any drift in
-- the existing seven rows or the security boundary aborts the transaction.
begin;

do $$
declare
  expected_ids text[] := array[
    'house-seven-gables',
    'peabody-essex-museum',
    'salem-maritime',
    'salem-witch-museum',
    'salem-witch-village',
    'witch-dungeon-museum',
    'witch-house'
  ];
  actual_ids text[];
  reporting_columns text[];
  rules_columns text[];
  report_columns text[];
  summary_columns text[];
  private_policy_count integer;
begin
  select array_agg(id order by id) into actual_ids
  from wait_private.reporting_attractions;

  if actual_ids is distinct from expected_ids then
    raise exception 'Wait reporting allowlist drift detected; expected the approved seven records.';
  end if;

  if exists (
    select 1
    from wait_private.reporting_attractions
    where not enabled
      or (id = 'salem-witch-museum' and (latitude <> 42.5237449 or longitude <> -70.8911625))
      or (id = 'witch-house' and (latitude <> 42.5215539 or longitude <> -70.8988987))
      or (id = 'house-seven-gables' and (latitude <> 42.5218159 or longitude <> -70.8838227))
      or (id = 'peabody-essex-museum' and (latitude <> 42.5215925 or longitude <> -70.8921931))
      or (id = 'witch-dungeon-museum' and (latitude <> 42.5225674 or longitude <> -70.8971921))
      or (id = 'salem-maritime' and (latitude <> 42.5190589 or longitude <> -70.8855837))
      or (id = 'salem-witch-village' and (latitude <> 42.5204583 or longitude <> -70.8913991))
  ) then
    raise exception 'Existing wait reporting coordinate or enabled-state drift detected.';
  end if;

  select array_agg(column_name order by ordinal_position) into reporting_columns
  from information_schema.columns
  where table_schema = 'wait_private' and table_name = 'reporting_attractions';
  select array_agg(column_name order by ordinal_position) into rules_columns
  from information_schema.columns
  where table_schema = 'wait_private' and table_name = 'reporting_rules';
  select array_agg(column_name order by ordinal_position) into report_columns
  from information_schema.columns
  where table_schema = 'wait_private' and table_name = 'wait_reports';
  select array_agg(column_name order by ordinal_position) into summary_columns
  from information_schema.columns
  where table_schema = 'public' and table_name = 'wait_summary_updates';

  if reporting_columns not in (
      array['id', 'latitude', 'longitude', 'enabled'],
      array['id', 'latitude', 'longitude', 'enabled', 'display_name']
    )
    or rules_columns is distinct from array[
      'singleton', 'radius_meters', 'maximum_accuracy_meters', 'maximum_age', 'cooldown', 'recent_window'
    ]
    or report_columns is distinct from array[
      'id', 'reporter_id', 'submission_key', 'attraction_id', 'wait_minutes', 'crowd_level',
      'quick_status_tag', 'submitted_at', 'accuracy_meters'
    ]
    or summary_columns is distinct from array['attraction_id', 'revision', 'summary', 'evaluated_at']
  then
    raise exception 'Wait reporting schema fingerprint drift detected.';
  end if;

  if (
    select count(*)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'wait_private'
      and c.relname in ('reporting_attractions', 'reporting_rules', 'wait_reports')
      and c.relrowsecurity
  ) <> 3
  or not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'wait_summary_updates' and c.relrowsecurity
  ) then
    raise exception 'Wait reporting RLS fingerprint drift detected.';
  end if;

  select count(*) into private_policy_count
  from pg_policies where schemaname = 'wait_private';
  if private_policy_count <> 0
    or not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'wait_summary_updates'
        and policyname = 'read_safe_wait_summaries' and cmd = 'SELECT'
    ) then
    raise exception 'Wait reporting policy fingerprint drift detected.';
  end if;

  if has_schema_privilege('anon', 'wait_private', 'USAGE')
    or has_schema_privilege('authenticated', 'wait_private', 'USAGE')
    or has_table_privilege('anon', 'wait_private.wait_reports', 'SELECT')
    or has_table_privilege('anon', 'wait_private.wait_reports', 'INSERT')
    or has_table_privilege('anon', 'wait_private.wait_reports', 'UPDATE')
    or has_table_privilege('anon', 'wait_private.wait_reports', 'DELETE')
    or has_table_privilege('authenticated', 'wait_private.wait_reports', 'SELECT')
    or has_table_privilege('authenticated', 'wait_private.wait_reports', 'INSERT')
    or has_table_privilege('authenticated', 'wait_private.wait_reports', 'UPDATE')
    or has_table_privilege('authenticated', 'wait_private.wait_reports', 'DELETE')
  then
    raise exception 'Wait reporting private-access fingerprint drift detected.';
  end if;

  if not has_function_privilege(
      'authenticated',
      'public.submit_wait_report(text,text,integer,text,text,double precision,double precision,double precision,timestamp with time zone,boolean)',
      'EXECUTE'
    )
    or has_function_privilege(
      'anon',
      'public.submit_wait_report(text,text,integer,text,text,double precision,double precision,double precision,timestamp with time zone,boolean)',
      'EXECUTE'
    )
    or not has_function_privilege('anon', 'public.get_wait_summaries()', 'EXECUTE')
    or not has_function_privilege('authenticated', 'public.get_wait_summaries()', 'EXECUTE')
    or not has_function_privilege('anon', 'public.get_wait_snapshot()', 'EXECUTE')
    or not has_function_privilege('authenticated', 'public.get_wait_snapshot()', 'EXECUTE')
  then
    raise exception 'Wait reporting function-grant fingerprint drift detected.';
  end if;

  if position(
      'from wait_private.reporting_attractions where id = p_attraction_id and enabled'
      in lower(pg_get_functiondef(
        'public.submit_wait_report(text,text,integer,text,text,double precision,double precision,double precision,timestamp with time zone,boolean)'::regprocedure
      ))
    ) = 0
    or position(
      'from wait_private.reporting_attractions a'
      in lower(pg_get_functiondef('public.get_wait_summaries()'::regprocedure))
    ) = 0
    or position(
      'where a.enabled'
      in lower(pg_get_functiondef('public.get_wait_summaries()'::regprocedure))
    ) = 0
    or position(
      'public.get_wait_summaries()'
      in lower(pg_get_functiondef('public.get_wait_snapshot()'::regprocedure))
    ) = 0
    or position(
      'public.get_wait_summaries()'
      in lower(pg_get_functiondef('wait_private.refresh_wait_summary()'::regprocedure))
    ) = 0
  then
    raise exception 'Wait reporting function-definition fingerprint drift detected.';
  end if;
end;
$$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'wait_private'
      and table_name = 'reporting_attractions'
      and column_name = 'display_name'
  ) then
    execute $insert$
      insert into wait_private.reporting_attractions
        (id, latitude, longitude, enabled, display_name)
      values
        ('chambers-of-terror', 42.5205259, -70.8885739, true, 'Chambers of Terror'),
        ('count-orloks', 42.5213235, -70.8948752, true, 'Count Orlok''s Nightmare Gallery'),
        ('frankensteins-castle', 42.5204351, -70.8916638, true, 'Frankenstein''s Castle'),
        ('gallows-hill', 42.5221611, -70.8966158, true, 'Gallows Hill Museum/Theatre'),
        ('halloween-museum-of-salem', 42.5220679, -70.8913786, true, 'Halloween Museum of Salem'),
        ('haunted-warren-museum', 42.5212799, -70.896699, true, 'Haunted Warren Museum'),
        ('new-england-pirate-museum', 42.520703, -70.8907714, true, 'New England Pirate Museum'),
        ('real-pirates-salem', 42.519699, -70.8912048, true, 'Real Pirates Salem'),
        ('salem-wax-a-halloween-experience', 42.5202787, -70.8915574, true, 'Salem Wax: A Halloween Experience')
    $insert$;
  else
    insert into wait_private.reporting_attractions (id, latitude, longitude, enabled)
    values
      ('chambers-of-terror', 42.5205259, -70.8885739, true),
      ('count-orloks', 42.5213235, -70.8948752, true),
      ('frankensteins-castle', 42.5204351, -70.8916638, true),
      ('gallows-hill', 42.5221611, -70.8966158, true),
      ('halloween-museum-of-salem', 42.5220679, -70.8913786, true),
      ('haunted-warren-museum', 42.5212799, -70.896699, true),
      ('new-england-pirate-museum', 42.520703, -70.8907714, true),
      ('real-pirates-salem', 42.519699, -70.8912048, true),
      ('salem-wax-a-halloween-experience', 42.5202787, -70.8915574, true);
  end if;
end;
$$;

do $$
declare
  expected_ids text[] := array[
    'chambers-of-terror',
    'count-orloks',
    'frankensteins-castle',
    'gallows-hill',
    'halloween-museum-of-salem',
    'haunted-warren-museum',
    'house-seven-gables',
    'new-england-pirate-museum',
    'peabody-essex-museum',
    'real-pirates-salem',
    'salem-maritime',
    'salem-wax-a-halloween-experience',
    'salem-witch-museum',
    'salem-witch-village',
    'witch-dungeon-museum',
    'witch-house'
  ];
  actual_ids text[];
begin
  select array_agg(id order by id) into actual_ids
  from wait_private.reporting_attractions;

  if actual_ids is distinct from expected_ids then
    raise exception 'Expanded wait reporting allowlist verification failed.';
  end if;
end;
$$;

commit;
