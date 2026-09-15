// Read-only tests: in-memory repository adapters; --live performs publishable SELECTs only.
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
  if (name === '@react-native-async-storage/async-storage') return {
    getItem: async key => storage.get(key) ?? null,
    setItem: async (key, value) => { storage.set(key, value); },
  };
  if (name === '@/lib/supabase') return { supabase: { from(table) { assert.equal(table, 'broomstick_bathrooms'); queries++; return builder; } } };
  if (name.startsWith('@/')) name = path.join(root, 'src', name.slice(2));
  return originalLoad.call(this, name, ...args);
};
Module._extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText, filename);
for (const extension of ['.png', '.jpg', '.jpeg', '.webp']) Module._extensions[extension] = (module, filename) => { module.exports = { uri: filename }; };

(async () => {
  const core = require('../src/services/bathroomContentCore.ts');
  const data = require('../src/data/bathrooms.ts');
  const { loadBathroomContent } = require('../src/services/bathroomContentRepository.ts');
  const { resolveFavoriteLocation } = require('../src/data/favoriteLocations.ts');
  const { getMapLocations } = require('../src/data/mapLocations.ts');
  const { bundledAttractions } = require('../src/data/attractions.ts');
  const { bundledRestaurants } = require('../src/data/restaurants.ts');
  const { bundledParkingLocations } = require('../src/data/parking.ts');
  const fixture = { id: 'salem-public-library-restrooms', name: 'Admin library name', address: '370 Essex Street',
    published: true, archived_at: null, latitude: 42.5202711, longitude: -70.9032027, public_access: 'Public',
    hours: { mon: [{ open: '09:00', close: '21:00' }] }, seasonal_state: 'Year-round' };
  rows = [fixture];
  let result = await loadBathroomContent();
  assert.equal(queries, 1);
  assert.ok(calls.some(call => call[0] === 'eq' && call[1] === 'published' && call[2] === true));
  assert.ok(calls.some(call => call[0] === 'is' && call[1] === 'archived_at' && call[2] === null));
  assert.equal(result.source, 'supabase');
  assert.equal(result.locations[0].name, fixture.name);
  assert.equal(data.getBathroomOperatingStatus(result.locations[0], new Date('2026-09-14T16:00:00Z')).kind, 'open');
  assert.equal(data.getBathroomOperatingStatus(result.locations[0], new Date('2026-09-14T23:00:00Z')).kind, 'open');
  assert.equal(data.getBathroomOperatingStatus(result.locations[0], new Date('2026-09-15T16:00:00Z')).kind, 'unknown');
  const reference = { category: 'bathrooms', id: fixture.id };
  assert.equal(resolveFavoriteLocation(reference, [], [], [], result.locations).name, fixture.name);
  const pins = getMapLocations({}, new Date(), [], [], [], result.locations);
  assert.equal(pins.length, 1);
  assert.equal(pins[0].mapId, `bathrooms:${fixture.id}`);
  assert.equal(pins[0].sourceId, fixture.id);
  assert.equal(pins[0].directionsUrl, core.getBathroomExternalMapUrl(result.locations[0]));
  failure = true;
  assert.equal((await loadBathroomContent()).source, 'cache', 'Restart should restore disk cache');
  failure = false; rows = [];
  result = await loadBathroomContent(result);
  assert.deepEqual(result.locations, []);
  assert.equal(resolveFavoriteLocation(reference, [], [], [], result.locations), null);
  assert.deepEqual(getMapLocations({}, new Date(), [], [], [], result.locations), []);
  failure = true;
  assert.deepEqual((await loadBathroomContent()).locations, [], 'Cached empty publication list remains authoritative');
  storage.clear();
  assert.equal((await loadBathroomContent()).source, 'bundled');
  failure = false;
  for (const local of data.bathroomLocations) {
    const item = core.mapSupabaseBathroom(core.parsePublishedBathroomRows([{ ...fixture, id: local.id }])[0], local, 1);
    assert.equal(item.id, local.id);
    assert.equal(item.image, local.image);
    assert.equal(item.distanceMiles, undefined);
  }
  rows = [{ ...fixture, latitude: null, longitude: null }];
  assert.deepEqual(getMapLocations({}, new Date(), [], [], [], (await loadBathroomContent()).locations), []);
  // Shared adapters keep the other three directories intact when Bathrooms is empty.
  const otherPins = getMapLocations({}, new Date(), bundledAttractions, bundledRestaurants, bundledParkingLocations, []);
  for (const [category, collection] of [['attractions', bundledAttractions], ['restaurants', bundledRestaurants], ['parking', bundledParkingLocations]]) {
    assert.ok(otherPins.some(pin => pin.category === category));
    const item = collection[0];
    assert.equal(resolveFavoriteLocation({ category, id: item.id }, bundledAttractions, bundledRestaurants, bundledParkingLocations, []).id, item.id);
  }
  for (const [filename, match] of [
    ['app/(tabs)/bathrooms.tsx', /useBathrooms\(\)/], ['app/bathrooms/[id].tsx', /getLocation\(id\)/],
    ['app/(tabs)/favorites.tsx', /parkingLocations, bathroomLocations/], ['src/components/map/LiveMapScreen.tsx', /parkingLocations, bathroomLocations/],
  ]) assert.match(fs.readFileSync(path.join(root, filename), 'utf8'), match);
  if (process.argv.includes('--live')) {
    const env = Object.fromEntries(fs.readFileSync(path.join(root, '.env'), 'utf8').split(/\r?\n/).filter(line => line.includes('=')).map(line => {
      const index = line.indexOf('='); return [line.slice(0, index), line.slice(index + 1)];
    }));
    const { createClient } = require('@supabase/supabase-js');
    const client = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    const { data: live, error } = await client.from('broomstick_bathrooms').select('*');
    assert.equal(error, null);
    assert.ok(live.every(row => row.published && row.archived_at === null));
    const parsed = core.parsePublishedBathroomRows(live);
    const library = parsed.find(row => row.id === fixture.id);
    assert.ok(library, 'Published library must be visible');
    const mapped = core.mapSupabaseBathroom(library, data.getBathroomLocation(library.id), 1);
    assert.equal(mapped.name, library.name);
    assert.equal(mapped.description, library.short_description);
    assert.equal(mapped.publicAccess, library.public_access);
    assert.deepEqual(mapped.schedule.hours, library.hours);
    for (const query of [client.from('broomstick_bathrooms').select('id').eq('published', false), client.from('broomstick_bathrooms').select('id').not('archived_at', 'is', null)]) {
      const response = await query;
      assert.equal(response.error, null); assert.deepEqual(response.data, []);
    }
    console.log('Production publishable SELECT: Library visible and mapped; hidden/archived queries empty. No writes attempted.');
  }
  console.log('Bathroom repository, restart, publication removal, stable IDs, Favorites, Map, navigation wiring and other-directory compatibility passed.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
