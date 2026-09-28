/* eslint-disable no-console */
// Production-safe Stage 3 soak test: paced read-only traffic plus long-lived Realtime listeners.
// Never invokes mutation RPCs, authenticates test users, or uses elevated credentials.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { monitorEventLoopDelay } = require('node:perf_hooks');
const { createClient } = require('@supabase/supabase-js');

const ROOT = path.resolve(__dirname, '../..');
const RESULT_DIR = path.join(__dirname, 'results');
const PHASES = [300, 500];
const PHASE_DURATION_MS = 30 * 60_000;
const THINK_TIME_MS = 30_000;
const THINK_JITTER_MS = 15_000;
const HEALTH_WINDOW_MS = 60_000;
const REALTIME_PROBE_MS = 60_000;
const REQUEST_TIMEOUT_MS = 10_000;
const REALTIME_TIMEOUT_MS = 30_000;
const PROBE_TIMEOUT_MS = 10_000;
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
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function abortableSleep(ms, signal) {
  if (signal.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(done, ms);
    function done() {
      signal.removeEventListener('abort', done);
      clearTimeout(timer);
      resolve();
    }
    signal.addEventListener('abort', done, { once: true });
  });
}

function percentile(values, ratio) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)];
}

function summarizeSamples(samples, elapsedMs) {
  const successes = samples.filter((sample) => sample.ok).length;
  const failures = samples.length - successes;
  const latencies = samples.map((sample) => sample.ms);
  const errorTypes = {};
  for (const sample of samples.filter((item) => !item.ok)) {
    const name = sample.error || 'unknown';
    errorTypes[name] = (errorTypes[name] || 0) + 1;
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

function summarizeWithEndpoints(samples, elapsedMs) {
  const overall = summarizeSamples(samples, elapsedMs);
  const endpointMetrics = {};
  for (const label of [...new Set(samples.map((sample) => sample.label))].sort()) {
    const subset = samples.filter((sample) => sample.label === label);
    endpointMetrics[label] = summarizeSamples(subset, elapsedMs);
  }
  return { ...overall, endpointMetrics };
}

async function measured(label, operation, samples, phaseStartedAt) {
  const started = performance.now();
  try {
    const response = await operation();
    const ms = performance.now() - started;
    if (response.error) {
      const message = [response.error.code, response.error.message].filter(Boolean).join(': ');
      samples.push({ label, ok: false, ms, atMs: Date.now() - phaseStartedAt, error: message, rateLimited: response.status === 429 });
      return;
    }
    samples.push({ label, ok: true, ms, atMs: Date.now() - phaseStartedAt });
  } catch (error) {
    const ms = performance.now() - started;
    const message = error instanceof Error ? error.message : String(error);
    samples.push({ label, ok: false, ms, atMs: Date.now() - phaseStartedAt, error: message, timeout: /timeout|aborted/i.test(message) });
  }
}

const queries = {
  attractions: (client, samples, startedAt) => measured('attractions', () => client.from('broomstick_attractions')
    .select('id,name,address,latitude,longitude,wait_reporting_enabled')
    .eq('published', true).is('archived_at', null).limit(50), samples, startedAt),
  restaurants: (client, samples, startedAt) => measured('restaurants', () => client.from('broomstick_restaurants')
    .select('id,name,address,latitude,longitude,category,cuisine')
    .eq('published', true).is('archived_at', null).limit(50), samples, startedAt),
  parking: (client, samples, startedAt) => measured('parking', () => client.from('broomstick_parking')
    .select('id,name,address,parking_type,latitude,longitude')
    .eq('published', true).is('archived_at', null).limit(50), samples, startedAt),
  bathrooms: (client, samples, startedAt) => measured('bathrooms', () => client.from('broomstick_bathrooms')
    .select('id,name,address,restroom_type,latitude,longitude')
    .eq('published', true).is('archived_at', null).limit(50), samples, startedAt),
  events: (client, samples, startedAt) => measured('events', () => client.from('broomstick_events')
    .select('id,title,venue,start_date,end_date,latitude,longitude')
    .eq('published', true).is('archived_at', null).limit(50), samples, startedAt),
  waits: (client, samples, startedAt) => measured('wait-summaries', () => client.rpc('get_wait_summaries'), samples, startedAt),
  realtimeRead: (client, samples, startedAt) => measured('wait-summary-updates', () => client.from('wait_summary_updates')
    .select('attraction_id,revision,evaluated_at,summary').limit(50), samples, startedAt),
  liveMap: async (client, samples, startedAt) => Promise.all([
    measured('live-map-attractions', () => client.from('broomstick_attractions')
      .select('id,name,category,latitude,longitude').eq('published', true).is('archived_at', null).limit(50), samples, startedAt),
    measured('live-map-restaurants', () => client.from('broomstick_restaurants')
      .select('id,name,category,latitude,longitude').eq('published', true).is('archived_at', null).limit(50), samples, startedAt),
    measured('live-map-parking', () => client.from('broomstick_parking')
      .select('id,name,parking_type,latitude,longitude').eq('published', true).is('archived_at', null).limit(50), samples, startedAt),
    measured('live-map-bathrooms', () => client.from('broomstick_bathrooms')
      .select('id,name,restroom_type,latitude,longitude').eq('published', true).is('archived_at', null).limit(50), samples, startedAt),
  ]),
};

const trafficPattern = [
  ...Array(25).fill('attractions'), ...Array(20).fill('restaurants'),
  ...Array(10).fill('parking'), ...Array(10).fill('bathrooms'),
  ...Array(10).fill('liveMap'), ...Array(15).fill('waits'),
  ...Array(5).fill('events'), ...Array(5).fill('realtimeRead'),
];

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

function comparisonPassed(comparison) {
  return Object.values(comparison).every(Boolean);
}

async function waitFor(predicate, timeoutMs, description) {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error(`${description} timed out`);
    await sleep(25);
  }
}

function attachChannel(client, topic, state) {
  return client.channel(topic, { config: { broadcast: { self: true } } })
    .on('broadcast', { event: 'probe' }, (message) => {
      const probeId = message?.payload?.probeId;
      if (!probeId) return;
      const seen = state.probes.get(probeId);
      if (seen) seen.count += 1;
      else state.probes.set(probeId, { firstAt: performance.now(), count: 1 });
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'wait_summary_updates' }, () => {})
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        state.subscribed = true;
        state.subscribeCount += 1;
      }
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        state.channelErrors += 1;
        state.subscribed = false;
      }
      if (status === 'CLOSED' && !state.cleanup) {
        state.dropped += 1;
        state.subscribed = false;
      }
    });
}

