import {
  HOUSE_ARAUZ_CHANNEL_SETTING_KEY,
  loadHouseArauzChannel,
  parseHouseArauzChannelCache,
  serializeHouseArauzChannelCache,
  validateHouseArauzChannelUrl,
  validateHouseArauzVideoUrl,
} from './houseArauzContentCore.ts';
import { openExternalUrl } from './supportLinkCore.ts';

const assert = {
  equal(actual: unknown, expected: unknown) {
    if (actual !== expected) throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
  },
  ok(value: unknown) { if (!value) throw new Error('Expected a truthy value.'); },
};

const channel = 'https://www.youtube.com/@HOUSEARAUZ';
const watch = 'https://www.youtube.com/watch?v=abcdefghijk';
const short = 'https://youtu.be/abcdefghijk';
const shorts = 'https://www.youtube.com/shorts/abcdefghijk';

assert.equal(validateHouseArauzChannelUrl(channel), channel);
assert.equal(validateHouseArauzChannelUrl(watch), null);
assert.equal(validateHouseArauzChannelUrl('http://www.youtube.com/@HOUSEARAUZ'), null);
assert.equal(validateHouseArauzVideoUrl(watch), watch);
assert.equal(validateHouseArauzVideoUrl(short), short);
assert.equal(validateHouseArauzVideoUrl(shorts), shorts);
assert.equal(validateHouseArauzVideoUrl('https://example.com/watch?v=abcdefghijk'), null);
assert.equal(validateHouseArauzVideoUrl('not a URL'), null);
assert.equal(validateHouseArauzVideoUrl(null), null);

const now = 1_000_000;
let cache: string | null = null;
const remote = await loadHouseArauzChannel({
  fetchSetting: async () => ({ key: HOUSE_ARAUZ_CHANNEL_SETTING_KEY, value: channel }),
  readCache: async () => cache,
  writeCache: async value => { cache = value; },
  now,
});
assert.equal(remote.url, channel);
assert.equal(remote.source, 'supabase');
assert.ok(cache);
assert.equal(parseHouseArauzChannelCache(serializeHouseArauzChannelCache(channel, now), now + 1)?.url, channel);

const cached = await loadHouseArauzChannel({
  fetchSetting: async () => { throw new Error('offline'); },
  readCache: async () => cache,
  writeCache: async () => undefined,
  now: now + 1,
});
assert.equal(cached.source, 'cache');
assert.equal(cached.url, channel);

const missing = await loadHouseArauzChannel({
  fetchSetting: async () => null,
  readCache: async () => cache,
  writeCache: async value => { cache = value; },
  now: now + 2,
});
assert.equal(missing.source, 'supabase');
assert.equal(missing.url, null);
assert.equal(cache, null);

const unavailable = await loadHouseArauzChannel({
  fetchSetting: async () => { throw new Error('offline'); },
  readCache: async () => null,
  writeCache: async () => undefined,
  now,
});
assert.equal(unavailable.source, 'unavailable');
assert.equal(unavailable.url, null);

let opened = '';
assert.equal(await openExternalUrl(watch, {
  canOpenURL: async url => url === watch,
  openURL: async url => { opened = url; },
}), true);
assert.equal(opened, watch);

console.log('HOUSE ARAUZ URL validation, channel cache/fallback, and exact external opening checks passed.');
