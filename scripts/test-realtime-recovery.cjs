/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const Module = require('node:module');
const filename = path.resolve(__dirname, '../src/services/waitRealtimeCore.ts');
const compiled = new Module(filename);
compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, filename);
const { createWaitRealtimeController } = compiled.exports;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const options = { debounce: 2, retry: 5, poll: 10, maximumRetries: 3, maximumRetry: 10 };

(async () => {
  let connects = 0, closes = 0, reads = 0, status;
  const controller = createWaitRealtimeController({
    reconcile: async () => { reads++; }, apply: () => {},
    connect: async (_event, callback) => {
      connects++; status = callback;
      callback('CHANNEL_ERROR'); callback('TIMED_OUT'); callback('CLOSED');
      return async () => { await sleep(2); closes++; };
    },
  }, options);
  await controller.start(); await controller.start();
  await sleep(150);
  assert.equal(connects, 4, 'initial plus at most three retries, not a storm');
  assert.equal(closes, 4, 'old channels and exhausted final channel removed');
  const readCount = reads;
  await sleep(35);
  assert.equal(connects, 4, 'no infinite retry loop');
  assert.ok(reads > readCount, 'REST reconciliation continues after retry exhaustion');
  controller.stop(); await sleep(20);
  assert.equal(closes, 4, 'final channel cleaned up');
  const stoppedReads = reads;
  status('CHANNEL_ERROR'); await sleep(30);
  assert.equal(reads, stoppedReads); assert.equal(connects, 4);
  await controller.start();
  assert.equal(connects, 5, 'foreground restart receives a fresh retry budget');
  controller.stop(); await sleep(20);

  let recoveredStatus, recoverConnects = 0;
  const recovered = createWaitRealtimeController({
    reconcile: async () => {}, apply: () => {},
    connect: async (_e, s) => { recoverConnects++; recoveredStatus = s; return () => {}; },
  }, options);
  await recovered.start();
  recoveredStatus('CHANNEL_ERROR'); recoveredStatus('SUBSCRIBED');
  await sleep(30);
  assert.equal(recoverConnects, 1, 'SDK recovery cancels pending forced recreation');
  recoveredStatus('TIMED_OUT'); await sleep(35);
  assert.equal(recoverConnects, 2);
  recovered.stop();

  let live = 0, maxLive = 0, asynchronousStatus;
  const serialized = createWaitRealtimeController({
    reconcile: async () => {}, apply: () => {},
    connect: async (_e, s) => {
      live++; maxLive = Math.max(maxLive, live); asynchronousStatus = s;
      return async () => { await sleep(15); live--; };
    },
  }, options);
  await serialized.start(); asynchronousStatus('CLOSED'); await sleep(45);
  assert.equal(maxLive, 1, 'asynchronous cleanup finishes before recreation');
  serialized.stop(); await sleep(25); assert.equal(live, 0);

  // A background transition during pending teardown must not resurrect a channel.
  await serialized.start(); asynchronousStatus('CHANNEL_ERROR'); await sleep(10);
  serialized.stop(); await sleep(40); assert.equal(live, 0);

  let throws = 0;
  const rejected = createWaitRealtimeController({
    reconcile: async () => {}, apply: () => {},
    connect: async () => { throws++; throw Error('offline'); },
  }, options);
  await rejected.start(); await sleep(150);
  assert.equal(throws, 4, 'connection exceptions also have a retry budget');
  rejected.stop();
  console.log('PASS: error detection, bounded jittered recovery, no duplicate retries, async cleanup, polling fallback, cancellation, no infinite loop');
})().catch(error => { console.error(error); process.exit(1); });
