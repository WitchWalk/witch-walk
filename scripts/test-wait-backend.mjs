// Run with PGLITE_MODULE pointing to an externally installed @electric-sql/pglite.
// This creates only an ephemeral database, never connects to the hosted project.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
try {
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    insert into auth.users values ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002');
  `);
  await db.exec(await readFile(new URL('../supabase/migrations/202609110001_wait_report_foundation.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202609110002_shared_wait_read.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202609110003_realtime_wait_summaries.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202609230001_add_salem_witch_village_wait_reporting.sql', import.meta.url), 'utf8'));
  const reportingAttractions = await db.query('select id, latitude, longitude, enabled from wait_private.reporting_attractions order by id');
  assert.equal(reportingAttractions.rows.length, 7);
  assert.deepEqual(
    reportingAttractions.rows.find(row => row.id === 'salem-witch-village'),
    { id: 'salem-witch-village', latitude: 42.5204583, longitude: -70.8913991, enabled: true },
  );
  const identity = async (id = '00000000-0000-0000-0000-000000000001') => {
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
  };
  const submit = async (overrides = {}) => {
    const input = { attraction: 'witch-house', key: 'first', wait: 20, crowd: 'moderate', tag: null,
      lat: 42.5215539, lng: -70.8988987, accuracy: 10, timestamp: new Date().toISOString(), mocked: false, ...overrides };
    const result = await db.query('select public.submit_wait_report($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) as result', Object.values(input));
    return result.rows[0].result;
  };
  await identity();
  await db.exec('set role anon');
  const read = async () => (await db.query('select public.get_wait_summaries() as summaries')).rows[0].summaries;
  assert.ok((await read()).every(row => row.reportCount === 0 && row.estimatedWaitMinutes === null));
  await assert.rejects(submit());
  await assert.rejects(db.query('select * from wait_private.wait_reports'));
  await db.exec('reset role; set role authenticated');
  await assert.rejects(db.query('select * from wait_private.wait_reports'));
  await assert.rejects(db.query("delete from wait_private.wait_reports"));
  await assert.rejects(db.query("update wait_private.reporting_rules set radius_meters = 99999"));
  await identity('');
  await assert.rejects(submit());
  await identity();
  const first = await submit();
  assert.equal(first.kind, 'success');
  const updates = await db.query("select summary, revision from public.wait_summary_updates where attraction_id='witch-house'");
  assert.equal(updates.rows[0].summary.reportCount,1,'Trigger sees the accepted report');
  assert.equal(updates.rows[0].summary.estimatedWaitMinutes,20);
  await assert.rejects(db.query("update public.wait_summary_updates set summary='{}'"));
  await assert.rejects(db.query("delete from public.wait_summary_updates"));
  await assert.rejects(db.query("insert into public.wait_summary_updates(attraction_id,summary) values ('fake','{}')"));
  const retry = await submit();
  assert.equal(retry.kind, 'duplicate');
  assert.equal(retry.reportId, first.reportId);
  assert.equal(retry.submittedAt, first.submittedAt);
  assert.equal((await db.query("select revision from public.wait_summary_updates where attraction_id='witch-house'")).rows[0].revision,updates.rows[0].revision,'Duplicate does not emit a new update');
  assert.equal((await submit({ wait: 30 })).kind, 'idempotency-conflict');
  assert.equal((await submit({ key: 'second' })).kind, 'cooldown');
  assert.equal((await submit({ attraction: 'salem-witch-village', key: 'village', lat: 42.5204583, lng: -70.8913991 })).kind, 'success');
  for (const invalid of [{ wait: 5 }, { wait: null }, { crowd: 'fake' }, { crowd: null },
    { tag: 'free text' }, { key: '' }, { key: 'x'.repeat(129) }, { attraction: 'not-allowed' }]) {
    assert.equal((await submit({ key: 'invalid', ...invalid })).kind, 'invalid');
  }
  for (const invalid of [{ lat: 0 }, { accuracy: 51 }, { accuracy: -1 }, { accuracy: null },
    { lat: 'NaN' }, { lng: 'Infinity' }, { mocked: true }, { mocked: null },
    { timestamp: new Date(Date.now() - 60000).toISOString() },
    { timestamp: new Date(Date.now() + 60000).toISOString() }, { timestamp: 'infinity' }]) {
    assert.equal((await submit({ key: 'gps', ...invalid })).kind, 'location-failed');
  }
  await identity('00000000-0000-0000-0000-000000000002');
  assert.equal((await submit()).kind, 'success');
  await identity();
  await db.exec("reset role; update wait_private.wait_reports set submitted_at = clock_timestamp() - interval '11 minutes'; set role authenticated");
  assert.equal((await submit({ key: 'after-cooldown' })).kind, 'success');
  const rapid = await Promise.all([submit({ key: 'rapid' }), submit({ key: 'rapid' })]);
  assert.ok(rapid.every((result) => result.kind === 'cooldown'));
  await identity('00000000-0000-0000-0000-000000000002');
  const firstRapid = await Promise.all([submit({ key: 'new-rapid' }), submit({ key: 'new-rapid' })]);
  assert.deepEqual(firstRapid.map((result) => result.kind), ['success', 'duplicate']);
  assert.equal(firstRapid[0].reportId, firstRapid[1].reportId);
  await db.exec('reset role');
  assert.equal((await db.query('select count(*)::int as count from wait_private.wait_reports')).rows[0].count, 5);
  await db.exec('set role anon');
  const summaries = await read();
  const house = summaries.find(row => row.attractionId === 'witch-house');
  assert.equal(house.reportCount, 2, 'Only latest contribution per identity');
  assert.equal(house.estimatedWaitMinutes, 20);
  assert.equal(house.crowdLevel, 'moderate');
  assert.deepEqual(Object.keys(house).sort(), ['attractionId','crowdLevel','estimatedWaitMinutes','newestReportTimestamp','quickStatusTag','reportCount','waitSpreadMinutes'].sort());
  await db.exec("reset role; update wait_private.wait_reports set wait_minutes=60, crowd_level='busy' where reporter_id='00000000-0000-0000-0000-000000000002'; set role anon");
  const mixed = (await read()).find(row => row.attractionId === 'witch-house');
  assert.equal(mixed.estimatedWaitMinutes,40,'Median of latest contributions, rounded to five');
  assert.equal(mixed.crowdLevel,'busy','Existing median crowd tie-break');
  await db.exec("reset role; update wait_private.wait_reports set submitted_at=clock_timestamp()-interval '31 minutes'; set role anon");
  assert.ok((await read()).every(row => row.reportCount === 0));
  const snapshot=(await db.query('select public.get_wait_snapshot() as value')).rows[0].value;
  assert.ok(snapshot.every(row=>row.summary.reportCount===0));
  assert.ok(snapshot.every(row=>Object.keys(row).sort().join(',')==='evaluated_at,revision,summary'));

  // Remote Witch Watch tables remain private; authenticated users use only scoped RPCs.
  await db.exec('reset role');
  await db.exec(await readFile(new URL('../supabase/migrations/202609110004_remote_witch_watch.sql', import.meta.url), 'utf8'));
  assert.equal((await db.query("select display_name from wait_private.reporting_attractions where id='salem-witch-village'")).rows[0].display_name, 'Salem Witch Village');
  await db.exec('reset role; set role authenticated');
  await identity();
  await assert.rejects(db.query('select * from wait_private.witch_watch_push_tokens'));
  await assert.rejects(db.query('select * from wait_private.witch_watches'));
  const register = async (token, platform='ios') => (await db.query(
    'select public.register_witch_watch_push_token($1,$2,true) as result',[token,platform])).rows[0].result;
  assert.equal((await register('not-a-token')).kind,'invalid');
  const tokenOne='ExpoPushToken[abcdefghijklmnopQRSTUV_123]';
  assert.equal((await register(tokenOne)).kind,'success');
  assert.equal((await register(tokenOne)).kind,'success','Duplicate registration is idempotent');
  const replace = async (list, preferences={alerts:true,busy:true,light:true}) => (await db.query(
    'select public.replace_my_witch_watches($1::jsonb,$2,$3,$4) as result',
    [JSON.stringify(list),preferences.alerts,preferences.busy,preferences.light])).rows[0].result;
  const watch=(id='witch-house',rule='busy-to-moderate',wait=20)=>({attractionId:id,enabled:true,crowdAlertType:rule,
    waitThresholdMinutes:wait,lastKnownCrowdStatus:'busy',lastKnownEstimatedWait:45});
  assert.equal((await replace([watch()])).kind,'success');
  assert.equal((await replace([{...watch(),waitThresholdMinutes:15}])).kind,'invalid');

  await db.exec('reset role');
  const summary = (crowd,wait,count=1)=>JSON.stringify({attractionId:'witch-house',crowdLevel:crowd,
    estimatedWaitMinutes:wait,reportCount:count,newestReportTimestamp:new Date().toISOString(),quickStatusTag:null,waitSpreadMinutes:0});
  await db.query("update public.wait_summary_updates set summary=$1::jsonb,revision=default where attraction_id='witch-house'",[summary('moderate',20)]);
  assert.equal((await db.query('select count(*)::int count from wait_private.witch_watch_deliveries')).rows[0].count,1,'Red to yellow creates one delivery even if wait also crossed');
  await db.query("update public.wait_summary_updates set summary=$1::jsonb,revision=default where attraction_id='witch-house'",[summary('moderate',15)]);
  assert.equal((await db.query('select count(*)::int count from wait_private.witch_watch_deliveries')).rows[0].count,1,'Remaining below threshold does not repeat');
  await db.query("update public.wait_summary_updates set summary=$1::jsonb,revision=default where attraction_id='witch-house'",[summary('busy',45)]);
  await db.query("update public.wait_summary_updates set summary=$1::jsonb,revision=default where attraction_id='witch-house'",[summary('moderate',20)]);
  assert.equal((await db.query('select count(*)::int count from wait_private.witch_watch_deliveries')).rows[0].count,2,'Re-armed transition notifies again');

  // A second user receives an independent queued delivery; disabled preferences do not queue.
  await db.exec('set role authenticated'); await identity('00000000-0000-0000-0000-000000000002');
  assert.equal((await register('ExpoPushToken[second_user_token_123456]')).kind,'success');
  const lightWatch={...watch('witch-house','moderate-to-light',null),lastKnownCrowdStatus:'moderate',lastKnownEstimatedWait:20};
  assert.equal((await replace([lightWatch])).kind,'success');
  await db.exec('reset role');
  await db.query("update public.wait_summary_updates set summary=$1::jsonb,revision=default where attraction_id='witch-house'",[summary('light',10)]);
  assert.equal((await db.query('select count(*)::int count from wait_private.witch_watch_deliveries')).rows[0].count,3,'Second user moderate to light delivery');
  await db.exec('set role authenticated');
  assert.equal((await replace([lightWatch],{alerts:false,busy:true,light:true})).kind,'success');
  await db.exec('reset role');
  await db.query("update public.wait_summary_updates set summary=$1::jsonb,revision=default where attraction_id='witch-house'",[summary('moderate',20)]);
  await db.query("update public.wait_summary_updates set summary=$1::jsonb,revision=default where attraction_id='witch-house'",[summary('light',10)]);
  assert.equal((await db.query('select count(*)::int count from wait_private.witch_watch_deliveries')).rows[0].count,3,'Disabled notifications remain silent');
  await db.exec('set role authenticated'); await db.query('select public.disable_my_witch_watch_push_tokens()'); await db.exec('reset role');
  assert.equal((await db.query("select count(*)::int count from wait_private.witch_watch_push_tokens where enabled")).rows[0].count,1);
  console.log('PASS: wait backend plus private watches, token dedupe, transitions, re-arm, disabled alerts, and multi-user queues');
} finally {
  await db.close();
}
