/* eslint-disable no-console */
// Production-safe Stage 2 stress test: read-only REST/RPC traffic and ephemeral Realtime probes.
// Never invokes a mutation RPC, never authenticates a test user, and never uses elevated credentials.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');

const ROOT = path.resolve(__dirname, '../..');
const RESULT_DIR = path.join(__dirname, 'results');
const CONCURRENCY_LEVELS = [200, 300, 500];
const OPERATIONS_PER_USER = 10;
const REQUEST_TIMEOUT_MS = 10_000;
const REALTIME_TIMEOUT_MS = 30_000;
const STOP_ERROR_RATE = 0.05;
const STOP_P95_MS = 3_000;

function loadEnv() {
  const parsed = {};
  for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) parsed[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
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

function summarizeSamples(samples, elapsedMs) {
  const summarize = (subset) => {
    const successes = subset.filter((sample) => sample.ok).length;
    const failures = subset.length - successes;
    const latencies = subset.map((sample) => sample.ms);
    const errorTypes = {};
    for (const sample of subset.filter((item) => !item.ok)) {
      const name = sample.error || 'unknown';
      errorTypes[name] = (errorTypes[name] || 0) + 1;
    }
    return {
      totalRequests: subset.length,
      successfulRequests: successes,
      failedRequests: failures,
      errorRate: subset.length ? failures / subset.length : 0,
      medianMs: percentile(latencies, 0.5),
      p95Ms: percentile(latencies, 0.95),
      p99Ms: percentile(latencies, 0.99),
      timeoutCount: subset.filter((sample) => sample.timeout).length,
      rateLimitCount: subset.filter((sample) => sample.rateLimited).length,
      errorTypes,
    };
  };
  const overall = summarize(samples);
  overall.throughputRequestsPerSecond = elapsedMs ? samples.length / (elapsedMs / 1000) : 0;
  const endpointMetrics = {};
  for (const label of [...new Set(samples.map((sample) => sample.label))].sort()) {
    endpointMetrics[label] = summarize(samples.filter((sample) => sample.label === label));
  }
  return { ...overall, endpointMetrics };
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
  return {
    concurrency,
    virtualUserOperations: totalOperations,
    elapsedMs,
    ...summarizeSamples(samples, elapsedMs),
  };
}

async function waitFor(predicate, timeoutMs, description) {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error(`${description} timed out`);
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

function attachChannel(client, topic, state) {
  return client.channel(topic, { config: { broadcast: { self: true } } })
    .on('broadcast', { event: 'probe' }, () => {
      state.deliveries += 1;
      if (state.receivedAt === null) state.receivedAt = performance.now();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'wait_summary_updates' }, () => {})
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        state.subscribed = true;
        state.hasEverSubscribed = true;
      }
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') state.channelErrors += 1;
      if (status === 'CLOSED' && state.hasEverSubscribed && !state.intentionalClose) state.dropped += 1;
    });
}

