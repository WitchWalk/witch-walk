import type { ImageSourcePropType } from 'react-native';
import type { ParkingFilter, ParkingLocation, ParkingType } from '@/data/parking';
import {
  ATTRACTION_CACHE_MAX_AGE_MILLISECONDS,
  getAttractionHoursPresentation,
  parseAttractionHours,
  type AttractionHours,
} from './attractionContentCore.ts';

export const PARKING_CACHE_VERSION = 2;
export const PARKING_CACHE_MAX_AGE_MILLISECONDS = ATTRACTION_CACHE_MAX_AGE_MILLISECONDS;
export const RILEY_WEST_LOT_DESTINATION = 'Riley Plaza West Lot, 212 Washington St, Salem, MA 01970';

const supportedTypes = [
  'Garage', 'Public Lot', 'Street Parking', 'MBTA / Transit Parking',
  'Ferry Parking', 'RV Parking', 'Seasonal Parking',
  'Private / Visitor Parking', 'Other',
] as const;

export type SupabaseParkingRow = {
  id: string;
  name: string;
  address: string;
  short_description: string;
  full_description: string;
  parking_type: Exclude<ParkingType, 'Unknown'> | null;
  image_path: string | null;
  rate_notes: string | null;
  accessibility: boolean | null;
  accessibility_notes: string | null;
  ev_charging: boolean | null;
  ev_charging_notes: string | null;
  overnight_allowed: boolean | null;
  rv_suitable: boolean | null;
  motorcycle_notes: string | null;
  latitude: number | null;
  longitude: number | null;
  website_url: string | null;
  directions_url: string | null;
  hours: AttractionHours;
  featured: boolean;
  published: true;
  sort_order: number;
  archived_at: null;
  updated_at: string;
};

export type ParkingContentSource = 'supabase' | 'cache' | 'bundled';
export type ParkingRowLoadResult = { rows: SupabaseParkingRow[] | null; source: ParkingContentSource; refreshedAt: number };
export type MappableParking = ParkingLocation & { latitude: number; longitude: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function url(value: unknown) {
  const result = text(value);
  return result && /^https?:\/\/[^\s]+$/i.test(result) ? result : null;
}

function coordinate(value: unknown, minimum: number, maximum: number) {
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum ? value : null;
}

function triState(value: unknown) {
  return typeof value === 'boolean' ? value : null;
}

function imagePath(value: unknown, id: string) {
  const path = text(value);
  return path && new RegExp(`^parking/${id}/[a-f0-9-]{36}\\.webp$`).test(path) ? path : null;
}

function typeValue(value: unknown): SupabaseParkingRow['parking_type'] {
  return supportedTypes.find((candidate) => candidate === value) ?? null;
}

export function parsePublishedParkingRows(value: unknown): SupabaseParkingRow[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate): SupabaseParkingRow[] => {
    if (!isRecord(candidate) || candidate.published !== true || candidate.archived_at !== null) return [];
    const id = text(candidate.id);
    const name = text(candidate.name);
    const address = text(candidate.address);
    if (!id || !name || !address || !/^[A-Za-z0-9_-]{1,100}$/.test(id)) return [];
    const parkingType = typeValue(candidate.parking_type);
    // This historic stable ID is a named West Lot, never generic Riley Plaza or a garage.
    if (id === 'riley-plaza-lot' &&
      (name !== 'Riley Plaza West Lot' || address !== '212 Washington St, Salem, MA 01970' || parkingType !== 'Public Lot')) return [];
    const latitude = coordinate(candidate.latitude, -90, 90);
    const longitude = coordinate(candidate.longitude, -180, 180);
    const validCoordinates = (latitude === null) === (longitude === null);
    return [{
      id, name, address,
      short_description: typeof candidate.short_description === 'string' ? candidate.short_description.trim() : '',
      full_description: typeof candidate.full_description === 'string' ? candidate.full_description.trim() : '',
      parking_type: parkingType,
      image_path: imagePath(candidate.image_path, id),
      rate_notes: text(candidate.rate_notes),
      accessibility: triState(candidate.accessibility),
      accessibility_notes: text(candidate.accessibility_notes),
      ev_charging: triState(candidate.ev_charging),
      ev_charging_notes: text(candidate.ev_charging_notes),
      overnight_allowed: triState(candidate.overnight_allowed),
      rv_suitable: triState(candidate.rv_suitable),
      motorcycle_notes: text(candidate.motorcycle_notes),
      latitude: validCoordinates ? latitude : null,
      longitude: validCoordinates ? longitude : null,
      website_url: url(candidate.website_url),
      directions_url: url(candidate.directions_url),
      hours: parseAttractionHours(candidate.hours),
      featured: candidate.featured === true,
      published: true,
      sort_order: Number.isInteger(candidate.sort_order) ? candidate.sort_order as number : 0,
      archived_at: null,
      updated_at: typeof candidate.updated_at === 'string' ? candidate.updated_at : '',
    }];
  });
}

