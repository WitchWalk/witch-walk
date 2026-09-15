// In-memory repository checks; --live adds publishable-client SELECTs only.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const storage = new Map();
let rows = [], failure = false, queries = 0;
const calls = [];
const builder = {
  select(columns) { calls.push(['select', columns]); return this; },
  eq(...args) { calls.push(['eq', ...args]); return this; },
  is(...args) { calls.push(['is', ...args]); return this; },
  order(...args) { calls.push(['order', ...args]); return this; },
  then(resolve, reject) { return Promise.resolve({ data: rows, error: failure ? { message: 'offline' } : null }).then(resolve, reject); },
};
const originalLoad = Module._load;
Module._load = function (name, ...args) {
  if (name === '@react-native-async-storage/async-storage') return { getItem: async key => storage.get(key) ?? null, setItem: async (key, value) => { storage.set(key, value); } };
  if (name === '@/lib/supabase') return { supabase: {
    from(table) { assert.equal(table, 'broomstick_events'); queries++; return builder; },
    storage: { from(bucket) { assert.equal(bucket, 'broomstick-event-images'); return { getPublicUrl: image => ({ data: { publicUrl: `https://example.com/${image}` } }) }; } },
  } };
  if (name.startsWith('@/')) name = path.join(root, 'src', name.slice(2));
  return originalLoad.call(this, name, ...args);
};
Module._extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText, filename);
Module._extensions['.png'] = (module, filename) => { module.exports = { uri: filename }; };

(async () => {
  const core = require('../src/services/eventContentCore.ts');
  const { loadEventContent } = require('../src/services/eventContentRepository.ts');
  const id = 'salem-night-faire-2026-10-16';
  const image = `${id}/01234567-89ab-cdef-0123-456789abcdef.webp`;
  const fixture = { id, title: 'The Salem Night Faire 2026', start_date: '2026-10-16', end_date: '2026-10-16',
    start_time: '17:00:00', end_time: '22:00:00', all_day: false, timezone: 'America/New_York', expires_at: '2026-10-17T02:00:00Z',
    venue: 'Salem Pioneer Village', address: '98 West Avenue, Salem, MA 01970', category: 'Halloween / Haunted Happenings',
    image_path: image, featured: false, published: true, archived_at: null };
  rows = [fixture];
  let result = await loadEventContent();
  assert.equal(queries, 1, 'Single efficient Event query');
  assert.ok(calls.some(call => call[0] === 'eq' && call[1] === 'published' && call[2] === true));
  assert.ok(calls.some(call => call[0] === 'is' && call[1] === 'archived_at' && call[2] === null));
  assert.equal(result.source, 'supabase');
  assert.equal(result.events[0].id, id);
  assert.equal(result.events[0].title, fixture.title);
  assert.equal(result.events[0].image.uri, `https://example.com/${image}`);
  assert.equal(core.getEventTimeLabel(result.events[0]), '5:00 PM – 10:00 PM');
  assert.equal(core.findEventByStableId(result.events, id).id, id);
  failure = true;
  assert.equal((await loadEventContent()).source, 'cache', 'Restart should restore valid disk cache');
  failure = false; rows = [];
  result = await loadEventContent(result);
  assert.deepEqual(result.events, [], 'Successful zero rows are authoritative');
  failure = true;
  assert.deepEqual((await loadEventContent()).events, [], 'Empty published cache must remain empty');
  storage.clear();
  assert.deepEqual((await loadEventContent()).events, [], 'No bundled Event dataset exists');
  failure = false; rows = [{ ...fixture, image_path: null }];
  result = await loadEventContent();
  assert.ok(result.events[0].image.uri.endsWith('/events.png'), 'Approved local placeholder used without image');
  rows = [{ ...fixture, published: false, featured: true }];
  result = await loadEventContent();
  assert.equal(result.source, 'cache', 'Malformed publication response must not replace last good cache');
  for (const [file, expected] of [
    ['app/events/index.tsx', /getUpcomingEvents\(events/],
    ['app/events/index.tsx', /\/events\/\[id\]/],
    ['app/events/[id].tsx', /getEvent\(id\)/],
    ['app/events/[id].tsx', /event\.ticketUrl/],
    ['app/_layout.tsx', /EventsProvider/],
  ]) assert.match(fs.readFileSync(path.join(root, file), 'utf8'), expected);
  const { getMapLocations } = require('../src/data/mapLocations.ts');
  const { resolveFavoriteLocation } = require('../src/data/favoriteLocations.ts');
  assert.equal(getMapLocations().some(pin => pin.category === 'events'), false);
  assert.equal(resolveFavoriteLocation({ category: 'events', id }), null);
  if (process.argv.includes('--live')) {
    const env = Object.fromEntries(fs.readFileSync(path.join(root, '.env'), 'utf8').split(/\r?\n/).filter(line => line.includes('=')).map(line => {
      const index = line.indexOf('='); return [line.slice(0, index), line.slice(index + 1)];
    }));
    const { createClient } = require('@supabase/supabase-js');
    const client = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    const { data, error } = await client.from('broomstick_events').select('*');
    assert.equal(error, null);
    assert.ok(data.every(row => row.published && row.archived_at === null));
    const production = core.parsePublishedEventRows(data).find(row => row.id === id);
    assert.ok(production, 'Night Faire must be published');
    const mapped = core.mapSupabaseEvent(production, 4, () => null);
    assert.equal(mapped.title, 'The Salem Night Faire 2026');
    assert.equal(mapped.category, 'Halloween / Haunted Happenings');
    assert.equal(core.getEventDateLabel(mapped), 'October 16, 2026');
    assert.equal(core.getEventTimeLabel(mapped), '5:00 PM – 10:00 PM');
    assert.equal(mapped.venue, 'Salem Pioneer Village');
    assert.equal(mapped.address, '98 West Avenue, Salem, MA 01970');
    assert.equal(mapped.cost, '$20 admission');
    assert.equal(mapped.audience, 'Guests under 16 must be accompanied by a parent or legal guardian.');
    assert.equal(mapped.recurringNote, 'Also scheduled for October 17, October 23, and October 24, 2026.');
    assert.ok(mapped.ticketUrl && mapped.websiteUrl);
    assert.equal(mapped.latitude, null); assert.equal(mapped.longitude, null);
    assert.ok(decodeURIComponent(core.getEventDirectionsUrl(mapped)).includes(mapped.address));
    for (const query of [client.from('broomstick_events').select('id').eq('published', false), client.from('broomstick_events').select('id').not('archived_at', 'is', null)]) {
      const response = await query; assert.equal(response.error, null); assert.deepEqual(response.data, []);
    }
    console.log('Production publishable Event read: Night Faire mapped; Hidden and archived queries empty; no writes.');
  }
  console.log('Event repository, images, stable-ID routing, zero/cache, and unchanged Map/Favorites compatibility passed.');
})().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