async function runRealtime(concurrency) {
  const topic = `broomstick-stage2-${crypto.randomUUID()}`;
  const clients = Array.from({ length: concurrency }, makeClient);
  const states = Array.from({ length: concurrency }, () => ({
    subscribed: false, hasEverSubscribed: false, receivedAt: null,
    deliveries: 0, channelErrors: 0, dropped: 0, intentionalClose: false,
  }));
  const channels = [];
  const connectionStarted = performance.now();
  for (let index = 0; index < concurrency; index += 1) channels[index] = attachChannel(clients[index], topic, states[index]);
  try {
    try {
      await waitFor(
        () => states.every((state) => state.subscribed || state.channelErrors),
        REALTIME_TIMEOUT_MS,
        'Realtime subscribe',
      );
    } catch { /* Partial connection results are measured below. */ }
    const connectionSetupMs = performance.now() - connectionStarted;
    const connectedIndexes = states.flatMap((state, index) => state.subscribed ? [index] : []);
    let deliveryLatencies = [];
    let sendError = null;
    if (connectedIndexes.length) {
      const sentAt = performance.now();
      const status = await channels[connectedIndexes[0]].send({
        type: 'broadcast', event: 'probe', payload: { nonce: crypto.randomUUID() },
      });
      if (status !== 'ok') sendError = String(status);
      else {
        try {
          await waitFor(
            () => connectedIndexes.every((index) => states[index].receivedAt !== null),
            REALTIME_TIMEOUT_MS,
            'Realtime delivery',
          );
        } catch { /* Partial delivery results are measured below. */ }
        deliveryLatencies = connectedIndexes
          .filter((index) => states[index].receivedAt !== null)
          .map((index) => states[index].receivedAt - sentAt);
      }
    }

    const reconnectIndexes = connectedIndexes.slice(0, Math.max(1, Math.ceil(concurrency * 0.1)));
    const reconnectStarted = performance.now();
    for (const index of reconnectIndexes) {
      states[index].intentionalClose = true;
      await clients[index].removeChannel(channels[index]);
      states[index].subscribed = false;
      states[index].intentionalClose = false;
      channels[index] = attachChannel(clients[index], topic, states[index]);
    }
    try {
      await waitFor(
        () => reconnectIndexes.every((index) => states[index].subscribed),
        REALTIME_TIMEOUT_MS,
        'Realtime reconnect',
      );
    } catch { /* Reconnect failures are measured below. */ }
    const successfulConnections = connectedIndexes.length;
    const failedConnections = concurrency - successfulConnections;
    const reconnectFailures = reconnectIndexes.filter((index) => !states[index].subscribed).length;
    const channelErrors = states.reduce((sum, state) => sum + state.channelErrors, 0);
    const droppedConnections = states.reduce((sum, state) => sum + state.dropped, 0);
    const duplicateDeliveries = states.reduce((sum, state) => sum + Math.max(0, state.deliveries - 1), 0);
    const failureRatio = Math.max(failedConnections, reconnectFailures, channelErrors, droppedConnections) / concurrency;
    return {
      concurrency,
      successfulConnections,
      failedConnections,
      connectionSuccessRate: successfulConnections / concurrency,
      connectionSetupMs,
      broadcastDelivered: deliveryLatencies.length,
      undeliveredBroadcasts: successfulConnections - deliveryLatencies.length,
      duplicateDeliveries,
      deliveryP50Ms: percentile(deliveryLatencies, 0.5),
      deliveryP95Ms: percentile(deliveryLatencies, 0.95),
      deliveryP99Ms: percentile(deliveryLatencies, 0.99),
      sendError,
      reconnectAttempts: reconnectIndexes.length,
      reconnectFailures,
      reconnectMs: performance.now() - reconnectStarted,
      channelErrors,
      droppedConnections,
      failureRatio,
    };
  } finally {
    await Promise.all(channels.map(async (channel, index) => {
      states[index].intentionalClose = true;
      await clients[index].removeChannel(channel).catch(() => {});
    }));
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
  const updates = await client.from('wait_summary_updates')
    .select('attraction_id,revision,evaluated_at,summary').order('attraction_id');
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

function compareBaseline(baseline, current) {
  return {
    countsMatch: JSON.stringify(baseline.counts) === JSON.stringify(current.counts),
    waitSummaryCountMatches: baseline.waitSummaryCount === current.waitSummaryCount,
    waitSummaryDigestMatches: baseline.waitSummaryDigest === current.waitSummaryDigest,
    realtimeUpdateCountMatches: baseline.realtimeUpdateCount === current.realtimeUpdateCount,
    realtimeUpdateDigestMatches: baseline.realtimeUpdateDigest === current.realtimeUpdateDigest,
    privateReadsStillDenied: current.privateWaitReportsDenied,
  };
}

function readThresholdReason(result) {
  if (result.errorRate > STOP_ERROR_RATE) return 'Read error rate exceeded 5%';
  if (result.p95Ms > STOP_P95_MS) return 'Read p95 exceeded 3 seconds';
  if (result.timeoutCount > 1) return 'Repeated read timeouts occurred';
  if (result.rateLimitCount > 0) return 'Unexpected rate limiting occurred';
  return null;
}

function realtimeThresholdReason(result) {
  if (result.failureRatio > STOP_ERROR_RATE) return 'Realtime failure/drop rate exceeded 5%';
  if (result.sendError) return 'Realtime probe send failed';
  return null;
}

function baselineThresholdReason(comparison) {
  if (Object.values(comparison).some((value) => !value)) return 'Production baseline drift detected';
  return null;
}

(async () => {
  fs.mkdirSync(RESULT_DIR, { recursive: true });
  const generatedAt = new Date().toISOString();
  const report = {
    generatedAt,
    mode: 'production-read-only',
    publishableClientOnly: true,
    writeLoadPerformed: false,
    writeLoadReason: 'Production wait-report writes remain blocked until an isolated and reversible test mechanism exists.',
    thresholds: { maxErrorRate: STOP_ERROR_RATE, maxP95Ms: STOP_P95_MS },
    baseline: await snapshot(),
    stages: [],
    safetyStop: null,
  };
  try {
    for (const concurrency of CONCURRENCY_LEVELS) {
      const mixedRead = await runMixedLoad(concurrency);
      console.log(`READ ${concurrency}: ${mixedRead.totalRequests} requests, ${(mixedRead.errorRate * 100).toFixed(2)}% errors, p95 ${mixedRead.p95Ms.toFixed(1)} ms`);
      let reason = readThresholdReason(mixedRead);
      let realtime = null;
      if (!reason) {
        realtime = await runRealtime(concurrency);
        console.log(`REALTIME ${concurrency}: ${realtime.successfulConnections}/${concurrency} connected, p95 ${realtime.deliveryP95Ms.toFixed(1)} ms, p99 ${realtime.deliveryP99Ms.toFixed(1)} ms`);
        reason = realtimeThresholdReason(realtime);
      }
      const after = await snapshot();
      const baselineComparison = compareBaseline(report.baseline, after);
      reason ||= baselineThresholdReason(baselineComparison);
      report.stages.push({ concurrency, mixedRead, realtime, after, baselineComparison });
      if (reason) {
        report.safetyStop = { concurrency, reason };
        break;
      }
    }
  } catch (error) {
    report.safetyStop = {
      concurrency: CONCURRENCY_LEVELS[report.stages.length],
      reason: error instanceof Error ? error.message : String(error),
    };
  } finally {
    report.final = await snapshot();
    report.finalBaselineComparison = compareBaseline(report.baseline, report.final);
    report.completedAt = new Date().toISOString();
    const filename = path.join(RESULT_DIR, `stage2-${generatedAt.replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(filename, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`RESULT ${filename}`);
    if (report.safetyStop) process.exitCode = 2;
  }
})().catch((error) => {
  console.error(`Stage 2 stress test failed safely: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
