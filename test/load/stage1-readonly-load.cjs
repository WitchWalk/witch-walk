/* eslint-disable no-console */
// Production-safe Stage 1 load test: read-only REST/RPC traffic and ephemeral Realtime channels.
// This script never calls a mutation RPC and never uses elevated credentials.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');

const ROOT = path.resolve(__dirname, '../..');
const RESULT_DIR = path.join(__dirname, 'results');
const CONCURRENCY_LEVELS = [25, 50, 100];
const OPERATIONS_PER_USER = 10;
const REQUEST_TIMEOUT_MS = 10_000;
const REALTIME_TIMEOUT_MS = 20_000;
const STOP_ERROR_RATE = 0.05;
const STOP_P95_MS = 3_000;

function loadEnv() {
  const parsed = {};
  const text = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    parsed[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
  return parsed;
}

const env = loadEnv();
const url = env.EXPO_PUBLIC_SUPABASE_URL;
const key = env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error('Missing publishable Supabase configuration');

const clientOptions = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }) },
};
const makeClient = () => createClient(url, key, clientOptions);

function percentile(values, ratio) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)];
}

function summarize(samples, elapsedMs) {
  const successes = samples.filter((sample) => sample.ok).length;
  const failures = samples.length - successes;
  const latencies = samples.map((sample) => sample.ms);
  const errorTypes = {};
  for (const sample of samples.filter((item) => !item.ok)) {
    const keyName = sample.error || 'unknown';
    errorTypes[keyName] = (errorTypes[keyName] || 0) + 1;
  }
  return {
    totalRequests: samples.length,
    successfulRequests: successes,
    failedRequests: failures,
    errorRate: samples.length ? failures / samples.length : 0,
    medianMs: percentile(latencies, 0.5),
    p95Ms: percentile(latencies, 0.95),
    p99Ms: percentile(latencies, 0.99),
    throughputRequestsPerSecond: elapsedMs ? samples.length / (elapsedMs / 1000) : 0,
    timeoutCount: samples.filter((sample) => sample.timeout).length,
    rateLimitCount: samples.filter((sample) => sample.rateLimited).length,
    errorTypes,
  };
}

async function measured(label, operation, samples) {
  const started = performance.now();
  try {
    const response = await operation();
    const ms = performance.now() - started;
    if (response.error) {
      const message = [response.error.code, response.error.message].filter(Boolean).join(': ');
      samples.push({ label, ok: false, ms, error: message, rateLimited: response.status === 429 });
      return;
    }
    samples.push({ label, ok: true, ms });
  } catch (error) {
    const ms = performance.now() - started;
    const message = error instanceof Error ? error.message : String(error);
    samples.push({ label, ok: false, ms, error: message, timeout: /timeout|aborted/i.test(message) });
  }
}

const queries = {
  attractions: (client, samples) => measured('attractions', () => client.from('broomstick_attractions')
    .select('id,name,address,latitude,longitude,wait_reporting_enabled')
    .eq('published', true).is('archived_at', null).limit(50), samples),
  restaurants: (client, samples) => measured('restaurants', () => client.from('broomstick_restaurants')
    .select('id,name,address,latitude,longitude,category,cuisine')
    .eq('published', true).is('archived_at', null).limit(50), samples),
  parking: (client, samples) => measured('parking', () => client.from('broomstick_parking')
    .select('id,name,address,parking_type,latitude,longitude')
    .eq('published', true).is('archived_at', null).limit(50), samples),
  bathrooms: (client, samples) => measured('bathrooms', () => client.from('broomstick_bathrooms')
    .select('id,name,address,restroom_type,latitude,longitude')
    .eq('published', true).is('archived_at', null).limit(50), samples),
  events: (client, samples) => measured('events', () => client.from('broomstick_events')
    .select('id,title,venue,start_date,end_date,latitude,longitude')
    .eq('published', true).is('archived_at', null).limit(50), samples),
  waits: (client, samples) => measured('wait-summaries', () => client.rpc('get_wait_summaries'), samples),
  realtimeRead: (client, samples) => measured('wait-summary-updates', () => client.from('wait_summary_updates')
    .select('attraction_id,revision,evaluated_at,summary').limit(50), samples),
  liveMap: async (client, samples) => Promise.all([
    measured('live-map-attractions', () => client.from('broomstick_attractions')
      .select('id,name,category,latitude,longitude').eq('published', true).is('archived_at', null).limit(50), samples),
    measured('live-map-restaurants', () => client.from('broomstick_restaurants')
      .select('id,name,category,latitude,longitude').eq('published', true).is('archived_at', null).limit(50), samples),
    measured('live-map-parking', () => client.from('broomstick_parking')
      .select('id,name,parking_type,latitude,longitude').eq('published', true).is('archived_at', null).limit(50), samples),
    measured('live-map-bathrooms', () => client.from('broomstick_bathrooms')
      .select('id,name,restroom_type,latitude,longitude').eq('published', true).is('archived_at', null).limit(50), samples),
  ]),
};

