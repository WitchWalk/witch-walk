import {
  findParkingByStableId,
  getMappableParking,
  getParkingExternalMapUrl,
  loadParkingRows,
  mapSupabaseParking,
  parkingMatchesFilter,
  parseParkingCache,
  parsePublishedParkingRows,
  preferCurrentParkingContent,
  RILEY_WEST_LOT_DESTINATION,
  serializeParkingCache,
  type ParkingContentSource,
  type SupabaseParkingRow,
} from './parkingContentCore.ts';

const assert = {
  equal(actual: unknown, expected: unknown) {
    if (actual !== expected) throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
  },
  ok(value: unknown) {
    if (!value) throw new Error('Expected a truthy value.');
  },
};

const museum: SupabaseParkingRow = {
  id: 'museum-place-garage',
  name: 'Museum Place Garage — Admin Edit',
  address: '1 New Liberty Street, Salem, MA',
  short_description: 'Admin summary',
  full_description: 'Admin details',
  parking_type: 'Garage',
  image_path: null,
  rate_notes: 'October event rates may differ; check posted signs',
  accessibility: null,
  accessibility_notes: null,
  ev_charging: true,
  ev_charging_notes: 'Charging availability varies',
  overnight_allowed: null,
  rv_suitable: null,
  motorcycle_notes: null,
  latitude: 42.522086,
  longitude: -70.892199,
  website_url: 'https://example.com/parking',
  directions_url: null,
  hours: { mon: [{ open: '10:00', close: '18:00' }] },
  featured: true,
  published: true,
  sort_order: 0,
  archived_at: null,
  updated_at: '2026-09-15T12:00:00Z',
};

const riley: SupabaseParkingRow = {
  ...museum,
  id: 'riley-plaza-lot',
  name: 'Riley Plaza West Lot',
  address: '212 Washington St, Salem, MA 01970',
  parking_type: 'Public Lot',
  latitude: 42.5187341,
  longitude: -70.8958988,
  rate_notes: null,
  accessibility: false,
  ev_charging: false,
  overnight_allowed: false,
  rv_suitable: false,
  motorcycle_notes: 'Follow posted motorcycle rules',
  hours: {},
};

