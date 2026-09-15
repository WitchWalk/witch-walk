import type { ImageSourcePropType } from 'react-native';
import type { BathroomLocation } from '@/data/bathrooms';
import { ATTRACTION_CACHE_MAX_AGE_MILLISECONDS, parseAttractionHours, type AttractionHours } from './attractionContentCore.ts';

export const BATHROOM_CACHE_MAX_AGE_MILLISECONDS = ATTRACTION_CACHE_MAX_AGE_MILLISECONDS;
export const bathroomTypes = ['Public Restroom', 'Visitor Center', 'Municipal Building', 'Park / Waterfront', 'Library', 'Museum / Attraction', 'Hotel / Public Access', 'Business / Public Access', 'Transit / Ferry', 'Parking Facility', 'Seasonal Restroom', 'Portable Toilets', 'Other'] as const;
export type BathroomContentSource = 'supabase' | 'cache' | 'bundled';
export type SupabaseBathroomRow = {
  id: string; name: string; facility_name: string | null; short_description: string; address: string;
  latitude: number | null; longitude: number | null;
  restroom_type: typeof bathroomTypes[number] | null;
  public_access: NonNullable<BathroomLocation['publicAccess']>;
  access_notes: string | null;
  seasonal_state: NonNullable<BathroomLocation['seasonalState']>;
  seasonal_notes: string | null;
  hours: AttractionHours;
  portable_toilets: boolean | null; accessibility: boolean | null; accessibility_notes: string | null;
  changing_table: boolean | null; family_restroom: boolean | null;
  advisory_level: NonNullable<BathroomLocation['advisoryLevel']>; advisory_text: string | null;
  official_url: string | null; directions_url: string | null;
  featured: boolean; published: true; archived_at: null; sort_order: number; updated_at: string;
};

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function text(value: unknown) { return typeof value === 'string' && value.trim() ? value.trim() : null; }
function triState(value: unknown) { return typeof value === 'boolean' ? value : null; }
function url(value: unknown) {
  const candidate = text(value);
  if (!candidate) return null;
  try {
    const parsed = new URL(candidate);
    return ['http:', 'https:'].includes(parsed.protocol) && parsed.hostname && !parsed.username && !parsed.password ? candidate : null;
  } catch { return null; }
}
function coordinate(value: unknown, limit: number) {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= limit ? value : null;
}

export function parsePublishedBathroomRows(value: unknown): SupabaseBathroomRow[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row): SupabaseBathroomRow[] => {
    if (!record(row) || row.published !== true || row.archived_at !== null) return [];
    const id = text(row.id), name = text(row.name);
    if (!id || !name || !/^[A-Za-z0-9_-]{1,100}$/.test(id)) return [];
    const lat = coordinate(row.latitude, 90), lon = coordinate(row.longitude, 180);
    const paired = lat !== null && lon !== null;
    return [{
      id, name, facility_name: text(row.facility_name), address: text(row.address) ?? '',
      short_description: text(row.short_description) ?? '',
      latitude: paired ? lat : null, longitude: paired ? lon : null,
      restroom_type: bathroomTypes.find(type => type === row.restroom_type) ?? null,
      public_access: row.public_access === 'Public' || row.public_access === 'Limited / Conditional' ? row.public_access : 'Unknown',
      access_notes: text(row.access_notes),
      seasonal_state: row.seasonal_state === 'Year-round' || row.seasonal_state === 'Seasonal' ? row.seasonal_state : 'Unknown',
      seasonal_notes: text(row.seasonal_notes), hours: parseAttractionHours(row.hours),
      portable_toilets: triState(row.portable_toilets), accessibility: triState(row.accessibility),
      accessibility_notes: text(row.accessibility_notes), changing_table: triState(row.changing_table), family_restroom: triState(row.family_restroom),
      advisory_level: row.advisory_level === 'Warning' || row.advisory_level === 'Advisory' ? row.advisory_level : 'None',
      advisory_text: text(row.advisory_text), official_url: url(row.official_url), directions_url: url(row.directions_url),
      featured: row.featured === true, published: true, archived_at: null,
      sort_order: Number.isInteger(row.sort_order) ? row.sort_order as number : 0,
      updated_at: text(row.updated_at) ?? '',
    }];
  });
}

