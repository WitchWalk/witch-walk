-- Add one approved reporting destination without changing report security or RLS.
begin;

do $$
declare
  expected_ids text[] := array[
    'house-seven-gables',
    'peabody-essex-museum',
    'salem-maritime',
    'salem-witch-museum',
    'witch-dungeon-museum',
    'witch-house'
  ];
  actual_ids text[];
begin
  select array_agg(id order by id) into actual_ids
  from wait_private.reporting_attractions;

  if actual_ids is distinct from expected_ids then
    raise exception 'Wait reporting allowlist drift detected; expected the approved six records.';
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
  ) then
    raise exception 'Wait reporting allowlist coordinate or enabled-state drift detected.';
  end if;

  if not exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'wait_private'
      and c.relname in ('reporting_attractions', 'reporting_rules', 'wait_reports')
      and c.relrowsecurity
    group by n.nspname
    having count(*) = 3
  ) then
    raise exception 'Expected private wait-reporting RLS protections are not active.';
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
        ('salem-witch-village', 42.5204583, -70.8913991, true, 'Salem Witch Village')
    $insert$;
  else
    insert into wait_private.reporting_attractions (id, latitude, longitude, enabled)
    values ('salem-witch-village', 42.5204583, -70.8913991, true);
  end if;
end;
$$;

do $$
begin
  if (select count(*) from wait_private.reporting_attractions) <> 7
    or not exists (
      select 1 from wait_private.reporting_attractions
      where id = 'salem-witch-village'
        and latitude = 42.5204583
        and longitude = -70.8913991
        and enabled
    ) then
    raise exception 'Salem Witch Village wait-reporting migration verification failed.';
  end if;
end;
$$;

commit;
