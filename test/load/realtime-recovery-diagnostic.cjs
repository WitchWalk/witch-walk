/* global __dirname */
// Bounded diagnostic only: no sign-in, writes, broadcasts or 500-user phase.
const fs = require('node:fs');
const path = require('node:path');
const { createClient } = require('@supabase/supabase-js');
const root = path.resolve(__dirname, '../..');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function main() {
  const env = Object.fromEntries(fs.readFileSync(path.join(root, '.env'), 'utf8').split(/\r?\n/)
    .map(line => line.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map(m => [m[1], m[2].replace(/^['"]|['"]$/g, '')]));
  const key = env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const url = env.EXPO_PUBLIC_SUPABASE_URL;
  if (!key || !url) throw new Error('Missing public configuration');
  const clean = value => String(value ?? '').split(key).join('[redacted]')
    .replace(/eyJ[A-Za-z0-9_.-]+/g, '[redacted-token]').replace(/https?:\/\/\S+/g, '[url]').slice(0, 1500);
  const result = { startedAt: new Date().toISOString(), limit: 300, maximumMinutes: 8, writes: false, events: [], samples: [] };
  const clients = [], states = [];
  let cleanup = false, stopping = false;
  const interrupt = () => { stopping = true; result.stop = 'interrupted'; };
  process.once('SIGINT', interrupt); process.once('SIGTERM', interrupt);
  const started = Date.now();
  const record = (id, kind, detail) => result.events.push({ ms: Date.now() - started, id, kind, ...detail });
  try {
    for (let id = 0; id < 300; id++) {
      const state = { healthy: false, subscriptions: 0, errors: 0 };
      states.push(state);
      const client = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        global: { fetch: (input, init = {}) => {
          if (!['GET', 'HEAD'].includes((init.method || 'GET').toUpperCase())) throw Error('Write blocked');
          return fetch(input, { ...init, signal: AbortSignal.timeout(10000) });
        } },
        realtime: { heartbeatCallback: (status, latency) => record(id, 'heartbeat', { status, latency }) },
      });
      clients.push(client);
      const channel = client.channel(`recovery-diagnostic-${started}`, { config: { broadcast: { self: true } } });
      channel.on('system', {}, payload => record(id, 'system', {
        status: clean(payload.status), extension: clean(payload.extension), message: clean(payload.message),
      })).on('postgres_changes', { event: '*', schema: 'public', table: 'wait_summary_updates' }, () => {})
        .subscribe((status, error) => {
          if (cleanup) return;
          if (status === 'SUBSCRIBED') { state.healthy = true; state.subscriptions++; }
          else { state.healthy = false; state.errors++; }
          record(id, 'subscription', { status, message: clean(error?.message),
            cause: clean(error?.cause?.message ?? error?.cause?.reason),
            channelState: channel.state, socketConnected: client.realtime.isConnected(),
            socketState: client.realtime.connectionState() });
        });
      if (id % 25 === 24) await sleep(100);
    }
    for (let tick = 0; tick < 48 && !stopping; tick++) {
      await sleep(10000);
      const healthy = states.filter(s => s.healthy).length;
      const sample = { seconds: (Date.now() - started) / 1000, healthy,
        socketsConnected: clients.filter(c => c.realtime.isConnected()).length,
        errors: states.reduce((n,s) => n+s.errors,0),
        recoveries: states.reduce((n,s) => n+Math.max(0,s.subscriptions-1),0) };
      result.samples.push(sample);
      if (tick % 6 === 0) console.log(JSON.stringify(sample));
      if (healthy < 285) { result.stop = 'Realtime unhealthy >5%'; break; }
      if (Date.now() - started >= 480000) break;
    }
    result.stop ??= 'diagnostic time limit';
  } catch (error) { result.stop = clean(error.message); }
  finally {
    cleanup = true;
    await Promise.all(clients.map(c => c.removeAllChannels()));
    clients.forEach(c => c.realtime.disconnect());
    result.remainingChannels = clients.reduce((n,c) => n+c.getChannels().length,0);
    result.completedAt = new Date().toISOString();
    const file = path.join(__dirname, 'results', `realtime-recovery-${result.startedAt.replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(file, JSON.stringify(result, null, 2));
    console.log(JSON.stringify({ file, stop: result.stop, remainingChannels: result.remainingChannels }));
    process.removeListener('SIGINT', interrupt); process.removeListener('SIGTERM', interrupt);
  }
}
if (require.main === module) main().catch(() => { console.error('Diagnostic failed'); process.exitCode = 1; });