export function mapSupabaseParking(row: SupabaseParkingRow, bundled: ParkingLocation | undefined, placeholder: ImageSourcePropType, now = new Date(), publicImageUrl: (path: string) => string | null = () => null): ParkingLocation {
  const hours = getAttractionHoursPresentation(row.hours, now);
  const schedule: ParkingLocation['schedule'] = hours.status === 'unavailable'
    ? { kind: 'unknown', summary: 'Hours unavailable' }
    : { kind: 'structured', summary: hours.hours, status: hours.status };
  return {
    id: row.id,
    name: row.name,
    type: row.parking_type ?? 'Unknown',
    address: row.address,
    mapDestination: row.id === 'riley-plaza-lot' ? RILEY_WEST_LOT_DESTINATION : undefined,
    latitude: row.latitude,
    longitude: row.longitude,
    schedule,
    rateInformation: row.rate_notes ?? 'Rates unavailable',
    accessible: row.accessibility,
    accessibilityNotes: row.accessibility_notes ?? undefined,
    evCharging: row.ev_charging === true ? 'yes' : row.ev_charging === false ? 'no' : 'unknown',
    evChargingNotes: row.ev_charging_notes ?? undefined,
    overnightAllowed: row.overnight_allowed,
    rvSuitable: row.rv_suitable,
    motorcycleNotes: row.motorcycle_notes ?? undefined,
    description: row.short_description,
    fullDescription: row.full_description || row.short_description,
    image: row.image_path && publicImageUrl(row.image_path) ? { uri: publicImageUrl(row.image_path)! } : bundled?.image ?? placeholder,
    websiteUrl: row.website_url ?? undefined,
    directionsUrl: row.directions_url ?? undefined,
    distance: row.latitude === null ? 'Distance unavailable' : bundled?.distance ?? 'Distance unavailable',
    walkingTime: row.latitude === null ? 'Walk unavailable' : bundled?.walkingTime ?? 'Walk unavailable',
    walkingDestination: bundled?.walkingDestination ?? 'Downtown',
    availability: { kind: 'unavailable', label: 'Live availability not available' },
    featured: row.featured,
    contentUpdatedAt: row.updated_at || undefined,
    sortOrder: row.sort_order,
  };
}

export function findParkingByStableId(locations: ParkingLocation[], id: string | string[] | undefined) {
  const normalized = Array.isArray(id) ? id[0] : id;
  return locations.find((location) => location.id === normalized);
}

export function getMappableParking(locations: ParkingLocation[]): MappableParking[] {
  return locations.filter((location): location is MappableParking =>
    location.latitude !== null && location.longitude !== null
    && Number.isFinite(location.latitude) && Number.isFinite(location.longitude));
}

export function parkingMatchesFilter(location: ParkingLocation, filter: ParkingFilter) {
  if (filter === 'All') return true;
  if (filter === 'Garages') return location.type === 'Garage';
  if (filter === 'Lots') return location.type === 'Public Lot';
  if (filter === 'Accessible') return location.accessible === true;
  return location.evCharging === 'yes';
}

export function getParkingExternalMapUrl(location: ParkingLocation, action: 'directions' | 'map') {
  if (action === 'directions' && location.id !== 'riley-plaza-lot' && location.directionsUrl) {
    return location.directionsUrl;
  }
  const namedRiley = location.id === 'riley-plaza-lot';
  const destination = !namedRiley && location.latitude !== null && location.longitude !== null
    && Number.isFinite(location.latitude) && Number.isFinite(location.longitude)
    ? `${location.latitude},${location.longitude}`
    : location.mapDestination ?? `${location.name}, ${location.address}`;
  const query = encodeURIComponent(destination);
  return action === 'directions'
    ? `https://www.google.com/maps/dir/?api=1&destination=${query}`
    : `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export function serializeParkingCache(rows: SupabaseParkingRow[], savedAt: number) {
  return JSON.stringify({ version: PARKING_CACHE_VERSION, savedAt, rows });
}

export function parseParkingCache(serialized: string | null, now = Date.now(), maximumAge = PARKING_CACHE_MAX_AGE_MILLISECONDS) {
  if (!serialized) return null;
  try {
    const value: unknown = JSON.parse(serialized);
    if (!isRecord(value) || value.version !== PARKING_CACHE_VERSION || typeof value.savedAt !== 'number') return null;
    if (value.savedAt > now || now - value.savedAt > maximumAge || !Array.isArray(value.rows)) return null;
    const rows = parsePublishedParkingRows(value.rows);
    return rows.length === value.rows.length ? { rows, savedAt: value.savedAt } : null;
  } catch { return null; }
}

export function preferCurrentParkingContent<T extends { source: ParkingContentSource; refreshedAt: number }>(current: T | undefined, fallback: T, now = Date.now()) {
  return current && current.source !== 'bundled' && current.refreshedAt <= now
    && now - current.refreshedAt <= PARKING_CACHE_MAX_AGE_MILLISECONDS ? current : fallback;
}

type LoadOptions = {
  fetchRows: () => Promise<unknown>;
  readCache: () => Promise<string | null>;
  writeCache: (serialized: string) => Promise<void>;
  now?: number;
  maximumCacheAgeMilliseconds?: number;
};

export async function loadParkingRows({ fetchRows, readCache, writeCache, now = Date.now(), maximumCacheAgeMilliseconds = PARKING_CACHE_MAX_AGE_MILLISECONDS }: LoadOptions): Promise<ParkingRowLoadResult> {
  try {
    const value = await fetchRows();
    if (!Array.isArray(value)) throw new Error('Parking response was not a list.');
    const rows = parsePublishedParkingRows(value);
    try { await writeCache(serializeParkingCache(rows, now)); } catch { /* Current published data wins. */ }
    return { rows, source: 'supabase', refreshedAt: now };
  } catch {
    let serialized: string | null = null;
    try { serialized = await readCache(); } catch { /* Continue to bundled outage fallback. */ }
    const cache = parseParkingCache(serialized, now, maximumCacheAgeMilliseconds);
    if (cache) return { rows: cache.rows, source: 'cache', refreshedAt: cache.savedAt };
    return { rows: null, source: 'bundled', refreshedAt: now };
  }
}
