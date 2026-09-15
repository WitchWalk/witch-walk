import {
  eventCategories, findEventByStableId, formatEventDate, getEventDateLabel, getEventDirectionsUrl, getEventTimeLabel,
  getUpcomingEvents, loadEventRows, mapSupabaseEvent, parseEventCache, parsePublishedEventRows,
  preferCurrentEventContent, serializeEventCache, type EventContentSource,
} from './eventContentCore.ts';

const assert = {
  equal(actual: unknown, expected: unknown) { if (actual !== expected) throw Error(`Expected ${String(expected)}, received ${String(actual)}`); },
  deepEqual(actual: unknown, expected: unknown) { if (JSON.stringify(actual) !== JSON.stringify(expected)) throw Error('Values differ'); },
  ok(value: unknown) { if (!value) throw Error('Expected truthy value'); },
};

const night = {
  id: 'salem-night-faire-2026-10-16', title: 'The Salem Night Faire 2026',
  short_description: 'Admin-edited summary', full_description: 'Admin-edited full description',
  category: 'Halloween / Haunted Happenings', venue: 'Salem Pioneer Village', address: '98 West Avenue, Salem, MA 01970',
  start_date: '2026-10-16', end_date: '2026-10-16', start_time: '17:00:00', end_time: '22:00:00',
  all_day: false, timezone: 'America/New_York', expires_at: '2026-10-17T02:00:00+00:00',
  latitude: null, longitude: null,
  cost: '$20 admission', audience: 'Guests under 16 must be accompanied by a parent or legal guardian.',
  recurring_note: 'Also scheduled for October 17, October 23, and October 24, 2026.',
  website_url: 'https://salemnightfaire.com/about', ticket_url: 'https://www.eventbrite.com/tickets',
  source_url: 'https://example.com/source', image_path: null,
  featured: false, published: true, archived_at: null, sort_order: 0,
  updated_at: '2026-09-15T18:32:43Z',
};
const row = parsePublishedEventRows([night])[0];
const mapped = mapSupabaseEvent(row, 4, () => null);
assert.equal(mapped.id, night.id);
assert.equal(mapped.title, night.title);
assert.equal(mapped.image, 4);
assert.equal(mapped.category, night.category);
assert.equal(mapped.venue, night.venue);
assert.equal(mapped.cost, night.cost);
assert.equal(mapped.audience, night.audience);
assert.equal(mapped.recurringNote, night.recurring_note);
assert.equal(mapped.websiteUrl, night.website_url);
assert.equal(mapped.ticketUrl, night.ticket_url);
assert.equal(mapped.latitude, null);
assert.equal(mapped.longitude, null);
assert.equal(getEventDateLabel(mapped), 'October 16, 2026');
assert.equal(getEventTimeLabel(mapped), '5:00 PM – 10:00 PM');
assert.equal(formatEventDate('2026-10-16'), 'October 16, 2026');
assert.ok(decodeURIComponent(getEventDirectionsUrl(mapped)!).includes(night.address));
assert.equal(getUpcomingEvents([mapped], new Date('2026-10-17T01:59:59Z')).length, 1);
assert.equal(getUpcomingEvents([mapped], new Date('2026-10-17T02:00:00Z')).length, 0);
// The server expiry is an instant; local calendar labels do not shift across the March DST change.
const spring = mapSupabaseEvent(parsePublishedEventRows([{ ...night, id: 'spring-dst', start_date: '2026-03-08', end_date: '2026-03-08',
  start_time: '01:00:00', end_time: '03:00:00', expires_at: '2026-03-08T07:00:00Z' }])[0], 4, () => null);
