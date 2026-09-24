import type { ImageSourcePropType } from 'react-native';
import { ATTRACTION_CACHE_MAX_AGE_MILLISECONDS } from './attractionContentCore.ts';

export const EVENT_CACHE_MAX_AGE_MILLISECONDS = ATTRACTION_CACHE_MAX_AGE_MILLISECONDS;
export const eventCategories = ['Halloween / Haunted Happenings', 'Festival', 'History', 'Tour', 'Family', 'Music', 'Arts / Culture', 'Market / Shopping', 'Food / Drink', 'Community', 'Holiday', 'Special Event', 'Other'] as const;
export type EventContentSource = 'supabase' | 'cache' | 'bundled';
export type EventCategory = typeof eventCategories[number] | 'Unknown';
export type EventOccurrenceRow = {
  id: string; event_id: string; start_date: string; end_date: string | null;
  start_time: string | null; end_time: string | null; all_day: boolean; note: string;
  starts_at: string; ends_at: string;
};
export type EventOccurrence = {
  id: string; startDate: string; endDate: string | null;
  startTime: string | null; endTime: string | null; allDay: boolean; note: string;
  startsAt: string; endsAt: string;
};
export type EventRow = {
  id: string; title: string; short_description: string; full_description: string;
  category: EventCategory; venue: string; address: string;
  latitude: number | null; longitude: number | null;
  start_date: string; end_date: string | null;
  start_time: string | null; end_time: string | null;
  all_day: boolean; timezone: 'America/New_York'; expires_at: string;
  broomstick_event_occurrences: EventOccurrenceRow[];
  cost: string; audience: string; recurring_note: string;
  website_url: string | null; ticket_url: string | null; source_url: string | null; image_path: string | null;
  featured: boolean; published: true; archived_at: null; sort_order: number; updated_at: string;
};
export type EventLocation = {
  id: string; title: string; shortDescription: string; fullDescription: string;
  category: EventCategory; venue: string; address: string;
  latitude: number | null; longitude: number | null;
  startDate: string; endDate: string | null;
  startTime: string | null; endTime: string | null; allDay: boolean;
  expiresAt: string; occurrences: EventOccurrence[];
  cost: string; audience: string; recurringNote: string;
  websiteUrl: string | null; ticketUrl: string | null; sourceUrl: string | null;
  image: ImageSourcePropType; featured: boolean; sortOrder: number; updatedAt: string;
};

function record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function text(value: unknown) { return typeof value === 'string' ? value.trim() : ''; }
function url(value: unknown) {
  const candidate = text(value);
  if (!candidate) return null;
  try {
    const parsed = new URL(candidate);
    return (parsed.protocol === 'https:' || parsed.protocol === 'http:') && !!parsed.hostname && !parsed.username && !parsed.password ? candidate : null;
  } catch { return null; }
}
function coordinate(value: unknown, limit: number) {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= limit ? value : null;
}
function date(value: unknown) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() + 1 === month && parsed.getUTCDate() === day ? value : null;
}
function time(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d(?::00)?$/.test(value)) return null;
  return value.slice(0, 5);
}
function imagePath(value: unknown, id: string) {
  const candidate = text(value);
  return candidate && new RegExp(`^${id}/[a-f0-9-]{36}\\.webp$`).test(candidate) ? candidate : null;
}
const salemFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});
function salemInstant(localDate: string, localTime: string) {
  const base = Date.parse(`${localDate}T${localTime}:00Z`);
  for (const offset of [5, 4]) {
    const candidate = new Date(base + offset * 3_600_000);
    const parts = Object.fromEntries(salemFormatter.formatToParts(candidate).map(part => [part.type, part.value]));
    if (`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}` === `${localDate}T${localTime}`) return candidate.toISOString();
  }
  return null;
}
function occurrence(candidate: unknown, eventId: string): EventOccurrenceRow | null {
  if (!record(candidate)) return null;
  const id = text(candidate.id), occurrenceEventId = text(candidate.event_id);
  const startDate = date(candidate.start_date);
  const endDate = candidate.end_date === null ? null : date(candidate.end_date);
  const startTime = time(candidate.start_time), endTime = time(candidate.end_time);
  const allDay = candidate.all_day === true;
  const startsAt = text(candidate.starts_at), endsAt = text(candidate.ends_at);
  if (!id || occurrenceEventId !== eventId || !startDate || (candidate.end_date !== null && !endDate) ||
    (endDate && endDate < startDate) || (candidate.start_time != null && !startTime) ||
    (candidate.end_time != null && !endTime) || (allDay && (startTime || endTime)) ||
    !Number.isFinite(Date.parse(startsAt)) || !Number.isFinite(Date.parse(endsAt)) ||
    Date.parse(endsAt) <= Date.parse(startsAt)) return null;
  return { id, event_id: eventId, start_date: startDate, end_date: endDate, start_time: startTime,
    end_time: endTime, all_day: allDay, note: text(candidate.note), starts_at: startsAt, ends_at: endsAt };
}
function sortOccurrenceRows(values: EventOccurrenceRow[]) {
  return [...values].sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at) ||
    Date.parse(a.ends_at) - Date.parse(b.ends_at) || a.id.localeCompare(b.id));
}

