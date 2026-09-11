// Explicit opt-in only: two temporary anonymous identities and an isolated test location.
// Never prints credentials. Cleanup deletes only IDs created by this invocation.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { createClient } = require('@supabase/supabase-js');

if (process.env.WITCH_WALK_ALLOW_LIVE_TEST !== 'yes') throw Error('Live test requires explicit opt-in');
const location = `integration-test-${randomUUID()}`;
const users = [];
let stage = 'initial read';
const stores = [new Map(), new Map()];
const clients = stores.map((store, index) => createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: true, detectSessionInUrl: false, storageKey: `ww-test-${index}`,
    storage: { getItem: key => store.get(key) ?? null, setItem: (key,value) => store.set(key,value), removeItem: key => store.delete(key) } },
  global: { fetch: (input,init) => fetch(input,{...init,signal:AbortSignal.timeout(15000)}) },
}));
const sql = query => execFileSync('pnpm',['--config.manage-package-manager-versions=false','dlx','supabase','db','query','--linked','--agent','no',query],{stdio:'pipe',timeout:90000});
const read = async client => {
  const {data,error} = await client.rpc('get_wait_summaries');
  assert.equal(error,null); assert.ok(Array.isArray(data)); return data;
};
const submit = async (override={},client=clients[0]) => {
  const {data,error}=await client.rpc('submit_wait_report',{
    p_attraction_id:location,p_submission_key:'first',p_wait_minutes:20,p_crowd_level:'moderate',p_quick_status_tag:null,
    p_latitude:42.5215539,p_longitude:-70.8988987,p_accuracy_meters:10,
    p_location_timestamp:new Date().toISOString(),p_mocked:false,...override,
  });
  assert.equal(error,null); return data;
};
(async()=>{
  let fixture=false;
  let realtimeChannel;
  try {
    await read(clients[0]); // Public read works without creating an account.
    for (const client of clients) {
      const {data,error}=await client.auth.signInAnonymously();
      assert.equal(error,null); assert.ok(data.session); users.push(data.user.id);
    }
    assert.notEqual(users[0],users[1]);
    sql(`insert into wait_private.reporting_attractions(id,latitude,longitude) values ('${location}',42.5215539,-70.8988987)`);
    fixture=true;
    const empty=(await read(clients[1])).find(row=>row.attractionId===location);
    assert.equal(empty.reportCount,0); assert.equal(empty.crowdLevel,null);
    const received=[];
    if(process.env.WITCH_WALK_REALTIME_TEST==='yes') {
      stage = 'Realtime subscription';
      await new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>reject(Error('Realtime subscribe timed out')),20000);
        realtimeChannel=clients[1].channel(`test-${location}`).on('postgres_changes',{
          event:'*',schema:'public',table:'wait_summary_updates',filter:`attraction_id=eq.${location}`,
        },event=>received.push(event.new)).subscribe(status=>{
          console.log('Realtime status:', status);
          if(status==='SUBSCRIBED'){clearTimeout(timer);resolve();}
          if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){clearTimeout(timer);reject(Error('Realtime unavailable'));}
        });
      });
    }
    stage = 'input validation';
    for(const override of [{p_wait_minutes:1},{p_crowd_level:'invalid'},{p_quick_status_tag:'custom text'}]) {
      assert.equal((await submit(override)).kind,'invalid');
    }
    for(const override of [{p_latitude:0},{p_accuracy_meters:99},{p_location_timestamp:new Date(Date.now()-60000).toISOString()}]) {
      assert.equal((await submit(override)).kind,'location-failed');
    }
    stage = 'valid submission';
    const first=await submit(); assert.equal(first.kind,'success');
    if(realtimeChannel) {
      stage = 'Realtime event delivery';
      const deadline=Date.now()+20000;
      while(!received.length && Date.now()<deadline) await new Promise(resolve=>setTimeout(resolve,100));
      assert.ok(received.length,'Second session receives event without fetching');
      assert.equal(received[0].summary.estimatedWaitMinutes,20);
      assert.equal(received[0].summary.crowdLevel,'moderate');
      assert.deepEqual(Object.keys(received[0]).sort(),['attraction_id','evaluated_at','revision','summary']);
      console.log('PASS: second session received sanitized Realtime summary without manual refresh');
    }
    const duplicate=await submit(); assert.equal(duplicate.kind,'duplicate'); assert.equal(duplicate.reportId,first.reportId);
    assert.equal((await submit({p_submission_key:'second'})).kind,'cooldown');
    const shared=(await read(clients[1])).find(row=>row.attractionId===location);
    assert.equal(shared.estimatedWaitMinutes,20); assert.equal(shared.crowdLevel,'moderate'); assert.equal(shared.reportCount,1);
    assert.deepEqual(Object.keys(shared).sort(),['attractionId','crowdLevel','estimatedWaitMinutes','newestReportTimestamp','quickStatusTag','reportCount','waitSpreadMinutes'].sort());
    for(const client of clients) {
      const {error}=await client.schema('wait_private').from('wait_reports').select('*');
      assert.ok(error,'Raw reports must not be publicly readable');
    }
    const restored=createClient(process.env.EXPO_PUBLIC_SUPABASE_URL,process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{
      auth:{autoRefreshToken:false,persistSession:true,detectSessionInUrl:false,storageKey:'ww-test-0',
        storage:{getItem:key=>stores[0].get(key)??null,setItem:(key,value)=>stores[0].set(key,value),removeItem:key=>stores[0].delete(key)}}});
    assert.equal((await restored.auth.getSession()).data.session.user.id,users[0]);
    await restored.auth.stopAutoRefresh();
    if(realtimeChannel) {
      stage='Reconnect reconciliation';
      await clients[1].removeChannel(realtimeChannel);
      assert.equal((await submit({p_submission_key:'while-disconnected',p_wait_minutes:30},clients[1])).kind,'success');
      await new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>reject(Error('Reconnect timeout')),20000);
        realtimeChannel=clients[1].channel(`reconnect-${location}`).on('postgres_changes',{
          event:'*',schema:'public',table:'wait_summary_updates',filter:`attraction_id=eq.${location}`,
        },()=>{}).subscribe(status=>{
          if(status==='SUBSCRIBED'){clearTimeout(timer);resolve();}
          if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){clearTimeout(timer);reject(Error('Reconnect failed'));}
        });
      });
      const {data,error}=await clients[1].rpc('get_wait_snapshot');
      assert.equal(error,null);
      const recovered=data.find(row=>row.summary.attractionId===location).summary;
      assert.equal(recovered.reportCount,2);assert.equal(recovered.estimatedWaitMinutes,25);
      console.log('PASS: reconnect snapshot recovered a report submitted while unsubscribed');
    }
    console.log('PASS: live anonymous sessions, session rehydration, safe public reads, GPS/input rejection, valid RPC, duplicate/cooldown, two-session visibility');
  } finally {
    if(realtimeChannel) await clients[1].removeChannel(realtimeChannel);
    const safeUsers=users.filter(id=>/^[0-9a-f-]{36}$/.test(id));
    if (safeUsers.length || fixture) {
      sql(`begin; ${safeUsers.length ? `delete from auth.users where id in (${safeUsers.map(id=>`'${id}'`).join(',')});` : ''} ${fixture ? `delete from wait_private.reporting_attractions where id='${location}';` : ''} commit;`);
      assert.ok(!(await read(clients[1])).some(row=>row.attractionId===location));
      console.log('PASS: temporary identities, report, and test location removed');
    }
    for(const client of clients) { await client.auth.stopAutoRefresh(); client.realtime.disconnect(); }
  }
})().catch(()=>{console.error(`Live test failed at ${stage}; credentials are omitted.`);process.exitCode=1;});
