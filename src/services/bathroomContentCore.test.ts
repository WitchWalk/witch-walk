import {
  bathroomAccessLabel, bathroomAmenityLabel, bathroomNotice, bathroomTypes,
  findBathroomByStableId, getBathroomExternalMapUrl, getMappableBathrooms,
  loadBathroomRows, mapSupabaseBathroom, parseBathroomCache, parsePublishedBathroomRows,
  preferCurrentBathroomContent, serializeBathroomCache,
  type BathroomContentSource,
} from './bathroomContentCore.ts';
import { getAttractionHoursPresentation } from './attractionContentCore.ts';

const assert = {
  equal(actual: unknown, expected: unknown) { if (actual !== expected) throw Error(`Expected ${String(expected)}, received ${String(actual)}`); },
  deepEqual(actual: unknown, expected: unknown) { if (JSON.stringify(actual) !== JSON.stringify(expected)) throw Error('Values differ'); },
  ok(value: unknown) { if (!value) throw Error('Expected truthy value'); },
};

const libraryInput = {
  id: 'salem-public-library-restrooms', name: 'Salem Public Library', facility_name: 'Library facility',
  address: '370 Essex Street, Salem, MA 01970', short_description: 'Admin edited library description',
  latitude: 42.5202711, longitude: -70.9032027, restroom_type: 'Library', public_access: 'Public',
  access_notes: 'Holiday closures may affect access.', seasonal_state: 'Year-round',
  hours: { mon: [{ open: '09:00', close: '21:00' }], sun: [] },
  published: true, archived_at: null,
};
const library = parsePublishedBathroomRows([libraryInput])[0];
const mapped = mapSupabaseBathroom(library, undefined, 1);
assert.equal(mapped.id, libraryInput.id);
assert.equal(mapped.name, libraryInput.name);
assert.equal(mapped.description, libraryInput.short_description);
assert.equal(mapped.facilityName, libraryInput.facility_name);
assert.equal(mapped.restroomType, 'Library');
assert.equal(mapped.publicAccess, 'Public');
assert.equal(mapped.seasonalState, 'Year-round');
assert.equal(mapped.accessible, null);
assert.equal(parsePublishedBathroomRows([{ ...libraryInput, published: false }]).length, 0);
assert.equal(parsePublishedBathroomRows([{ ...libraryInput, archived_at: '2026-09-15' }]).length, 0);
assert.equal(parsePublishedBathroomRows([{ ...libraryInput, id: '../bad' }]).length, 0);
for (const restroom_type of bathroomTypes) assert.equal(parsePublishedBathroomRows([{ ...libraryInput, restroom_type }])[0].restroom_type, restroom_type);
assert.equal(parsePublishedBathroomRows([{ ...libraryInput, restroom_type: 'future' }])[0].restroom_type, null);
for (const public_access of ['Public', 'Limited / Conditional', 'Unknown'] as const) {
  const item = mapSupabaseBathroom({ ...library, public_access }, undefined, 1);
  assert.equal(item.publicAccess, public_access);
  assert.equal(bathroomAccessLabel(item).includes('Public'), public_access === 'Public');
}
for (const value of [true, false, null]) {
  const item = mapSupabaseBathroom({ ...library, accessibility: value, changing_table: value, family_restroom: value, portable_toilets: value }, undefined, 1);
  assert.equal(item.accessible, value);
  assert.equal(item.changingTable, value);
  assert.equal(item.familyRestroom, value);
  assert.equal(item.portableToilets, value);
  assert.equal(bathroomAmenityLabel(value), value === true ? 'Yes' : value === false ? 'No' : 'Unknown');
  if (value === true) assert.equal(item.restroomCategory, 'portable');
}
for (const seasonal_state of ['Year-round', 'Seasonal', 'Unknown'] as const) {
  assert.equal(mapSupabaseBathroom({ ...library, seasonal_state }, undefined, 1).seasonalState, seasonal_state);
}
for (const advisory_level of ['None', 'Advisory', 'Warning'] as const) {
  const item = mapSupabaseBathroom({ ...library, advisory_level, advisory_text: 'NOT RECOMMENDED' }, undefined, 1);
  assert.equal(item.advisoryLevel, advisory_level);
  assert.equal(item.publicAccess, 'Public');
  if (advisory_level !== 'None') assert.ok(bathroomNotice(item).includes('NOT RECOMMENDED'));
}
const caveat = 'Approximately May–November; restroom-specific reconfirmation required. No exact dates are inferred.';
const artists = mapSupabaseBathroom({ ...library, id: 'artists-row-restrooms', seasonal_state: 'Seasonal', seasonal_notes: caveat, hours: {} }, mapped, 2);
assert.equal(artists.seasonalNotes, caveat);
assert.equal(artists.seasonal, true);
assert.equal(artists.seasonalDateRange, undefined);
assert.equal(artists.schedule.kind, 'structured');
assert.ok(bathroomNotice(artists).includes(caveat));
assert.equal(getAttractionHoursPresentation({}, new Date()).status, 'unavailable');
assert.equal(getAttractionHoursPresentation(library.hours, new Date('2026-09-14T16:00:00Z')).status, 'open');
assert.equal(getAttractionHoursPresentation(library.hours, new Date('2026-09-14T02:00:00Z')).status, 'closed');
assert.equal(getAttractionHoursPresentation(library.hours, new Date('2026-09-15T16:00:00Z')).status, 'unavailable');
assert.deepEqual(parsePublishedBathroomRows([{ ...libraryInput, hours: { mon: [{ open: 'garbage', close: '99:99' }] } }])[0].hours, {});
const missing = mapSupabaseBathroom(parsePublishedBathroomRows([{ ...libraryInput, latitude: null }])[0], mapped, 2);
assert.equal(missing.latitude, null);
assert.equal(missing.longitude, null);
assert.equal(getMappableBathrooms([mapped, missing]).length, 1);
assert.equal(getMappableBathrooms([{ ...mapped, latitude: 100 }]).length, 0);
assert.ok(decodeURIComponent(getBathroomExternalMapUrl(missing)!).includes(library.address));
assert.ok(decodeURIComponent(getBathroomExternalMapUrl(mapped)!).includes('42.5202711,-70.9032027'));
assert.equal(getBathroomExternalMapUrl({ ...mapped, directionsUrl: 'https://example.com/approved' }), 'https://example.com/approved');
assert.equal(getBathroomExternalMapUrl({ ...missing, address: '' }), null);
assert.equal(parsePublishedBathroomRows([{ ...libraryInput, directions_url: 'javascript:alert(1)' }])[0].directions_url, null);
assert.equal(findBathroomByStableId([mapped], [mapped.id]), mapped);
assert.equal(findBathroomByStableId([], mapped.id), undefined);

