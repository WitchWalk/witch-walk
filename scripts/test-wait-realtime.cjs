/* global __dirname */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const originalLoad=Module._load;
Module._load=function(name,...args) {
  if(name==='@/data/waitTimes') return {getActiveWaitTimeAttractions:()=>[{attractionId:'witch-house'},{attractionId:'salem-witch-museum'}]};
  if(name==='@/services/waitReportRepository') return {localWaitReportRepository:{}};
  if(name.startsWith('@/')) name=path.join(__dirname,'../src',name.slice(2));
  return originalLoad.call(this,name,...args);
};
Module._extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true},
}).outputText,filename);
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
  const {createWaitRealtimeController}=require('../src/services/waitRealtimeCore.ts');
  let events,status,connections=0,closed=0,fetches=0;
  const applied=[];
  const controller=createWaitRealtimeController({
    connect:async(e,s)=>{connections++;events=e;status=s;return()=>{closed++;};},
    reconcile:async()=>{fetches++;}, apply:batch=>applied.push(batch),
  },{debounce:5,retry:5,poll:1000});
  await controller.start(); await controller.start();
  assert.equal(connections,1); assert.equal(fetches,1);
  const event=(id,revision)=>({summary:{attractionId:id},revision,evaluated_at:new Date().toISOString()});
  events(event('a',1));events(event('a',2));events(event('a',1));events(event('b',1));
  await pause(15);
  assert.equal(applied.length,1);assert.equal(applied[0].length,2);assert.equal(applied[0][0].revision,2);
  status('SUBSCRIBED');await pause(0);assert.equal(fetches,2);
  const oldEvents=events;
  status('CHANNEL_ERROR');await pause(25);assert.equal(connections,2);assert.equal(closed,1);
  oldEvents(event('a',10));await pause(10);assert.equal(applied.length,1);
  status('SUBSCRIBED');await pause(0);assert.equal(fetches,3);
  controller.stop();events(event('a',11));await pause(10);assert.equal(applied.length,1);
  await controller.start();assert.equal(connections,3);assert.equal(fetches,4);controller.stop();

  const {sharedWaitRepository}=require('../src/services/sharedWaitRepository.ts');
  const {getWaitTimeAggregates,applyRealtimeWaitEvents}=require('../src/services/waitAggregationService.ts');
  const {subscribeWaitAggregates}=require('../src/services/waitAggregateEvents.ts');
  const {evaluateWatch}=require('../src/services/witchWatchCore.ts');
  const row=(id,wait,crowd)=>({attractionId:id,reportCount:1,estimatedWaitMinutes:wait,crowdLevel:crowd,newestReportTimestamp:Date.now(),quickStatusTag:null,waitSpreadMinutes:0});
  const envelope=(summary,revision)=>({summary,revision,evaluated_at:new Date().toISOString()});
  sharedWaitRepository.read=async()=>[envelope(row('witch-house',45,'busy'),1)];
  const initial=await getWaitTimeAggregates();assert.equal(initial['witch-house'].crowdLevel,'busy');
  let watch={attractionId:'witch-house',enabled:true,crowdAlertType:'busy-to-moderate',waitThresholdMinutes:20,lastKnownCrowdStatus:'busy',lastKnownEstimatedWait:45,lastTriggeredState:null,lastAlertTimestamp:null};
  let notices=0,batches=0;
  const unsubscribe=subscribeWaitAggregates(values=>{batches++;for(const value of values){if(value.attractionId!=='witch-house')continue;const result=evaluateWatch(watch,value,Date.now());watch=result.watch;if(result.triggered)notices++;}});
  const update=envelope(row('witch-house',20,'moderate'),2);
  applyRealtimeWaitEvents([update]);applyRealtimeWaitEvents([update]);
  assert.equal(batches,1);assert.equal(notices,1);
  sharedWaitRepository.read=async()=>{throw Error('offline');};
  const offline=await getWaitTimeAggregates();assert.equal(offline['witch-house'].estimatedWaitMinutes,20);assert.equal(batches,1);
  sharedWaitRepository.read=async()=>[envelope(row('witch-house',60,'busy'),1)];
  assert.equal((await getWaitTimeAggregates())['witch-house'].estimatedWaitMinutes,20,'Old snapshot cannot overwrite event');
  sharedWaitRepository.read=async()=>[envelope({attractionId:'witch-house',reportCount:0},2)];
  assert.equal((await getWaitTimeAggregates())['witch-house'].hasRecentReports,false,'Authoritative expiration snapshot');
  unsubscribe();
  console.log('PASS: single subscription, batching, reconnect/reconciliation, lifecycle, duplicate notification suppression, stale snapshot rejection, offline cache, expiry');
})().catch(error=>{console.error(error);process.exitCode=1;});