assert.equal(getEventDateLabel(spring), 'March 8, 2026');
assert.equal(getEventTimeLabel(spring), '1:00 AM – 3:00 AM');
assert.equal(getUpcomingEvents([spring], new Date('2026-03-08T06:59:59Z')).length, 1);
assert.equal(getUpcomingEvents([spring], new Date('2026-03-08T07:00:00Z')).length, 0);
assert.equal(findEventByStableId([mapped], [night.id]), mapped);
assert.equal(findEventByStableId([], night.id), undefined);
assert.deepEqual(parsePublishedEventRows([{ ...night, published: false }]), []);
assert.deepEqual(parsePublishedEventRows([{ ...night, published: false, featured: true }]), []);
assert.deepEqual(parsePublishedEventRows([{ ...night, archived_at: '2026-10-18' }]), []);
assert.deepEqual(parsePublishedEventRows([{ ...night, id: '../unsafe' }]), []);
for (const category of eventCategories) assert.equal(parsePublishedEventRows([{ ...night, category }])[0].category, category);
assert.equal(parsePublishedEventRows([{ ...night, category: 'Future category' }])[0].category, 'Unknown');
const revised = mapSupabaseEvent(parsePublishedEventRows([{ ...night, title: 'New Admin title', start_date: '2026-10-18', end_date: '2026-10-18', venue: 'New venue' }])[0], 4, () => null);
assert.equal(revised.id, night.id);
assert.equal(revised.title, 'New Admin title');
assert.equal(revised.venue, 'New venue');
const multi = mapSupabaseEvent(parsePublishedEventRows([{ ...night, end_date: '2026-10-18', expires_at: '2026-10-19T02:00:00Z' }])[0], 4, () => null);
assert.equal(getEventDateLabel(multi), 'October 16, 2026 – October 18, 2026');
const allDay = mapSupabaseEvent(parsePublishedEventRows([{ ...night, all_day: true, start_time: null, end_time: null, expires_at: '2026-10-17T04:00:00Z' }])[0], 4, () => null);
assert.equal(getEventTimeLabel(allDay), 'All Day');
assert.deepEqual(parsePublishedEventRows([{ ...night, all_day: true }]), []);
const unknownTime = mapSupabaseEvent(parsePublishedEventRows([{ ...night, start_time: null, end_time: null }])[0], 4, () => null);
assert.equal(getEventTimeLabel(unknownTime), 'Time unavailable');
assert.equal(getEventTimeLabel({ ...unknownTime, startTime: '17:00' }), 'Starts 5:00 PM');
assert.deepEqual(parsePublishedEventRows([{ ...night, start_date: '2026-02-30' }]), []);
assert.deepEqual(parsePublishedEventRows([{ ...night, end_date: '2026-10-15' }]), []);
assert.deepEqual(parsePublishedEventRows([{ ...night, start_time: '25:00:00' }]), []);
assert.deepEqual(parsePublishedEventRows([{ ...night, timezone: 'UTC' }]), []);
assert.deepEqual(parsePublishedEventRows([{ ...night, expires_at: 'not-a-date' }]), []);
const paired = parsePublishedEventRows([{ ...night, latitude: 42.52, longitude: null }])[0];
assert.equal(paired.latitude, null); assert.equal(paired.longitude, null);
assert.equal(getEventDirectionsUrl({ ...mapped, address: '', latitude: null, longitude: null }), null);
assert.ok(decodeURIComponent(getEventDirectionsUrl({ ...mapped, latitude: 42.52, longitude: -70.89 })!).includes('42.52,-70.89'));
assert.ok(decodeURIComponent(getEventDirectionsUrl({ ...mapped, latitude: 999, longitude: -70.89 })!).includes(night.address));
const image_path = `${night.id}/01234567-89ab-cdef-0123-456789abcdef.webp`;
const imageRow = parsePublishedEventRows([{ ...night, image_path }])[0];
assert.equal((mapSupabaseEvent(imageRow, 4, path => `https://example.com/${path}`).image as { uri: string }).uri, `https://example.com/${image_path}`);
assert.equal(parsePublishedEventRows([{ ...night, image_path: 'another-event/image.webp' }])[0].image_path, null);
assert.equal(parsePublishedEventRows([{ ...night, ticket_url: 'javascript:bad()' }])[0].ticket_url, null);

async function run() {
  const now = 10_000;
  let cache: string | null = serializeEventCache([row], now);
  const io = { now, readCache: async () => cache, writeCache: async (value: string) => { cache = value; } };
  const offline = async () => { throw Error('offline'); };
  assert.equal((await loadEventRows({ ...io, fetchRows: offline })).source, 'cache');
  assert.equal(parseEventCache(cache, now + 1)?.rows[0].id, night.id);
  assert.equal(parseEventCache(cache, now + 7 * 60 * 60 * 1000), null);
  assert.equal((await loadEventRows({ ...io, now: now + 7 * 60 * 60 * 1000, fetchRows: offline })).rows, null);
  const zero = await loadEventRows({ ...io, fetchRows: async () => [] });
  assert.equal(zero.source, 'supabase'); assert.deepEqual(zero.rows, []);
  assert.deepEqual((await loadEventRows({ ...io, fetchRows: offline })).rows, []);
  const invalid = await loadEventRows({ ...io, fetchRows: async () => [{ ...night, published: false }] });
  assert.equal(invalid.source, 'cache');
  const current: { source: EventContentSource; refreshedAt: number; events: typeof mapped[] } = { source: 'supabase', refreshedAt: now, events: [mapped] };
  const bundled: typeof current = { ...current, source: 'bundled' };
  const empty: typeof current = { ...current, events: [] };
  assert.equal(preferCurrentEventContent(current, empty, now), empty);
  assert.equal(preferCurrentEventContent(empty, bundled, now + 1), empty);
  assert.equal(preferCurrentEventContent(current, bundled, now + 7 * 60 * 60 * 1000), bundled);
  cache = null;
  assert.equal((await loadEventRows({ ...io, fetchRows: offline })).source, 'bundled');
  console.log('Event publication, Admin mapping, dates, DST/expiry, image/URL, coordinates, zero state and six-hour cache checks passed.');
}
void run();
