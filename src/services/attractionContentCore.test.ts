import {
  getAttractionHoursPresentation,
  loadAttractionRows,
  mapSupabaseAttraction,
  parseAttractionCache,
  parsePublishedAttractionRows,
  serializeAttractionCache,
  type SupabaseAttractionRow,
} from './attractionContentCore.ts';

const assert = {
  equal(actual: unknown, expected: unknown) {
    if (actual !== expected) throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
  },
  ok(value: unknown) {
    if (!value) throw new Error('Expected a truthy value.');
  },
};

const row: SupabaseAttractionRow = {
  id: 'witch-house',
  name: 'The Witch House — Admin Edit',
  address: '310 1/2 Essex Street, Salem, MA',
  short_description: 'Admin summary',
  full_description: 'Admin description',
  category: 'Historic',
  latitude: 42.5215539,
  longitude: -70.8988987,
  website_url: 'https://example.com',
  ticket_url: 'https://example.com/tickets',
  house_arauz_video_url: 'https://www.youtube.com/watch?v=abcdefghijk',
  hours: { mon: [{ open: '10:00', close: '17:00' }] },
  image_path: 'witch-house/header.jpg',
  featured: true,
  wait_reporting_enabled: true,
  published: true,
  sort_order: 1,
  archived_at: null,
  updated_at: '2026-09-14T12:00:00Z',
};

async function run() {
  const visible = parsePublishedAttractionRows([row]);
  assert.equal(visible.length, 1);
  assert.equal(parsePublishedAttractionRows([{ ...row, published: false }]).length, 0);
  assert.equal(parsePublishedAttractionRows([{ ...row, archived_at: '2026-09-14T12:00:00Z' }]).length, 0);

  const mapped = mapSupabaseAttraction(row, undefined, (path) => `https://cdn.example/${path}`, 1, new Date('2026-09-14T15:00:00Z'));
  assert.equal(mapped.name, 'The Witch House — Admin Edit');
  assert.equal(mapped.featured, true);
  assert.equal(mapped.waitReportingEnabled, true);
  assert.equal(mapped.houseArauzVideoUrl, row.house_arauz_video_url);
  assert.equal((mapped.image as { uri: string }).uri, 'https://cdn.example/witch-house/header.jpg');
  assert.equal(mapped.status, 'open');

  const localImage = { uri: 'local' };
  const localFallback = mapSupabaseAttraction({ ...row, image_path: null }, {
    ...mapped,
    image: localImage,
  }, () => null, 1);
  assert.equal(localFallback.image, localImage);
  const placeholderFallback = mapSupabaseAttraction({ ...row, id: 'new-place', image_path: null, featured: false }, undefined, () => null, 99);
  assert.equal(placeholderFallback.image, 99);
  assert.equal(placeholderFallback.featured, false);

  const mondayOpen = getAttractionHoursPresentation(row.hours, new Date('2026-09-14T15:00:00Z'));
  assert.equal(mondayOpen.status, 'open');
  assert.equal(getAttractionHoursPresentation({}, new Date('2026-09-14T15:00:00Z')).hours, 'Hours unavailable');

  const now = 10_000;
  const serialized = serializeAttractionCache([row], now);
  assert.equal(parseAttractionCache(serialized, now + 1)?.rows.length, 1);
  assert.equal(parseAttractionCache(serialized, now + 7 * 60 * 60 * 1000), null);

  let cache = '';
  const remote = await loadAttractionRows({
    fetchRows: async () => [],
    readCache: async () => cache,
    writeCache: async (value) => { cache = value; },
    now,
  });
  assert.equal(remote.source, 'supabase');
  assert.equal(remote.rows?.length, 0);

  cache = serializeAttractionCache([row], now);
  const cached = await loadAttractionRows({
    fetchRows: async () => { throw new Error('offline'); },
    readCache: async () => cache,
    writeCache: async () => undefined,
    now: now + 1,
  });
  assert.equal(cached.source, 'cache');
  assert.equal(cached.rows?.[0].name, row.name);

  const bundled = await loadAttractionRows({
    fetchRows: async () => { throw new Error('offline'); },
    readCache: async () => cache,
    writeCache: async () => undefined,
    now: now + 7 * 60 * 60 * 1000,
  });
  assert.equal(bundled.source, 'bundled');
  assert.equal(bundled.rows, null);
  assert.ok(cache);
  console.log('Attraction publication, mapping, hours, image, cache, and fallback checks passed.');
}

void run();
