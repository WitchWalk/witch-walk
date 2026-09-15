import {
  findRestaurantByStableId,
  getMappableRestaurants,
  restaurantMatchesCategory,
  loadRestaurantRows,
  mapSupabaseRestaurant,
  parsePublishedRestaurantRows,
  parseRestaurantCache,
  preferCurrentRestaurantContent,
  serializeRestaurantCache,
  type SupabaseRestaurantRow,
  type RestaurantContentSource,
} from './restaurantContentCore.ts';

const assert = {
  equal(actual: unknown, expected: unknown) {
    if (actual !== expected) throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
  },
  ok(value: unknown) {
    if (!value) throw new Error('Expected a truthy value.');
  },
};

const row: SupabaseRestaurantRow = {
  id: 'turners-seafood',
  name: 'Turner’s Seafood — Admin Edit',
  address: '43 Church Street, Salem, MA',
  short_description: 'Admin summary',
  full_description: 'Admin details',
  category: 'Seafood',
  cuisine: 'New England Seafood',
  latitude: 42.5224278,
  longitude: -70.8952659,
  website_url: 'https://example.com',
  menu_url: 'https://example.com/menu',
  hours: { mon: [{ open: '12:00', close: '21:00' }] },
  image_path: 'turners-seafood/11111111-1111-1111-1111-111111111111.webp',
  featured: true,
  published: true,
  sort_order: 1,
  archived_at: null,
  updated_at: '2026-09-15T12:00:00Z',
};

async function run() {
  assert.equal(parsePublishedRestaurantRows([row]).length, 1);
  assert.equal(parsePublishedRestaurantRows([{ ...row, published: false }]).length, 0);
  assert.equal(parsePublishedRestaurantRows([{ ...row, archived_at: '2026-09-15T12:00:00Z' }]).length, 0);
  assert.equal(parsePublishedRestaurantRows([{ ...row, latitude: null }]).length, 0);

  const monday = new Date('2026-09-14T18:00:00Z');
  const mapped = mapSupabaseRestaurant(row, undefined, (path) => `https://cdn.example/${path}`, 1, monday);
  assert.equal(mapped.id, 'turners-seafood');
  assert.equal(mapped.name, 'Turner’s Seafood — Admin Edit');
  assert.equal(mapped.description, 'Admin summary');
  assert.equal(mapped.longDescription, 'Admin details');
  assert.equal(mapped.category, 'Seafood');
  assert.equal(mapped.cuisine, 'New England Seafood');
  assert.equal(mapped.menuUrl, 'https://example.com/menu');
  assert.equal(mapped.status, 'open');
  assert.equal(mapped.featured, true);
  assert.equal(mapped.priceRange, undefined);
  assert.equal((mapped.image as { uri: string }).uri, 'https://cdn.example/turners-seafood/11111111-1111-1111-1111-111111111111.webp');

  const localImage = { uri: 'bundled-image' };
  const local = mapSupabaseRestaurant({ ...row, image_path: null, hours: {} }, { ...mapped, image: localImage }, () => null, 99, monday);
  assert.equal(local.image, localImage);
  assert.equal(local.hours, 'Hours unavailable');
  assert.equal(local.status, 'unavailable');
  const placeholder = mapSupabaseRestaurant({ ...row, id: 'new-restaurant', image_path: null, featured: false, latitude: null, longitude: null }, undefined, () => null, 99);
  assert.equal(placeholder.image, 99);
  assert.equal(placeholder.featured, false);
  assert.equal(getMappableRestaurants([mapped, placeholder]).length, 1);
  assert.equal(getMappableRestaurants([mapped, placeholder])[0].id, 'turners-seafood');
  assert.equal(restaurantMatchesCategory(mapped, 'Seafood'), true);
  assert.equal(restaurantMatchesCategory({ ...mapped, category: 'Café / Coffee' }, 'Coffee'), true);
  assert.equal(restaurantMatchesCategory(mapped, 'Pizza'), false);
  assert.equal(findRestaurantByStableId([mapped], 'turners-seafood')?.name, mapped.name);
  assert.equal(findRestaurantByStableId([mapped], 'hidden-restaurant'), undefined);

  const now = 10_000;
  let cache = '';
  const zero = await loadRestaurantRows({
    fetchRows: async () => [],
    readCache: async () => cache,
    writeCache: async (serialized) => { cache = serialized; },
    now,
  });
  assert.equal(zero.source, 'supabase');
  assert.equal(zero.rows?.length, 0);

  const filtered = await loadRestaurantRows({
    fetchRows: async () => [{ ...row, published: false }],
    readCache: async () => serializeRestaurantCache([row], now),
    writeCache: async () => undefined,
    now: now + 1,
  });
  assert.equal(filtered.source, 'supabase');
  assert.equal(filtered.rows?.length, 0);

  cache = serializeRestaurantCache([row], now);
  assert.equal(parseRestaurantCache(cache, now + 1)?.rows.length, 1);
  assert.equal(parseRestaurantCache(cache, now + 7 * 60 * 60 * 1000), null);
  const cached = await loadRestaurantRows({
    fetchRows: async () => { throw new Error('offline'); },
    readCache: async () => cache,
    writeCache: async () => undefined,
    now: now + 1,
  });
  assert.equal(cached.source, 'cache');
  assert.equal(cached.rows?.[0].id, 'turners-seafood');
  const bundled = await loadRestaurantRows({
    fetchRows: async () => { throw new Error('offline'); },
    readCache: async () => cache,
    writeCache: async () => undefined,
    now: now + 7 * 60 * 60 * 1000,
  });
  assert.equal(bundled.source, 'bundled');
  assert.equal(bundled.rows, null);
  const current: { source: RestaurantContentSource; refreshedAt: number; restaurants: typeof mapped[] } =
    { source: 'supabase', refreshedAt: now, restaurants: [mapped] };
  const fallback: typeof current = { source: 'bundled', refreshedAt: now + 1, restaurants: [] };
  assert.equal(preferCurrentRestaurantContent(current, fallback, now + 1), current);
  assert.equal(preferCurrentRestaurantContent({ ...current, restaurants: [] }, fallback, now + 1).restaurants.length, 0);
  assert.equal(preferCurrentRestaurantContent(current, fallback, now + 7 * 60 * 60 * 1000), fallback);
  assert.ok(cache);
  console.log('Restaurant RLS filtering, stable IDs, Admin edits/images/hours, Favorites/Map selectors, zero state, cache, and fallback checks passed.');
}

void run();