export function parsePublishedEventRows(value: unknown): EventRow[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate): EventRow[] => {
    if (!record(candidate) || candidate.published !== true || candidate.archived_at !== null) return [];
    const id = text(candidate.id), title = text(candidate.title), start = date(candidate.start_date), end = candidate.end_date === null ? null : date(candidate.end_date);
    if (!id || !title || !start || !/^[A-Za-z0-9_-]{1,100}$/.test(id) || (candidate.end_date !== null && !end) || (end && end < start)) return [];
    if (candidate.timezone !== 'America/New_York' || typeof candidate.expires_at !== 'string' || !Number.isFinite(Date.parse(candidate.expires_at))) return [];
    const occurrenceValues = Array.isArray(candidate.broomstick_event_occurrences)
      ? candidate.broomstick_event_occurrences
      : [{
          id: `legacy-${id}`, event_id: id, start_date: start, end_date: end,
          start_time: candidate.start_time, end_time: candidate.end_time, all_day: candidate.all_day === true,
          note: '', starts_at: salemInstant(start, time(candidate.start_time) || '00:00'),
          ends_at: candidate.expires_at,
        }];
    const occurrences = sortOccurrenceRows(occurrenceValues.map(value => occurrence(value, id)).filter((value): value is EventOccurrenceRow => value !== null));
    if (occurrences.length !== occurrenceValues.length || occurrences.length === 0) return [];
    const duplicates = new Set(occurrences.map(item => JSON.stringify([item.start_date, item.end_date || item.start_date, item.start_time, item.end_time, item.all_day])));
    if (duplicates.size !== occurrences.length) return [];
    const allDay = candidate.all_day === true;
    const startTime = time(candidate.start_time), endTime = time(candidate.end_time);
    if ((candidate.start_time != null && !startTime) || (candidate.end_time != null && !endTime) || (allDay && (startTime || endTime))) return [];
    const latitude = coordinate(candidate.latitude, 90), longitude = coordinate(candidate.longitude, 180);
    return [{
      id, title, start_date: start, end_date: end, start_time: startTime, end_time: endTime,
      all_day: allDay, timezone: 'America/New_York', expires_at: candidate.expires_at,
      broomstick_event_occurrences: occurrences,
      short_description: text(candidate.short_description), full_description: text(candidate.full_description),
      category: eventCategories.find(category => category === candidate.category) ?? 'Unknown',
      venue: text(candidate.venue), address: text(candidate.address),
      latitude: latitude !== null && longitude !== null ? latitude : null,
      longitude: latitude !== null && longitude !== null ? longitude : null,
      cost: text(candidate.cost), audience: text(candidate.audience), recurring_note: text(candidate.recurring_note),
      website_url: url(candidate.website_url), ticket_url: url(candidate.ticket_url), source_url: url(candidate.source_url),
      image_path: imagePath(candidate.image_path, id), featured: candidate.featured === true,
      published: true, archived_at: null, sort_order: Number.isInteger(candidate.sort_order) ? candidate.sort_order as number : 0,
      updated_at: text(candidate.updated_at),
    }];
  });
}

export function mapSupabaseEvent(row: EventRow, placeholder: ImageSourcePropType, publicImageUrl: (path: string) => string | null): EventLocation {
  const imageUrl = row.image_path ? publicImageUrl(row.image_path) : null;
  const occurrences = row.broomstick_event_occurrences.map(item => ({
    id: item.id, startDate: item.start_date, endDate: item.end_date,
    startTime: item.start_time, endTime: item.end_time, allDay: item.all_day,
    note: item.note, startsAt: item.starts_at, endsAt: item.ends_at,
  }));
  return {
    id: row.id, title: row.title, startDate: row.start_date, endDate: row.end_date,
    startTime: row.start_time, endTime: row.end_time, allDay: row.all_day, expiresAt: row.expires_at,
    occurrences,
    shortDescription: row.short_description, fullDescription: row.full_description || row.short_description,
    category: row.category, venue: row.venue, address: row.address,
    latitude: row.latitude, longitude: row.longitude,
    cost: row.cost, audience: row.audience, recurringNote: row.recurring_note,
    websiteUrl: row.website_url, ticketUrl: row.ticket_url, sourceUrl: row.source_url,
    image: imageUrl ? { uri: imageUrl } : placeholder, featured: row.featured, sortOrder: row.sort_order, updatedAt: row.updated_at,
  };
}