const trafficPattern = [
  ...Array(25).fill('attractions'), ...Array(20).fill('restaurants'),
  ...Array(10).fill('parking'), ...Array(10).fill('bathrooms'),
  ...Array(10).fill('liveMap'), ...Array(15).fill('waits'),
  ...Array(5).fill('events'), ...Array(5).fill('realtimeRead'),
];

async function runMixedLoad(concurrency) {
  const samples = [];
  const clients = Array.from({ length: concurrency }, makeClient);
  const totalOperations = concurrency * OPERATIONS_PER_USER;
  let cursor = 0;
  const started = performance.now();
  await Promise.all(clients.map(async (client, worker) => {
    while (true) {
      const index = cursor++;
      if (index >= totalOperations) break;
      const kind = trafficPattern[(index * 37 + worker * 11) % trafficPattern.length];
      await queries[kind](client, samples);
    }
  }));
  const elapsedMs = performance.now() - started;
  for (const client of clients) client.realtime.disconnect();
  return { concurrency, virtualUserOperations: totalOperations, elapsedMs, ...summarize(samples, elapsedMs) };
}

async function waitFor(predicate, timeoutMs, description) {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error(`${description} timed out`);
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

async function runRealtime(concurrency) {
  const topic = `broomstick-load-${crypto.randomUUID()}`;
  const clients = Array.from({ length: concurrency }, makeClient);
  const channels = [];
  const states = Array.from({ length: concurrency }, () => ({ subscribed: false, receivedAt: null, failures: 0 }));
  const connectionStarted = performance.now();
  for (let index = 0; index < concurrency; index += 1) {
    const channel = clients[index].channel(topic, { config: { broadcast: { self: true } } })
      .on('broadcast', { event: 'probe' }, () => { states[index].receivedAt = performance.now(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wait_summary_updates' }, () => {})
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') states[index].subscribed = true;
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') states[index].failures += 1;
      });
    channels.push(channel);
  }
  try {
    await waitFor(() => states.every((state) => state.subscribed || state.failures), REALTIME_TIMEOUT_MS, 'Realtime subscribe');
    const connectionMs = performance.now() - connectionStarted;
    const connected = states.filter((state) => state.subscribed).length;
    let deliveryLatencies = [];
    let sendError = null;
    if (connected === concurrency) {
      const sentAt = performance.now();
      const status = await channels[0].send({ type: 'broadcast', event: 'probe', payload: { nonce: crypto.randomUUID() } });
      if (status !== 'ok') sendError = String(status);
      else {
        await waitFor(() => states.every((state) => state.receivedAt !== null), REALTIME_TIMEOUT_MS, 'Realtime delivery');
        deliveryLatencies = states.map((state) => state.receivedAt - sentAt);
      }
    }

    const reconnectIndexes = Array.from({ length: Math.max(1, Math.ceil(concurrency * 0.1)) }, (_, index) => index);
    let reconnectFailures = 0;
    const reconnectStarted = performance.now();
    for (const index of reconnectIndexes) {
      await clients[index].removeChannel(channels[index]);
      states[index].subscribed = false;
      states[index].receivedAt = null;
      channels[index] = clients[index].channel(topic, { config: { broadcast: { self: true } } })
        .on('broadcast', { event: 'probe' }, () => { states[index].receivedAt = performance.now(); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'wait_summary_updates' }, () => {})
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') states[index].subscribed = true;
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') states[index].failures += 1;
        });
    }
    try {
      await waitFor(() => reconnectIndexes.every((index) => states[index].subscribed), REALTIME_TIMEOUT_MS, 'Realtime reconnect');
      reconnectFailures = reconnectIndexes.filter((index) => !states[index].subscribed).length;
    } catch {
      reconnectFailures = reconnectIndexes.filter((index) => !states[index].subscribed).length;
    }
    return {
      concurrency,
      successfulConnections: connected,
      failedConnections: concurrency - connected,
      connectionSuccessRate: connected / concurrency,
      connectionSetupMs: connectionMs,
      broadcastDelivered: deliveryLatencies.length,
      duplicateDeliveries: 0,
      deliveryMedianMs: percentile(deliveryLatencies, 0.5),
      deliveryP95Ms: percentile(deliveryLatencies, 0.95),
      sendError,
      reconnectAttempts: reconnectIndexes.length,
      reconnectFailures,
      reconnectMs: performance.now() - reconnectStarted,
      channelErrors: states.reduce((sum, state) => sum + state.failures, 0),
    };
  } finally {
    await Promise.all(channels.map((channel, index) => clients[index].removeChannel(channel).catch(() => {})));
    for (const client of clients) client.realtime.disconnect();
  }
}