async function run() {
  const now = 100_000;
  let cache: string | null = serializeBathroomCache([library], now);
  const io = { readCache: async () => cache, writeCache: async (value: string) => { cache = value; }, now };
  const offline = async () => { throw Error('offline'); };
  assert.equal((await loadBathroomRows({ ...io, fetchRows: offline })).source, 'cache');
  assert.equal(parseBathroomCache(cache, now + 1)?.rows[0].id, mapped.id);
  assert.equal((await loadBathroomRows({ ...io, now: now + 7 * 60 * 60 * 1000, fetchRows: offline })).rows, null);
  const zero = await loadBathroomRows({ ...io, fetchRows: async () => [] });
  assert.deepEqual(zero.rows, []);
  assert.equal(zero.source, 'supabase');
  assert.deepEqual((await loadBathroomRows({ ...io, fetchRows: offline })).rows, []);
  assert.deepEqual((await loadBathroomRows({ ...io, fetchRows: async () => [{ ...libraryInput, published: false }] })).rows, []);
  const current: { source: BathroomContentSource; refreshedAt: number; locations: typeof mapped[] } = { source: 'supabase', refreshedAt: now, locations: [mapped] };
  const empty: typeof current = { ...current, locations: [] };
  const bundled: typeof current = { ...current, source: 'bundled' };
  assert.equal(preferCurrentBathroomContent(current, empty, now), empty);
  assert.equal(preferCurrentBathroomContent(empty, bundled, now + 1), empty);
  assert.equal(preferCurrentBathroomContent(current, bundled, now + 7 * 60 * 60 * 1000), bundled);
  cache = null;
  assert.equal((await loadBathroomRows({ ...io, fetchRows: offline })).source, 'bundled');
  console.log('Bathroom mapping, publication, access, hours, seasonal caveats, amenities, generic warnings, coordinates, directions, cache/restart and authoritative zero tests passed.');
}
void run();