async function runProbe(channels, states, minute) {
  const probeId = crypto.randomUUID();
  const connectedIndexes = states.flatMap((state, index) => state.subscribed ? [index] : []);
  if (!connectedIndexes.length) {
    return { minute, connected: 0, delivered: 0, undelivered: states.length, duplicates: 0, p50Ms: 0, p95Ms: 0, p99Ms: 0, sendError: 'no-connected-channel' };
  }
  const sentAt = performance.now();
  const status = await channels[connectedIndexes[0]].send({ type: 'broadcast', event: 'probe', payload: { probeId } });
  if (status !== 'ok') {
    return { minute, connected: connectedIndexes.length, delivered: 0, undelivered: connectedIndexes.length, duplicates: 0, p50Ms: 0, p95Ms: 0, p99Ms: 0, sendError: String(status) };
  }
  try {
    await waitFor(
      () => connectedIndexes.every((index) => states[index].probes.has(probeId)),
      PROBE_TIMEOUT_MS,
      'Realtime probe',
    );
  } catch { /* Partial delivery is measured below. */ }
  const seen = connectedIndexes.flatMap((index) => {
    const item = states[index].probes.get(probeId);
    return item ? [{ latency: item.firstAt - sentAt, count: item.count }] : [];
  });
  const latencies = seen.map((item) => item.latency);
  return {
    minute,
    connected: connectedIndexes.length,
    delivered: seen.length,
    undelivered: connectedIndexes.length - seen.length,
    duplicates: seen.reduce((sum, item) => sum + Math.max(0, item.count - 1), 0),
    p50Ms: percentile(latencies, 0.5),
    p95Ms: percentile(latencies, 0.95),
    p99Ms: percentile(latencies, 0.99),
    sendError: null,
  };
}