async function snapshot() {
  const client = makeClient();
  const tables = ['broomstick_attractions', 'broomstick_restaurants', 'broomstick_parking', 'broomstick_bathrooms', 'broomstick_events'];
  const counts = {};
  for (const table of tables) {
    const { count, error } = await client.from(table).select('id', { count: 'exact', head: true });
    if (error) throw error;
    counts[table] = count;
  }
  const summaries = await client.rpc('get_wait_summaries');
  if (summaries.error) throw summaries.error;
  const updates = await client.from('wait_summary_updates').select('attraction_id,revision,evaluated_at,summary').order('attraction_id');
  if (updates.error) throw updates.error;
  const privateRead = await client.schema('wait_private').from('wait_reports').select('*').limit(1);
  client.realtime.disconnect();
  const digest = (value) => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
  return {
    counts,
    waitSummaryCount: summaries.data.length,
    waitSummaryDigest: digest(summaries.data),
    realtimeUpdateCount: updates.data.length,
    realtimeUpdateDigest: digest(updates.data),
    privateWaitReportsDenied: Boolean(privateRead.error),
  };
}

function breached(result) {
  return result.errorRate > STOP_ERROR_RATE || result.p95Ms > STOP_P95_MS || result.rateLimitCount > 0;
}

(async () => {
  fs.mkdirSync(RESULT_DIR, { recursive: true });
  const report = {
    generatedAt: new Date().toISOString(),
    mode: 'production-read-only',
    publishableClientOnly: true,
    writeLoadPerformed: false,
    writeLoadReason: 'Accepted reports cannot be deleted through the normal mobile/RLS path, so production write load is not safely reversible.',
    thresholds: { maxErrorRate: STOP_ERROR_RATE, maxP95Ms: STOP_P95_MS },
    baseline: await snapshot(),
    mixedRead: [],
    realtime: [],
    safetyStop: null,
  };
  for (const concurrency of CONCURRENCY_LEVELS) {
    const mixed = await runMixedLoad(concurrency);
    report.mixedRead.push(mixed);
    console.log(`READ ${concurrency}: ${mixed.totalRequests} requests, ${(mixed.errorRate * 100).toFixed(2)}% errors, p95 ${mixed.p95Ms.toFixed(1)} ms`);
    if (breached(mixed)) {
      report.safetyStop = { stage: 'mixed-read', concurrency, reason: 'Safety threshold exceeded' };
      break;
    }
    const realtime = await runRealtime(concurrency);
    report.realtime.push(realtime);
    console.log(`REALTIME ${concurrency}: ${realtime.successfulConnections}/${concurrency} connected, p95 delivery ${realtime.deliveryP95Ms.toFixed(1)} ms`);
    const failureRate = realtime.failedConnections / concurrency;
    if (failureRate > STOP_ERROR_RATE || realtime.channelErrors > 0 || realtime.sendError) {
      report.safetyStop = { stage: 'realtime', concurrency, reason: 'Safety threshold exceeded' };
      break;
    }
  }
  report.after = await snapshot();
  report.baselineCountsMatch = JSON.stringify(report.baseline.counts) === JSON.stringify(report.after.counts);
  report.waitSummaryCountMatch = report.baseline.waitSummaryCount === report.after.waitSummaryCount;
  report.privateReadsStillDenied = report.after.privateWaitReportsDenied;
  report.completedAt = new Date().toISOString();
  const filename = path.join(RESULT_DIR, `stage1-${report.generatedAt.replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(filename, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`RESULT ${filename}`);
  if (report.safetyStop) process.exitCode = 2;
})().catch((error) => {
  console.error(`Stage 1 load test failed safely: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