export function formatEventDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}
export function getEventDateLabel(event: { startDate: string; endDate: string | null }) {
  return event.endDate && event.endDate !== event.startDate
    ? `${formatEventDate(event.startDate)} – ${formatEventDate(event.endDate)}` : formatEventDate(event.startDate);
}
function formatEventTime(value: string) {
  const [hour, minute] = value.split(':').map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
}
export function getEventTimeLabel(event: { startTime: string | null; endTime: string | null; allDay: boolean }) {
  if (event.allDay) return 'All Day';
  if (event.startTime && event.endTime) return `${formatEventTime(event.startTime)} – ${formatEventTime(event.endTime)}`;
  if (event.startTime) return `Starts ${formatEventTime(event.startTime)}`;
  if (event.endTime) return `Ends ${formatEventTime(event.endTime)}`;
  return 'Time unavailable';
}
export function getNextUpcomingOccurrence(event: Pick<EventLocation, 'occurrences'>, now = new Date()) {
  return event.occurrences.find(item => Date.parse(item.endsAt) > now.getTime()) ?? null;
}
export function isEventExpired(event: Pick<EventLocation, 'occurrences'>, now = new Date()) {
  return !getNextUpcomingOccurrence(event, now);
}
export function getUpcomingEvents(events: EventLocation[], now = new Date()) {
  return events.map(event => ({ event, next: getNextUpcomingOccurrence(event, now) }))
    .filter((item): item is { event: EventLocation; next: EventOccurrence } => item.next !== null)
    .sort((a, b) => Date.parse(a.next.startsAt) - Date.parse(b.next.startsAt) ||
      a.event.sortOrder - b.event.sortOrder || a.event.title.localeCompare(b.event.title) || a.event.id.localeCompare(b.event.id))
    .map(item => item.event);
}
export function findEventByStableId(events: EventLocation[], id: string | string[] | undefined) {
  return events.find(event => event.id === (Array.isArray(id) ? id[0] : id));
}
export function getEventDirectionsUrl(event: Pick<EventLocation, 'latitude' | 'longitude' | 'address'>) {
  const destination = event.latitude !== null && event.longitude !== null && Number.isFinite(event.latitude) && Number.isFinite(event.longitude)
    && Math.abs(event.latitude) <= 90 && Math.abs(event.longitude) <= 180
    ? `${event.latitude},${event.longitude}` : event.address.trim();
  return destination ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}` : null;
}
export function serializeEventCache(rows: EventRow[], savedAt: number) { return JSON.stringify({ version: 2, savedAt, rows }); }
export function parseEventCache(serialized: string | null, now = Date.now()) {
  try {
    const value: unknown = JSON.parse(serialized ?? 'null');
    if (!record(value) || value.version !== 2 || typeof value.savedAt !== 'number' || !Number.isFinite(value.savedAt)
      || value.savedAt > now || now - value.savedAt > EVENT_CACHE_MAX_AGE_MILLISECONDS || !Array.isArray(value.rows)) return null;
    const rows = parsePublishedEventRows(value.rows);
    return rows.length === value.rows.length ? { rows, savedAt: value.savedAt } : null;
  } catch { return null; }
}
export type EventRowsResult = { rows: EventRow[] | null; source: EventContentSource; refreshedAt: number };
export async function loadEventRows(options: {
  fetchRows: () => Promise<unknown>; readCache: () => Promise<string | null>; writeCache: (value: string) => Promise<void>; now?: number;
}): Promise<EventRowsResult> {
  const now = options.now ?? Date.now();
  try {
    const value = await options.fetchRows();
    if (!Array.isArray(value)) throw Error('Event response was not a list.');
    const rows = parsePublishedEventRows(value);
    if (rows.length !== value.length) throw Error('Event response contained invalid rows.');
    try { await options.writeCache(serializeEventCache(rows, now)); } catch { /* Fresh data wins. */ }
    return { rows, source: 'supabase', refreshedAt: now };
  } catch {
    let cache = null;
    try { cache = parseEventCache(await options.readCache(), now); } catch { /* Continue to empty outage fallback. */ }
    return cache ? { rows: cache.rows, source: 'cache', refreshedAt: cache.savedAt } : { rows: null, source: 'bundled', refreshedAt: now };
  }
}
export function preferCurrentEventContent<T extends { source: EventContentSource; refreshedAt: number }>(current: T | undefined, next: T, now = Date.now()) {
  if (next.source === 'supabase') return next;
  return current && current.source !== 'bundled' && current.refreshedAt <= now && now - current.refreshedAt <= EVENT_CACHE_MAX_AGE_MILLISECONDS
    && (next.source === 'bundled' || current.refreshedAt >= next.refreshedAt) ? current : next;
}
