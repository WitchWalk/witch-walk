/* global __dirname */
// One actual checkpointed app controller per simulated device. No database mutations.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { monitorEventLoopDelay } = require('node:perf_hooks');
const { createClient } = require('@supabase/supabase-js');
const root = path.resolve(__dirname, '../..');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const percentile = (values, p) => {
  const sorted = [...values].sort((a,b) => a-b);
  return sorted.length ? sorted[Math.min(sorted.length-1, Math.floor(sorted.length*p))] : null;
};
function loadModule(filename, extra = '', typescript = false) {
  const m = new Module(filename, module);
  m.filename = filename; m.paths = Module._nodeModulePaths(path.dirname(filename));
  let source = fs.readFileSync(filename, 'utf8') + extra;
  if (filename.endsWith('stage3-revised-readonly-soak.cjs')) source = source.replace('buildSecuritySql()',
    `buildSecuritySql().replace("'trusted',", "'trustedCount',(select count(*) from wait_private.reporting_attractions),'trusted',")`);
  m._compile(typescript ? ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText : source, filename);
  return m.exports;
}
async function main() {
  // Load existing read-only baseline helpers without invoking their soak entrypoint.
  const { snapshot, compareBaseline, workerLoop, summarizeWithEndpoints, summarizeSamples, queries, measured } = loadModule(path.join(__dirname, 'stage3-revised-readonly-soak.cjs'), '\nmodule.exports = {snapshot,compareBaseline,workerLoop,summarizeWithEndpoints,summarizeSamples,queries,measured};');
  const { createWaitRealtimeController } = loadModule(path.join(root, 'src/services/waitRealtimeCore.ts'), '', true);
  if(!/remoteWitchWatchEnabled\s*=\s*false/.test(fs.readFileSync(path.join(root,'src/config/witchWatchBackend.ts'),'utf8'))) throw Error('Remote Witch Watch must remain disabled');
  const checkpoint='a5ce75f4db6acfba9fb65ce14c51bb677c5d8152';
  for (const ref of ['HEAD','realtime-recovery-hardening-complete']) {
    if(execFileSync('git',['rev-parse',ref],{cwd:root,encoding:'utf8'}).trim()!==checkpoint) throw Error('Checkpoint mismatch');
  }
  for(const file of ['src/services/waitRealtimeCore.ts','src/services/waitRealtime.ts']) {
    if(!fs.readFileSync(path.join(root,file)).equals(execFileSync('git',['show',checkpoint+':'+file],{cwd:root}))) throw Error('Runtime differs from checkpoint');
  }
  const env = Object.fromEntries(fs.readFileSync(path.join(root, '.env'), 'utf8').split(/\r?\n/)
    .map(line => line.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map(m => [m[1], m[2].replace(/^['"]|['"]$/g, '')]));
  const key = env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, url = env.EXPO_PUBLIC_SUPABASE_URL;
  const safe = value => String(value ?? '').split(key).join('[redacted]')
    .replace(/eyJ[A-Za-z0-9_.-]+/g, '[redacted-token]').replace(/https?:\/\/\S+/g, '[url]').slice(0,1000);
  const result = { startedAt: new Date().toISOString(), sourceCommit: 'a5ce75f4db6acfba9fb65ce14c51bb677c5d8152',
    writes: false, preflight:{plan:'Pro',maxConcurrentClients:500,verifiedBy:'Reloaded linked production Supabase dashboard before run',projectRef:'nhpneydrmwhhfypvdwkb'}, controllerSourceHash: crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'src/services/waitRealtimeCore.ts'))).digest('hex'),
    concurrency: 300, maximumMinutes: 30, events: [], probes: [], samples: [], baselineChecks: [] };
  const states = [], clients = [], controllers = [], pendingCleanup = new Set();
  const probeResults = new Map();
  const requestSamples=[], mixedSamples=[], workers=[], screenTimers=[], pendingReads=new Set();
  const workerAbort=new AbortController();
  const duration=30*60000;
  const lag = monitorEventLoopDelay({ resolution: 20 }); lag.enable();
  let closing = false, stopRequested = false, phaseStart;
  const started = Date.now();
  let connectionLimitErrors=0,subscriptionTimeouts=0;
  const event = (id, type, details = {}) => {
    result.events.push({ ms: Date.now()-started, id, type, ...details });
    if(type==='status' && /ConnectionRateLimitReached/.test(details.message||'')) {
      connectionLimitErrors++;
      if(connectionLimitErrors>=2) { stopRequested=true;result.safetyStop='Repeated ConnectionRateLimitReached'; }
    }
    if(type==='status' && details.status==='TIMED_OUT') {
      subscriptionTimeouts++;
      if(result.events.filter(e=>e.type==='status'&&e.status==='TIMED_OUT'&&e.ms>Date.now()-started-60000).length>=2) {
        stopRequested=true;result.safetyStop='Repeated Realtime subscription timeouts';
      }
    }
  };
  const interrupt = () => { stopRequested = true; result.safetyStop = 'interrupted'; };
  process.once('SIGINT', interrupt); process.once('SIGTERM', interrupt);
  const topic = `pro-300-soak-${crypto.randomUUID()}`;
  try {
    result.baseline = await snapshot();
    const initialCheck = compareBaseline(result.baseline, result.baseline);
    if (!initialCheck.passed) throw Error(initialCheck.dangerous.join('; '));
    if(result.baseline.audit.trustedCount!==16) throw Error('Trusted count differs from expected 16');
    const originalAttractions=queries.attractions;
    let attractionSequence=0;
    queries.attractions=(client,samples,time)=>{
      const sequence=attractionSequence++;
      if(sequence%4) return originalAttractions(client,samples,time);
      const rows=result.baseline.content.broomstick_attractions;
      const id=rows[sequence%rows.length]?.id;
      return measured('attraction-details',()=>client.from('broomstick_attractions')
        .select('id,name,address,latitude,longitude,wait_reporting_enabled').eq('id',id).maybeSingle(),samples,time);
    };
    console.log('Fresh scoped baseline verified; trusted count 16');
    for (let id=0; id<300; id++) {
      const state = { healthy:false, attempts:0, errors:0, recoveries:0, outage:null, current:null,
        polls:0, pollSuccesses:0, pollFailures:0, fallbackReads:0, duplicateSubscriptions:0, recoveryMs:[] };
      states.push(state);
      const client = createClient(url,key, {
        auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
        global:{fetch: async (input, init={}) => {
          const target = new URL(typeof input==='string'?input:input.url);
          const method = (init.method||'GET').toUpperCase();
          if (!['GET','HEAD'].includes(method) && !(method==='POST'&&target.pathname==='/rest/v1/rpc/get_wait_summaries')) throw Error('Database write blocked');
          const measure=phaseStart!==undefined&&!closing;
          const begin=performance.now();
          let label=target.pathname.split('/').at(-1);
          if(label==='broomstick_attractions'&&target.searchParams.has('id')) label='attraction-details';
          try {
            const response=await fetch(input,{...init,signal:AbortSignal.timeout(12000)});
            await response.clone().arrayBuffer();
            if(measure) requestSamples.push({label,ok:response.ok,ms:performance.now()-begin,atMs:Date.now()-phaseStart,
              status:response.status,rateLimited:response.status===429,timeout:[408,504].includes(response.status),error:response.ok?undefined:'HTTP '+response.status});
            return response;
          } catch(error) {
            if(measure) requestSamples.push({label,ok:false,ms:performance.now()-begin,atMs:Date.now()-phaseStart,
              timeout:/timeout|abort/i.test(String(error)),error:safe(error.message)});
            throw error;
          }
        }},
      });
      clients.push(client);
      let reading;
      const reconcile = () => {
          if (reading) return reading;
          const fallback = !state.healthy && state.errors>0;
          state.polls++;
          reading = client.rpc('get_wait_summaries').then(({error}) => {
            if (error) { state.pollFailures++; event(id,'read-error',{code:safe(error.code)}); }
            else { state.pollSuccesses++; if (fallback) state.fallbackReads++; }
          }).catch(()=>{state.pollFailures++;}).finally(() => { pendingReads.delete(reading); reading=undefined; });
          pendingReads.add(reading);
          return reading;
        };
      const controller = createWaitRealtimeController({
        apply: () => {}, reconcile,
        connect: async (apply, status) => {
          state.attempts++;
          if (client.getChannels().length) { state.duplicateSubscriptions++; event(id,'duplicate-channel'); }
          event(id,'connect-attempt',{attempt:state.attempts});
          let retiring=false;
          const channel = client.channel(topic,{config:{broadcast:{self:true}}});
          state.current = channel;
          channel.on('broadcast',{event:'probe'}, message => {
            const p = probeResults.get(message.payload?.id);
            if (!p) return;
            const old=p.received.get(id);
            if (old) { old.count++; p.duplicates++; }
            else p.received.set(id,{count:1,latency:performance.now()-p.sent});
          }).on('system',{}, payload => {
            if (payload.status!=='ok') event(id,'system',{status:safe(payload.status),message:safe(payload.message)});
          }).on('postgres_changes',{event:'*',schema:'public',table:'wait_summary_updates'}, payload => {
            if (payload.eventType!=='DELETE') apply(payload.new);
          }).subscribe((value,error) => {
            if (closing||retiring) return;
            event(id,'status',{status:value,message:safe(error?.message),socket:client.realtime.connectionState(),attempt:state.attempts});
            if (value==='SUBSCRIBED') {
              state.healthy=true;
              if (state.outage!==null) {
                const duration=Date.now()-state.outage;
                state.recoveries++; state.recoveryMs.push(duration);
                event(id,'recovered',{duration}); state.outage=null;
              }
            } else if (['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(value)) {
              state.healthy=false; state.errors++; state.outage ??= Date.now();
            }
            status(value);
          });
          return () => {
            retiring=true; state.healthy=false;
            const task=(async()=>{
              try { await client.removeChannel(channel); }
              finally { channel.teardown(); if(state.current===channel) state.current=null; event(id,'removed'); }
            })();
            pendingCleanup.add(task); task.finally(()=>pendingCleanup.delete(task));
            return task;
          };
        },
      });
      controllers.push(controller);
      state.screenRefreshes=0;
      // Per-screen-equivalent focus + 60-second refresh shares the device read coalescer.
      const timer=setInterval(()=>{if(!closing){state.screenRefreshes++;void reconcile();}},60000);
      screenTimers.push(timer);
      void controller.start();
      await sleep(20); // Spread handshakes and independent 30-second polling clocks.
    }
    const connectionDeadline=Date.now()+30000;
    while(states.some(s=>!s.healthy)&&Date.now()<connectionDeadline) await sleep(100);
    result.initialHealthy=states.filter(s=>s.healthy).length;
    if(stopRequested) throw Error(result.safetyStop);
    if(result.initialHealthy<285) throw Error('Initial connection failure >5%');
    phaseStart=Date.now();
    clients.forEach((client,id)=>workers.push(workerLoop(client,id,mixedSamples,phaseStart,phaseStart+duration,workerAbort.signal)));
    let badLatency=0, badDelivery=0, badRequests=0, nextProbe=0, nextBaseline=60000;
    while(Date.now()-phaseStart<duration&&!stopRequested) {
      const elapsed=Date.now()-phaseStart;
      if(elapsed>=nextProbe) {
        nextProbe+=30000;
        const expected=new Set(states.flatMap((s,i)=>s.healthy?[i]:[]));
        const sender=states.find(s=>s.healthy&&s.current);
        const id=crypto.randomUUID();
        const probe={sent:performance.now(),received:new Map(),duplicates:0}; probeResults.set(id,probe);
        const sendResult=sender ? await sender.current.send({type:'broadcast',event:'probe',payload:{id}}):'no sender';
        const deadline=Date.now()+5000;
        while([...expected].some(i=>!probe.received.has(i))&&Date.now()<deadline) await sleep(25);
        const latencies=[...probe.received.values()].map(v=>v.latency);
        const metrics={seconds:elapsed/1000,expected:expected.size,delivered:probe.received.size,
          undelivered:[...expected].filter(i=>!probe.received.has(i)).length,sendResult,
          p50:percentile(latencies,.5),p95:percentile(latencies,.95),p99:percentile(latencies,.99)};
        result.probes.push(metrics);
        badLatency=metrics.p95>3000 ? badLatency+1 : 0;
        badDelivery=metrics.undelivered>15||sendResult!=='ok' ? badDelivery+1 : 0;
        if(badLatency>=2) throw Error('Sustained delivery p95 >3 seconds');
        if(badDelivery>=2) throw Error('Repeated Realtime delivery failure >5%');
      }
      if(elapsed>=nextBaseline) {
        nextBaseline+=60000;
        const current=await snapshot(); const comparison=compareBaseline(result.baseline,current);
        const requestWindow=summarizeSamples(requestSamples.filter(x=>x.atMs>elapsed-60000&&x.atMs<=elapsed),60000);
        result.baselineChecks.push({at:current.at,comparison,requestWindow});
        badRequests=requestWindow.errorRate>.05||requestWindow.p95Ms>3000?badRequests+1:0;
        if(badRequests>=2) throw Error('Sustained request error rate or p95 threshold');
        if(requestWindow.timeoutCount>=2||requestWindow.rateLimitCount>=2) throw Error('Repeated timeouts/rate limits');
        const firstWindow=result.baselineChecks[0].requestWindow;
        const recentWindows=result.baselineChecks.slice(-3);
        if(elapsed>300000&&recentWindows.length===3&&recentWindows.every(w=>w.requestWindow.p95Ms>Math.max(1000,firstWindow.p95Ms*3))) throw Error('Progressive request latency degradation');
        if(!comparison.passed) throw Error(comparison.dangerous.join('; '));
      }
      const unhealthy=states.filter(s=>!s.healthy);
      const unrecovered=unhealthy.filter(s=>s.outage&&Date.now()-s.outage>120000).length;
      const channels=clients.reduce((n,c)=>n+c.getChannels().length,0);
      const sample={seconds:elapsed/1000,healthy:300-unhealthy.length,unrecovered,
        errors:states.reduce((n,s)=>n+s.errors,0),retries:states.reduce((n,s)=>n+Math.max(0,s.attempts-1),0),
        recoveries:states.reduce((n,s)=>n+s.recoveries,0),channels,rss:process.memoryUsage().rss,
        eventLoopP95:lag.percentile(95)/1e6,handles:process._getActiveHandles().length,
        sockets:process._getActiveHandles().filter(h=>h.constructor?.name==='Socket').length,
        requests:requestSamples.length,requestP95:result.baselineChecks.at(-1)?.requestWindow.p95Ms ?? null,
        requestFailures:requestSamples.filter(s=>!s.ok).length};
      result.samples.push(sample); lag.reset();
      const first=result.samples[0];
      const lastThree=result.samples.slice(-3);
      if(lastThree.length===3 && lastThree.every(s=>s.rss>first.rss*3+64*1024*1024 || s.handles>first.handles+120 || s.sockets>first.sockets+120)) throw Error('Sustained resource/handle/socket growth');
      if(unhealthy.length>15) throw Error('More than 5% of listeners unhealthy');
      if(channels>300||states.some(s=>s.duplicateSubscriptions)||[...probeResults.values()].some(p=>p.duplicates)) throw Error('Duplicate channels/deliveries or channel leak');
      // Per-device retries cannot exceed five in any 30-second window under this policy.
      const recent=result.events.filter(e=>e.type==='connect-attempt'&&e.ms>Date.now()-started-30000);
      if(states.some((_s,id)=>recent.filter(e=>e.id===id).length>6)) throw Error('Reconnect storm');
      if(result.samples.length%3===1) console.log(JSON.stringify(sample));
      await sleep(Math.min(10000,Math.max(0,duration-(Date.now()-phaseStart))));
    }
    result.completed=!stopRequested;
  } catch(error) { result.safetyStop=safe(error.message); result.completed=false; }
  finally {
    result.connectionLimitErrors=connectionLimitErrors;result.subscriptionTimeouts=subscriptionTimeouts;
    result.phaseSeconds=phaseStart?(Date.now()-phaseStart)/1000:0;
    const finalHealth=states.map(s=>s.healthy);
    closing=true; workerAbort.abort(); screenTimers.forEach(clearInterval); controllers.forEach(c=>c.stop());
    await Promise.allSettled(workers); await Promise.allSettled([...pendingReads]);
    const inWindow=requestSamples.filter(s=>s.atMs<=result.phaseSeconds*1000);
    result.requests=summarizeWithEndpoints(inWindow,result.phaseSeconds*1000);
    const end=result.phaseSeconds*1000;
    const window=(from,to)=>summarizeWithEndpoints(inWindow.filter(s=>s.atMs>=from&&s.atMs<to),to-from);
    result.requestWindows={first:window(0,Math.min(300000,end)),middle:window(Math.max(0,end/2-150000),Math.min(end,end/2+150000)),final:window(Math.max(0,end-300000),end)};
    result.mixedTraffic=summarizeWithEndpoints(mixedSamples,result.phaseSeconds*1000);
    result.requestSamples=inWindow;
    result.listeners=states.map((s,id)=>({id,...s,healthy:finalHealth[id],current:undefined}));
    const delivery=[...probeResults.values()].flatMap(p=>[...p.received.values()].map(v=>v.latency));
    result.delivery={p50:percentile(delivery,.5),p95:percentile(delivery,.95),p99:percentile(delivery,.99),duplicates:[...probeResults.values()].reduce((n,p)=>n+p.duplicates,0)};
    // Controllers were stopped before draining reads; now await all channel removals.
    await sleep(0); await Promise.allSettled([...pendingCleanup]);
    await Promise.allSettled(clients.map(c=>c.removeAllChannels())); await Promise.allSettled(clients.map(c=>c.realtime.disconnect()));
    result.remainingChannels=clients.reduce((n,c)=>n+c.getChannels().length,0);
    try { result.final=await snapshot(); result.finalComparison=compareBaseline(result.baseline,result.final);
      if(!result.finalComparison.passed) {result.completed=false;result.safetyStop='Final safety drift';}
    } catch {result.completed=false;result.safetyStop ??='Final baseline unavailable';}
    lag.disable(); process.removeListener('SIGINT',interrupt);process.removeListener('SIGTERM',interrupt);
    result.completedAt=new Date().toISOString();
    const file=path.join(__dirname,'results',`pro-300-soak-${result.startedAt.replace(/[:.]/g,'-')}.json`);
    fs.writeFileSync(file,JSON.stringify(result,null,2));
    console.log(JSON.stringify({file,completed:result.completed,stop:result.safetyStop,remainingChannels:result.remainingChannels}));
    if(result.safetyStop) process.exitCode=2;
  }
}
if(require.main===module) main().catch(()=>{console.error('Diagnostic preflight failed');process.exitCode=1;});
