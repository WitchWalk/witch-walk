const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const originalLoad = Module._load;
Module._load = function (name, ...args) {
  if (name === '@/data/waitTimes') return {
    getWaitTimeAttraction: id => id === 'witch-house' ? { latitude: 42.5215539, longitude: -70.8988987 } : undefined,
    waitTimeAttractions: [{ attractionId: 'witch-house' }],
  };
  if (name === '@/services/waitReportRepository') return { localWaitReportRepository: {} };
  if (name.startsWith('@/')) name = path.join(__dirname, '../src', name.slice(2));
  return originalLoad.call(this, name, ...args);
};
Module._extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText, filename);

(async () => {
  const { createSharedWaitRepository, sharedWaitRepository } = require('../src/services/sharedWaitRepository.ts');
  const { decodeSharedSummaries, getWaitTimeAggregates } = require('../src/services/waitAggregationService.ts');
  let session = null, signins = 0, calls = 0;
  let response = { data: { kind: 'success', reportId: 'receipt' }, error: null };
  const client = {
    auth: {
      getSession: async () => ({ data: { session }, error: null }),
      signInAnonymously: async () => { signins++; session = { expires_at: Date.now()/1000+3600 }; return { data: { session }, error: null }; },
      refreshSession: async () => ({ data: { session }, error: null }),
    },
    rpc: async (name, params) => { calls++; assert.equal(name,'submit_wait_report'); assert.equal(params.p_latitude,42.5215539); assert.equal(params.p_mocked,false); return response; },
  };
  const input = () => ({ attractionId:'witch-house', submissionKey:'key', waitMinutes:20, crowdLevel:'moderate', quickStatusTag:null,
    verification: { verified:true,reason:'verified',coordinates:{latitude:42.5215539,longitude:-70.8988987},accuracyMeters:10,locationTimestamp:Date.now(),mocked:false } });
  const repo = createSharedWaitRepository(async () => client);
  const first = repo.submit(input()), second = repo.submit(input());
  assert.equal(first,second);
  assert.equal((await first).kind,'success');
  assert.equal(calls,1); assert.equal(signins,1);
  const restarted = createSharedWaitRepository(async () => client);
  await restarted.submit(input());
  assert.equal(signins,1,'Persisted session reused by a new repository');
  for (const payload of [{waitMinutes:1},{crowdLevel:'invalid'},{quickStatusTag:'custom text'}]) {
    assert.equal((await repo.submit({...input(),...payload})).kind,'invalid');
  }
  for (const proof of [{verified:false},{locationTimestamp:Date.now()-60000},{accuracyMeters:90},{coordinates:{latitude:0,longitude:0}}]) {
    const request=input(); request.verification={...request.verification,...proof};
    assert.equal((await repo.submit(request)).kind,'location-failed');
  }
  for (const expected of [{kind:'cooldown',remainingMilliseconds:40000},{kind:'duplicate',reportId:'receipt'},{kind:'location-failed',reason:'outside-radius'},{kind:'idempotency-conflict'}]) {
    response={data:expected,error:null}; assert.equal((await repo.submit(input())).kind,expected.kind);
  }
  response={data:null,error:{code:'42501',message:'sensitive detail'}};
  assert.deepEqual(await repo.submit(input()),{kind:'authentication-failed'});
  assert.deepEqual(await createSharedWaitRepository(async()=>{throw Error('secret');}).submit(input()),{kind:'unavailable'});
  session=null;
  client.auth.signInAnonymously=async()=>({data:{session:null},error:{message:'private error'}});
  assert.deepEqual(await restarted.submit(input()),{kind:'authentication-failed'});
  const neutral = decodeSharedSummaries([{attractionId:'witch-house',reportCount:0}]);
  assert.equal(neutral['witch-house'].crowdLevel,null);
  assert.equal(neutral['witch-house'].hasRecentReports,false);
  sharedWaitRepository.read=async()=>{throw Error('offline');};
  assert.equal((await getWaitTimeAggregates())['witch-house'].freshnessLabel,'Live updates unavailable');
  console.log('PASS: anonymous sign-in, session reuse, duplicates, validation, GPS, server failures, neutral/offline results');
})().catch(() => { console.error('FAIL: shared wait adapter test'); process.exitCode=1; });