function windowSamples(samples, startMinute, endMinute) {
  const start = startMinute * 60_000;
  const end = endMinute * 60_000;
  return samples.filter((sample) => sample.atMs >= start && sample.atMs < end);
}

function captureResource(minute, eventLoop, clients) {
  const memory = process.memoryUsage();
  const activeHandles = typeof process._getActiveHandles === 'function' ? process._getActiveHandles() : [];
  const sockets = activeHandles.filter((handle) => handle?.constructor?.name === 'Socket').length;
  const channels = clients.reduce((sum, client) => sum + client.getChannels().length, 0);
  const value = {
    minute,
    rssBytes: memory.rss,
    heapUsedBytes: memory.heapUsed,
    externalBytes: memory.external,
    activeHandleCount: activeHandles.length,
    observableSocketHandleCount: sockets,
    trackedChannelCount: channels,
    eventLoopMeanMs: Number.isFinite(eventLoop.mean) ? eventLoop.mean / 1e6 : 0,
    eventLoopP95Ms: eventLoop.percentile(95) / 1e6,
    eventLoopMaxMs: eventLoop.max / 1e6,
  };
  eventLoop.reset();
  return value;
}

function workerLoop(client, worker, samples, phaseStartedAt, deadline, signal) {
  return (async () => {
    await abortableSleep((worker * 97) % THINK_TIME_MS, signal);
    let sequence = worker;
    while (!signal.aborted && Date.now() < deadline) {
      const kind = trafficPattern[(sequence * 37 + worker * 11) % trafficPattern.length];
      await queries[kind](client, samples, phaseStartedAt);
      sequence += 1;
      const jitter = ((sequence * 7919 + worker * 104729) % (THINK_JITTER_MS * 2 + 1)) - THINK_JITTER_MS;
      await abortableSleep(THINK_TIME_MS + jitter, signal);
    }
  })();
}

function realtimeFailureRatio(states) {
  const disconnected = states.filter((state) => !state.subscribed).length;
  const channelErrors = states.reduce((sum, state) => sum + state.channelErrors, 0);
  const drops = states.reduce((sum, state) => sum + state.dropped, 0);
  return Math.max(disconnected, channelErrors, drops) / states.length;
}