async function run() {
  assert.equal(parsePublishedParkingRows([museum, riley]).length, 2);
  assert.equal(parsePublishedParkingRows([{ ...museum, published: false }]).length, 0);
  assert.equal(parsePublishedParkingRows([{ ...museum, archived_at: '2026-09-15T12:00:00Z' }]).length, 0);
  assert.equal(parsePublishedParkingRows([{ ...riley, name: 'Riley Plaza' }]).length, 0);
  assert.equal(parsePublishedParkingRows([{ ...riley, parking_type: 'Garage' }]).length, 0);
  assert.equal(parsePublishedParkingRows([{ ...riley, address: 'Generic Riley Plaza' }]).length, 0);
  const brokenCoordinates = parsePublishedParkingRows([{ ...museum, latitude: null }])[0];
  assert.equal(brokenCoordinates.latitude, null);
  assert.equal(brokenCoordinates.longitude, null);

  const mapped = mapSupabaseParking(museum, undefined, 99, new Date('2026-09-14T16:00:00Z'));
  assert.equal(mapped.id, 'museum-place-garage');
  assert.equal(mapped.name, 'Museum Place Garage — Admin Edit');
  assert.equal(mapped.type, 'Garage');
  assert.equal(mapped.description, 'Admin summary');
  assert.equal(mapped.fullDescription, 'Admin details');
  assert.equal(mapped.schedule.kind, 'structured');
  assert.equal(mapped.rateInformation, museum.rate_notes);
  assert.equal(mapped.availability.label, 'Live availability not available');
  assert.equal(mapped.accessible, null);
  assert.equal(mapped.evCharging, 'yes');
  assert.equal(mapped.overnightAllowed, null);
  assert.equal(mapped.rvSuitable, null);
  assert.equal(mapped.image, 99);
  assert.equal(mapped.featured, true);
  const accessible = mapSupabaseParking({ ...museum, accessibility: true, overnight_allowed: true, rv_suitable: true }, undefined, 99);
  assert.equal(accessible.accessible, true);
  assert.equal(accessible.overnightAllowed, true);
  assert.equal(accessible.rvSuitable, true);

  const localImage = { uri: 'bundled-artwork' };
  const mappedRiley = mapSupabaseParking(riley, { ...mapped, image: localImage, distance: '0.7 mi' }, 99);
  assert.equal(mappedRiley.id, 'riley-plaza-lot');
  assert.equal(mappedRiley.name, 'Riley Plaza West Lot');
  assert.equal(mappedRiley.type, 'Public Lot');
  assert.equal(mappedRiley.mapDestination, RILEY_WEST_LOT_DESTINATION);
  assert.equal(mappedRiley.image, localImage);
  const customImage = mapSupabaseParking({ ...museum, image_path: 'parking/museum-place-garage/11111111-1111-4111-8111-111111111111.webp' }, undefined, 99, new Date(), () => 'https://images.example/parking.webp');
  assert.equal((customImage.image as { uri: string }).uri, 'https://images.example/parking.webp');
  const invalidImage = parsePublishedParkingRows([{ ...museum, image_path: 'bathrooms/museum-place-garage/11111111-1111-4111-8111-111111111111.webp' }])[0];
  assert.equal(invalidImage.image_path, null);
  assert.equal(mappedRiley.schedule.summary, 'Hours unavailable');
  assert.equal(mappedRiley.rateInformation, 'Rates unavailable');
  assert.equal(mappedRiley.accessible, false);
  assert.equal(mappedRiley.evCharging, 'no');
  assert.equal(mappedRiley.overnightAllowed, false);
  assert.equal(mappedRiley.rvSuitable, false);
  assert.equal(mappedRiley.motorcycleNotes, 'Follow posted motorcycle rules');
  assert.equal(parkingMatchesFilter(mapped, 'Garages'), true);
  assert.equal(parkingMatchesFilter(mappedRiley, 'Lots'), true);
  assert.equal(parkingMatchesFilter(mappedRiley, 'Garages'), false);
  assert.equal(parkingMatchesFilter(mapped, 'Accessible'), false);
  assert.equal(parkingMatchesFilter(mapped, 'EV Charging'), true);
  assert.equal(findParkingByStableId([mapped], 'museum-place-garage')?.name, mapped.name);
  assert.equal(findParkingByStableId([mapped], 'hidden-parking'), undefined);
  assert.equal(getMappableParking([mapped, mappedRiley]).length, 2);
  assert.ok(decodeURIComponent(getParkingExternalMapUrl(mappedRiley, 'directions')).includes(RILEY_WEST_LOT_DESTINATION));
  assert.ok(decodeURIComponent(getParkingExternalMapUrl(mapped, 'directions')).includes('42.522086,-70.892199'));
  assert.equal(getParkingExternalMapUrl({ ...mapped, directionsUrl: 'https://example.com/official-directions' }, 'directions'), 'https://example.com/official-directions');
  assert.ok(decodeURIComponent(getParkingExternalMapUrl({ ...mappedRiley, directionsUrl: 'https://example.com/generic-riley' }, 'directions')).includes(RILEY_WEST_LOT_DESTINATION));

  const noCoordinates = mapSupabaseParking({ ...museum, id: 'new-lot', parking_type: null, latitude: null, longitude: null, hours: {}, rate_notes: null, ev_charging: null, accessibility: null }, undefined, 99);
  assert.equal(noCoordinates.type, 'Unknown');
  assert.equal(noCoordinates.distance, 'Distance unavailable');
  assert.equal(noCoordinates.evCharging, 'unknown');
  assert.equal(getMappableParking([noCoordinates]).length, 0);
  assert.ok(decodeURIComponent(getParkingExternalMapUrl(noCoordinates, 'map')).includes(noCoordinates.address));

  const now = 10_000;
  let cache = '';
  const zero = await loadParkingRows({ fetchRows: async () => [], readCache: async () => cache, writeCache: async (value) => { cache = value; }, now });
  assert.equal(zero.source, 'supabase');
  assert.equal(zero.rows?.length, 0);
  const hidden = await loadParkingRows({ fetchRows: async () => [{ ...museum, published: false }], readCache: async () => serializeParkingCache([museum], now), writeCache: async () => undefined, now: now + 1 });
  assert.equal(hidden.source, 'supabase');
  assert.equal(hidden.rows?.length, 0);

  cache = serializeParkingCache([museum], now);
  assert.equal(parseParkingCache(cache, now + 1)?.rows.length, 1);
  assert.equal(parseParkingCache(cache, now + 7 * 60 * 60 * 1000), null);
  const cached = await loadParkingRows({ fetchRows: async () => { throw Error('offline'); }, readCache: async () => cache, writeCache: async () => undefined, now: now + 1 });
  assert.equal(cached.source, 'cache');
  assert.equal(cached.rows?.[0].id, 'museum-place-garage');
  const bundled = await loadParkingRows({ fetchRows: async () => { throw Error('offline'); }, readCache: async () => cache, writeCache: async () => undefined, now: now + 7 * 60 * 60 * 1000 });
  assert.equal(bundled.source, 'bundled');
  assert.equal(bundled.rows, null);
  const current: { source: ParkingContentSource; refreshedAt: number; locations: typeof mapped[] } = { source: 'supabase', refreshedAt: now, locations: [mapped] };
  const fallback: typeof current = { source: 'bundled', refreshedAt: now + 1, locations: [] };
  assert.equal(preferCurrentParkingContent(current, fallback, now + 1), current);
  assert.equal(preferCurrentParkingContent({ ...current, locations: [] }, fallback, now + 1).locations.length, 0);
  assert.equal(preferCurrentParkingContent(current, fallback, now + 7 * 60 * 60 * 1000), fallback);
  console.log('Parking publication, Admin mapping, distinct types, Riley identity, optional facts, map/favorites selectors, hours, cache, restart, and zero-state checks passed.');
}

void run();
