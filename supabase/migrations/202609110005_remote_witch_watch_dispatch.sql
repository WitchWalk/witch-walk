-- Phase 11D deployment infrastructure. Requires Vault secrets documented in PHASE-11D.md.
begin;
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

create function public.claim_witch_watch_deliveries(p_limit integer default 100) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'Forbidden' using errcode='42501'; end if;
  with claimed as (
    select id from wait_private.witch_watch_deliveries
    where ((status in ('pending','retry') and available_at<=clock_timestamp())
      or (status='processing' and lease_until<clock_timestamp()))
      and exists(select 1 from wait_private.witch_watch_push_tokens t where t.id=push_token_id and t.enabled)
    order by created_at for update skip locked limit least(greatest(p_limit,1),100)
  ), changed as (
    update wait_private.witch_watch_deliveries d set status='processing',attempts=attempts+1,
      lease_until=clock_timestamp()+interval '2 minutes',updated_at=clock_timestamp()
    from claimed where d.id=claimed.id
    returning d.id,d.push_token_id,d.title,d.body,d.notification_data,d.attempts
  ) select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'to',t.expo_push_token,'title',c.title,
      'body',c.body,'data',c.notification_data,'attempts',c.attempts)),'[]'::jsonb) into result
    from changed c join wait_private.witch_watch_push_tokens t on t.id=c.push_token_id and t.enabled;
  return result;
end; $$;

create function public.complete_witch_watch_deliveries(p_results jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'Forbidden' using errcode='42501'; end if;
  if jsonb_typeof(p_results)<>'array' then raise exception 'Invalid results'; end if;
  update wait_private.witch_watch_deliveries d set
    status=case when r.value->>'status'='sent' then 'sent'
      when d.attempts<5 and r.value->>'errorCode' not in ('DeviceNotRegistered','InvalidCredentials') then 'retry' else 'failed' end,
    expo_ticket_id=nullif(r.value->>'ticketId',''),last_error_code=nullif(r.value->>'errorCode',''),
    sent_at=case when r.value->>'status'='sent' then clock_timestamp() else d.sent_at end,
    available_at=case when r.value->>'status'<>'sent' then clock_timestamp()+make_interval(secs=>least(900,power(2,d.attempts)::integer*15)) else d.available_at end,
    lease_until=null,updated_at=clock_timestamp()
  from jsonb_array_elements(p_results) r where d.id=(r.value->>'id')::uuid and d.status='processing';
  update wait_private.witch_watch_push_tokens t set enabled=false,invalidated_at=clock_timestamp(),updated_at=clock_timestamp()
    where exists(select 1 from wait_private.witch_watch_deliveries d where d.push_token_id=t.id and d.last_error_code='DeviceNotRegistered');
end; $$;

create function public.claim_witch_watch_receipts(p_limit integer default 300) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'Forbidden' using errcode='42501'; end if;
  with claimed as (
    select id from wait_private.witch_watch_deliveries where status='sent' and expo_ticket_id is not null
      and receipt_checked_at is null and sent_at<clock_timestamp()-interval '15 seconds'
      and (lease_until is null or lease_until<clock_timestamp())
    order by sent_at for update skip locked limit least(greatest(p_limit,1),300)
  ), changed as (
    update wait_private.witch_watch_deliveries d set lease_until=clock_timestamp()+interval '2 minutes',updated_at=clock_timestamp()
      from claimed where d.id=claimed.id returning d.id,d.expo_ticket_id,d.push_token_id
  ) select coalesce(jsonb_agg(jsonb_build_object('id',id,'ticketId',expo_ticket_id,'pushTokenId',push_token_id)),'[]'::jsonb)
    into result from changed;
  return result;
end; $$;

create function public.complete_witch_watch_receipts(p_results jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'Forbidden' using errcode='42501'; end if;
  update wait_private.witch_watch_deliveries d set last_error_code=nullif(r.value->>'errorCode',''),
    status=case when r.value->>'status'='ok' then 'sent' else 'failed' end,
    receipt_checked_at=clock_timestamp(),lease_until=null,updated_at=clock_timestamp()
  from jsonb_array_elements(p_results) r where d.id=(r.value->>'id')::uuid;
  update wait_private.witch_watch_push_tokens t set enabled=false,invalidated_at=clock_timestamp(),updated_at=clock_timestamp()
    where exists(select 1 from wait_private.witch_watch_deliveries d where d.push_token_id=t.id and d.last_error_code='DeviceNotRegistered');
end; $$;

revoke all on function public.claim_witch_watch_deliveries(integer), public.complete_witch_watch_deliveries(jsonb),
  public.claim_witch_watch_receipts(integer), public.complete_witch_watch_receipts(jsonb) from public, anon, authenticated;
grant execute on function public.claim_witch_watch_deliveries(integer), public.complete_witch_watch_deliveries(jsonb),
  public.claim_witch_watch_receipts(integer), public.complete_witch_watch_receipts(jsonb) to service_role;

create function wait_private.invoke_witch_watch_dispatch() returns void
language plpgsql security definer set search_path = '' as $$
declare endpoint text; secret text;
begin
  select decrypted_secret into endpoint from vault.decrypted_secrets where name='witch_watch_dispatch_url';
  select decrypted_secret into secret from vault.decrypted_secrets where name='witch_watch_dispatch_secret';
  if endpoint is null or secret is null then return; end if;
  perform net.http_post(url=>endpoint,headers=>jsonb_build_object('content-type','application/json','x-witch-watch-secret',secret),body=>'{}'::jsonb,timeout_milliseconds=>10000);
exception when others then raise warning 'Witch Watch dispatch invocation deferred: %',sqlstate;
end; $$;
revoke all on function wait_private.invoke_witch_watch_dispatch() from public, anon, authenticated;

select cron.schedule('witch-watch-dispatch','* * * * *',$$select wait_private.invoke_witch_watch_dispatch();$$);
commit;