async function runPhase(concurrency, baseline) {
  const clients = Array.from({ length: concurrency }, makeClient);
  const states = Array.from({ length: concurrency }, () => ({
    subscribed: false, subscribeCount: 0, channelErrors: 0, dropped: 0, cleanup: false, probes: new Map(),
  }));
  const channels = [];
  const topic = `broomstick-stage3-${concurrency}-${crypto.randomUUID()}`;
  const samples = [];
  const realtimeProbes = [];
  const resourceSamples = [];
  const minuteWindows = [];
  const baselineChecks = [];
  const eventLoop = monitorEventLoopDelay({ resolution: 20 });
  const controller = new AbortController();
  let safetyStop = null;
  let cleanup = null;
  let phaseResult = null;
  let consecutiveHighP95 = 0;
  let consecutiveHighError = 0;
  let consecutiveHighRealtimeLatency = 0;
  let midpointChecked = false;
  const connectionStarted = performance.now();
  for (let index = 0; index < concurrency; index += 1) channels[index] = attachChannel(clients[index], topic, states[index]);
  try {
    try {
      await waitFor(
        () => states.every((state) => state.subscribed || state.channelErrors),
        REALTIME_TIMEOUT_MS,
        'Initial Realtime connections',
      );
    } catch { /* Partial connection result is evaluated by the safety threshold below. */ }
    const initialConnected = states.filter((state) => state.subscribed).length;
    const connectionSetupMs = performance.now() - connectionStarted;
    if ((concurrency - initialConnected) / concurrency > STOP_ERROR_RATE) {
      safetyStop = 'Initial Realtime connection failure exceeded 5%';
      return { concurrency, completed: false, connectionSetupMs, initialConnected, safetyStop };
    }

    const phaseStartedAt = Date.now();
    const deadline = phaseStartedAt + PHASE_DURATION_MS;
    eventLoop.enable();
    const workers = clients.map((client, worker) => workerLoop(client, worker, samples, phaseStartedAt, deadline, controller.signal));
    let minute = 0;
    while (!safetyStop && Date.now() < deadline) {
      minute += 1;
      const nextTick = Math.min(deadline, phaseStartedAt + minute * HEALTH_WINDOW_MS);
      await sleep(Math.max(0, nextTick - Date.now()));
      if (Date.now() > deadline + 5_000) break;

      const window = windowSamples(samples, minute - 1, minute);
      const windowMetrics = summarizeSamples(window, HEALTH_WINDOW_MS);
      minuteWindows.push({ minute, ...windowMetrics });
      resourceSamples.push(captureResource(minute, eventLoop, clients));

      consecutiveHighP95 = windowMetrics.p95Ms > STOP_P95_MS ? consecutiveHighP95 + 1 : 0;
      consecutiveHighError = windowMetrics.errorRate > STOP_ERROR_RATE ? consecutiveHighError + 1 : 0;
      if (consecutiveHighP95 >= 2) safetyStop = 'Sustained request p95 exceeded 3 seconds';
      if (consecutiveHighError >= 2) safetyStop = 'Sustained request error rate exceeded 5%';
      if (windowMetrics.timeoutCount >= 2) safetyStop = 'Repeated request timeouts occurred';
      if (windowMetrics.rateLimitCount >= 2) safetyStop = 'Repeated unexpected rate limiting occurred';

      if (!safetyStop && minute * HEALTH_WINDOW_MS % REALTIME_PROBE_MS === 0) {
        const probe = await runProbe(channels, states, minute);
        realtimeProbes.push(probe);
        consecutiveHighRealtimeLatency = probe.p95Ms > STOP_P95_MS ? consecutiveHighRealtimeLatency + 1 : 0;
        if (consecutiveHighRealtimeLatency >= 2) safetyStop = 'Sustained Realtime p95 exceeded 3 seconds';
        if (probe.sendError || probe.undelivered / concurrency > STOP_ERROR_RATE || realtimeFailureRatio(states) > STOP_ERROR_RATE) {
          safetyStop = 'Realtime connection/drop/delivery failure exceeded 5%';
        }
      }

      if (!safetyStop && !midpointChecked && minute >= 15) {
        const current = await snapshot();
        const comparison = compareBaseline(baseline, current);
        baselineChecks.push({ minute, snapshot: current, comparison });
        midpointChecked = true;
        if (!comparisonPassed(comparison)) safetyStop = 'Production baseline drift detected at 15 minutes';
      }

      if (!safetyStop && minute >= 10) {
        const first = summarizeSamples(windowSamples(samples, 0, 5), 5 * 60_000);
        const recent = summarizeSamples(windowSamples(samples, Math.max(0, minute - 5), minute), 5 * 60_000);
        if (first.p95Ms > 0 && recent.p95Ms > 2 * first.p95Ms && recent.p95Ms > 2_000) {
          safetyStop = 'Significant progressive request-latency degradation detected';
        }
      }

      console.log(`SOAK ${concurrency} minute ${minute}: ${windowMetrics.totalRequests} requests, ${(windowMetrics.errorRate * 100).toFixed(2)}% errors, p95 ${windowMetrics.p95Ms.toFixed(1)} ms, Realtime connected ${states.filter((state) => state.subscribed).length}/${concurrency}`);
      if (safetyStop) controller.abort();
    }
    controller.abort();
    await Promise.all(workers);
    const phaseEndedAt = Date.now();
    const finalSnapshot = await snapshot();
    const finalComparison = compareBaseline(baseline, finalSnapshot);
    baselineChecks.push({ minute: Math.round((phaseEndedAt - phaseStartedAt) / 60_000), snapshot: finalSnapshot, comparison: finalComparison });
    if (!safetyStop && !comparisonPassed(finalComparison)) safetyStop = 'Production baseline drift detected at phase completion';

    const elapsedMs = phaseEndedAt - phaseStartedAt;
    const overall = summarizeWithEndpoints(samples, elapsedMs);
    const durationMinutes = elapsedMs / 60_000;
    const windows = {
      firstFiveMinutes: summarizeSamples(windowSamples(samples, 0, 5), 5 * 60_000),
      middleFiveMinutes: summarizeSamples(windowSamples(samples, Math.max(0, durationMinutes / 2 - 2.5), durationMinutes / 2 + 2.5), 5 * 60_000),
      finalFiveMinutes: summarizeSamples(windowSamples(samples, Math.max(0, durationMinutes - 5), durationMinutes + 0.01), 5 * 60_000),
    };
    const probeLatencies = realtimeProbes.flatMap((probe) => probe.delivered ? [probe.p50Ms] : []);
    const realtime = {
      initialConnected,
      connectionSetupMs,
      probes: realtimeProbes,
      totalProbeDeliveries: realtimeProbes.reduce((sum, probe) => sum + probe.delivered, 0),
      totalUndeliveredProbes: realtimeProbes.reduce((sum, probe) => sum + probe.undelivered, 0),
      totalDuplicateDeliveries: realtimeProbes.reduce((sum, probe) => sum + probe.duplicates, 0),
      deliveryP50Ms: percentile(realtimeProbes.map((probe) => probe.p50Ms), 0.5),
      deliveryP95Ms: percentile(realtimeProbes.map((probe) => probe.p95Ms), 0.95),
      deliveryP99Ms: percentile(realtimeProbes.map((probe) => probe.p99Ms), 0.99),
      deliveryMedianOfClientMediansMs: percentile(probeLatencies, 0.5),
      reconnects: states.reduce((sum, state) => sum + Math.max(0, state.subscribeCount - 1), 0),
      channelErrors: states.reduce((sum, state) => sum + state.channelErrors, 0),
      droppedConnections: states.reduce((sum, state) => sum + state.dropped, 0),
      connectedAtEnd: states.filter((state) => state.subscribed).length,
    };
    phaseResult = {
      concurrency,
      plannedDurationMinutes: PHASE_DURATION_MS / 60_000,
      actualDurationMinutes: durationMinutes,
      completed: !safetyStop && elapsedMs >= PHASE_DURATION_MS - 5_000,
      safetyStop,
      pacing: { thinkTimeMs: THINK_TIME_MS, jitterMs: THINK_JITTER_MS },
      overall,
      windows,
      minuteWindows,
      realtime,
      resources: resourceSamples,
      baselineChecks,
    };
  } finally {
    controller.abort();
    eventLoop.disable();
    for (const state of states) state.cleanup = true;
    await Promise.all(channels.map((channel, index) => clients[index].removeChannel(channel).catch(() => {})));
    for (const client of clients) client.realtime.disconnect();
    cleanup = {
      remainingTrackedChannels: clients.reduce((sum, client) => sum + client.getChannels().length, 0),
      allChannelsRemoved: clients.every((client) => client.getChannels().length === 0),
    };
    if (cleanup.remainingTrackedChannels) console.error(`Cleanup warning: ${cleanup.remainingTrackedChannels} channels remain`);
  }
  return { ...phaseResult, cleanup };
}