export function mapSupabaseBathroom(row: SupabaseBathroomRow, bundled: BathroomLocation | undefined, placeholder: ImageSourcePropType): BathroomLocation {
  return {
    id: row.id, name: row.name, mapLabel: row.name, facilityName: row.facility_name ?? undefined,
    address: row.address, latitude: row.latitude, longitude: row.longitude, restroomType: row.restroom_type ?? 'Unknown',
    restroomCategory: row.portable_toilets === true || row.restroom_type === 'Portable Toilets' ? 'portable'
      : row.seasonal_state === 'Seasonal' ? 'seasonal_public' : row.seasonal_state === 'Year-round' ? 'permanent' : 'unknown',
    seasonal: row.seasonal_state === 'Seasonal', seasonalState: row.seasonal_state, seasonalNotes: row.seasonal_notes ?? undefined,
    schedule: { kind: 'structured', hours: row.hours, summary: 'Hours unavailable' },
    publicAccess: row.public_access, accessNotes: row.access_notes ?? undefined,
    accessible: row.accessibility, accessibilityNotes: row.accessibility_notes ?? undefined,
    portableToilets: row.portable_toilets, changingTable: row.changing_table, familyRestroom: row.family_restroom,
    advisoryLevel: row.advisory_level, advisoryText: row.advisory_text ?? undefined,
    description: row.short_description, notes: row.access_notes ?? '',
    // Only artwork may come from the bundled record, never old hours, access or coordinates.
    image: bundled?.image ?? placeholder,
    directionsDestination: row.address, directionsUrl: row.directions_url ?? undefined, officialUrl: row.official_url ?? undefined,
    sourceReference: row.official_url ?? '', lastVerifiedDate: '', contentUpdatedAt: row.updated_at || undefined,
    downtownRelevance: row.sort_order, featured: row.featured,
  };
}

export function bathroomAmenityLabel(value: boolean | null | undefined) {
  return value === true ? 'Yes' : value === false ? 'No' : 'Unknown';
}
export function bathroomAccessLabel(location: BathroomLocation) {
  return location.publicAccess === 'Public' ? 'Public access' : location.publicAccess === 'Limited / Conditional' ? 'Limited / Conditional access' : 'Access unverified';
}
export function bathroomNotice(location: BathroomLocation) {
  if (location.advisoryLevel && location.advisoryLevel !== 'None') return `${location.advisoryLevel}: ${location.advisoryText || 'Check access before visiting.'}`;
  return [location.seasonal ? location.seasonalNotes || (location.schedule.kind === 'seasonal' ? location.schedule.seasonLabel : 'Seasonal access') : '', location.accessNotes || location.notes].filter(Boolean).join(' • ');
}
export function findBathroomByStableId(locations: BathroomLocation[], id: string | string[] | undefined) {
  return locations.find(location => location.id === (Array.isArray(id) ? id[0] : id));
}
export function getMappableBathrooms(locations: BathroomLocation[]) {
  return locations.filter((location): location is BathroomLocation & { latitude: number; longitude: number } =>
    coordinate(location.latitude, 90) !== null && coordinate(location.longitude, 180) !== null);
}
export function getBathroomExternalMapUrl(location: BathroomLocation) {
  const approved = url(location.directionsUrl);
  if (approved) return approved;
  const destination = getMappableBathrooms([location]).length ? `${location.latitude},${location.longitude}` : location.address.trim();
  return destination ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}` : null;
}

export function serializeBathroomCache(rows: SupabaseBathroomRow[], savedAt: number) {
  return JSON.stringify({ version: 1, savedAt, rows });
}
export function parseBathroomCache(serialized: string | null, now = Date.now()) {
  try {
    const value: unknown = JSON.parse(serialized ?? 'null');
    if (!record(value) || value.version !== 1 || typeof value.savedAt !== 'number' || !Number.isFinite(value.savedAt)
      || value.savedAt > now || now - value.savedAt > BATHROOM_CACHE_MAX_AGE_MILLISECONDS || !Array.isArray(value.rows)) return null;
    const rows = parsePublishedBathroomRows(value.rows);
    return rows.length === value.rows.length ? { rows, savedAt: value.savedAt } : null;
  } catch { return null; }
}
export type BathroomRowsResult = { rows: SupabaseBathroomRow[] | null; source: BathroomContentSource; refreshedAt: number };
export async function loadBathroomRows(options: {
  fetchRows: () => Promise<unknown>; readCache: () => Promise<string | null>; writeCache: (value: string) => Promise<void>; now?: number;
}): Promise<BathroomRowsResult> {
  const now = options.now ?? Date.now();
  try {
    const value = await options.fetchRows();
    if (!Array.isArray(value)) throw Error('Bathroom response was not a list.');
    const rows = parsePublishedBathroomRows(value);
    try { await options.writeCache(serializeBathroomCache(rows, now)); } catch { /* Published data wins even if storage fails. */ }
    return { rows, source: 'supabase', refreshedAt: now };
  } catch {
    let cache = null;
    try { cache = parseBathroomCache(await options.readCache(), now); } catch { /* Outage fallback. */ }
    return cache ? { rows: cache.rows, source: 'cache', refreshedAt: cache.savedAt } : { rows: null, source: 'bundled', refreshedAt: now };
  }
}
export function preferCurrentBathroomContent<T extends { source: BathroomContentSource; refreshedAt: number }>(current: T | undefined, next: T, now = Date.now()) {
  if (next.source === 'supabase') return next;
  return current && current.source !== 'bundled' && current.refreshedAt <= now
    && now - current.refreshedAt <= BATHROOM_CACHE_MAX_AGE_MILLISECONDS
    && (next.source === 'bundled' || current.refreshedAt >= next.refreshedAt) ? current : next;
}
