/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
Module._extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText, filename);
const { validateHouseArauzChannelUrl, validateHouseArauzVideoUrl } = require('../src/services/houseArauzContentCore.ts');

assert.match(read('app/(tabs)/index.tsx'), /loadHouseArauzChannelUrl/);
assert.match(read('app/(tabs)/index.tsx'), /openExternalUrl\(url, Linking\)/);
assert.match(read('src/components/attractions/AttractionDetailsView.tsx'), /Watch HOUSE ARAUZ Video/);
assert.match(read('src/components/attractions/AttractionDetailsView.tsx'), /validateHouseArauzVideoUrl\(attraction\.houseArauzVideoUrl\)/);
assert.match(read('src/services/attractionContentRepository.ts'), /house_arauz_video_url/);
assert.doesNotMatch(read('src/data/attractions.ts'), /houseArauzVideoUrl\s*:/);
assert.doesNotMatch(read('src/services/houseArauzContentRepository.ts'), /youtube\.com\//);

async function live() {
  const env = Object.fromEntries(read('.env').split(/\r?\n/).filter(line => line.includes('=')).map(line => {
    const index = line.indexOf('='); return [line.slice(0, index), line.slice(index + 1)];
  }));
  const { createClient } = require('@supabase/supabase-js');
  const client = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const settings = await client.from('broomstick_app_settings').select('key,value');
  assert.equal(settings.error, null);
  assert.deepEqual(settings.data.map(row => row.key), ['house_arauz_youtube_channel_url']);
  assert.equal(validateHouseArauzChannelUrl(settings.data[0].value), settings.data[0].value);
  const unrelated = await client.from('broomstick_app_settings').select('key').neq('key', 'house_arauz_youtube_channel_url');
  assert.equal(unrelated.error, null); assert.deepEqual(unrelated.data, []);

  const published = await client.from('broomstick_attractions')
    .select('id,house_arauz_video_url,published,archived_at')
    .eq('published', true).is('archived_at', null).not('house_arauz_video_url', 'is', null);
  assert.equal(published.error, null);
  const ferry = published.data.find(row => row.id === 'salem-ferry');
  assert.ok(ferry, 'Published Salem Ferry video must be visible');
  assert.equal(validateHouseArauzVideoUrl(ferry.house_arauz_video_url), ferry.house_arauz_video_url);
  const hidden = await client.from('broomstick_attractions').select('id,house_arauz_video_url').eq('published', false);
  assert.equal(hidden.error, null); assert.deepEqual(hidden.data, []);
  const archived = await client.from('broomstick_attractions').select('id,house_arauz_video_url').not('archived_at', 'is', null);
  assert.equal(archived.error, null); assert.deepEqual(archived.data, []);
  console.log('Production publishable read: allowlisted channel setting and published Attraction video visible; unrelated settings and hidden/archived Attractions inaccessible; no writes.');
}

(async () => {
  if (process.argv.includes('--live')) await live();
  console.log('HOUSE ARAUZ Home action, Attraction mapping/action, and bundled fallback checks passed.');
})().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