(async () => {
  fs.mkdirSync(RESULT_DIR, { recursive: true });
  const generatedAt = new Date().toISOString();
  const report = {
    generatedAt,
    mode: 'production-read-only-soak',
    publishableClientOnly: true,
    writeLoadPerformed: false,
    writeLoadReason: 'Production wait-report writes remain blocked until an isolated and reversible test mechanism exists.',
    phaseDurationMinutes: PHASE_DURATION_MS / 60_000,
    thresholds: { maxErrorRate: STOP_ERROR_RATE, maxP95Ms: STOP_P95_MS },
    baseline: await snapshot(),
    phases: [],
    safetyStop: null,
  };
  try {
    for (const concurrency of PHASES) {
      const phase = await runPhase(concurrency, report.baseline);
      report.phases.push(phase);
      if (!phase.completed || phase.safetyStop) {
        report.safetyStop = { concurrency, reason: phase.safetyStop || 'Phase did not complete its planned duration' };
        break;
      }
    }
  } catch (error) {
    report.safetyStop = {
      concurrency: PHASES[report.phases.length],
      reason: error instanceof Error ? error.message : String(error),
    };
  } finally {
    report.final = await snapshot();
    report.finalBaselineComparison = compareBaseline(report.baseline, report.final);
    report.completedAt = new Date().toISOString();
    const filename = path.join(RESULT_DIR, `stage3-${generatedAt.replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(filename, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`RESULT ${filename}`);
    if (report.safetyStop) process.exitCode = 2;
  }
})().catch((error) => {
  console.error(`Stage 3 soak test failed safely: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
