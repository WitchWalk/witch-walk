import type { ImageSourcePropType } from 'react-native';

import type { Restaurant } from '@/data/restaurants';
import {
  ATTRACTION_CACHE_MAX_AGE_MILLISECONDS,
  getAttractionHoursPresentation,
  parseAttractionHours,
  type AttractionHours,
} from './attractionContentCore.ts';

export const RESTAURANT_CACHE_VERSION = 1;
export const RESTAURANT_CACHE_MAX_AGE_MILLISECONDS = ATTRACTION_CACHE_MAX_AGE_MILLISECONDS;

export type SupabaseRestaurantRow = {
  id: string;
  name: string;
  address: string;
  short_description: string;
  full_description: string;
  category: string;
  cuisine: string;
  latitude: number | null;
  longitude: number | null;
  website_url: string | null;
  menu_url: string | null;
  hours: AttractionHours;
  image_path: string | null;
  featured: boolean;
  published: true;
  sort_order: number;
  archived_at: null;
  updated_at: string;
};

export type RestaurantContentSource = 'supabase' | 'cache' | 'bundled';

export type RestaurantRowLoadResult = {
  rows: SupabaseRestaurantRow[] | null;
  source: RestaurantContentSource;
  refreshedAt: number;
};

export type MappableRestaurant = Restaurant & { latitude: number; longitude: number };

export function preferCurrentRestaurantContent<T extends { source: RestaurantContentSource; refreshedAt: number }>(
  current: T | undefined,
  fallback: T,
  now = Date.now(),
): T {
  return current && current.source !== 'bundled'
    && current.refreshedAt <= now
    && now - current.refreshedAt <= RESTAURANT_CACHE_MAX_AGE_MILLISECONDS
    ? current : fallback;
}

export function findRestaurantByStableId(restaurants: Restaurant[], id: string | string[] | undefined) {
  const normalized = Array.isArray(id) ? id[0] : id;
  return restaurants.find((restaurant) => restaurant.id === normalized);
}

export function getMappableRestaurants(restaurants: Restaurant[]): MappableRestaurant[] {
  return restaurants.filter((restaurant): restaurant is MappableRestaurant =>
    restaurant.latitude !== null && restaurant.longitude !== null
    && Number.isFinite(restaurant.latitude) && Number.isFinite(restaurant.longitude));
}

export function restaurantMatchesCategory(restaurant: Restaurant, selected: string) {
  if (selected === 'All') return true;
  const normalized = selected.toLowerCase();
  return [restaurant.category, restaurant.cuisine, ...restaurant.tags]
    .some((value) => value.toLowerCase().includes(normalized));
}

type LoadRestaurantRowsOptions = {
  fetchRows: () => Promise<unknown>;
  readCache: () => Promise<string | null>;
  writeCache: (serialized: string) => Promise<void>;
  now?: number;
  maximumCacheAgeMilliseconds?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function requiredString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function optionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function optionalUrl(value: unknown) {
  const result = optionalString(value);
  return result && /^https?:\/\/[^\s]+$/i.test(result) ? result : null;
}

function coordinate(value: unknown, minimum: number, maximum: number) {
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum
    ? value
    : null;
}

export function parsePublishedRestaurantRows(value: unknown): SupabaseRestaurantRow[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate): SupabaseRestaurantRow[] => {
    if (!isRecord(candidate) || candidate.published !== true || candidate.archived_at !== null) return [];
    const id = requiredString(candidate.id);
    const name = requiredString(candidate.name);
    const address = requiredString(candidate.address);
    if (!id || !name || !address || !/^[A-Za-z0-9_-]{1,100}$/.test(id)) return [];
    const latitude = coordinate(candidate.latitude, -90, 90);
    const longitude = coordinate(candidate.longitude, -180, 180);
    if ((latitude === null) !== (longitude === null)) return [];
    return [{
      id,
      name,
      address,
      short_description: typeof candidate.short_description === 'string' ? candidate.short_description.trim() : '',
      full_description: typeof candidate.full_description === 'string' ? candidate.full_description.trim() : '',
      category: typeof candidate.category === 'string' ? candidate.category.trim() : '',
      cuisine: typeof candidate.cuisine === 'string' ? candidate.cuisine.trim() : '',
      latitude,
      longitude,
      website_url: optionalUrl(candidate.website_url),
      menu_url: optionalUrl(candidate.menu_url),
      hours: parseAttractionHours(candidate.hours),
      image_path: optionalString(candidate.image_path),
      featured: candidate.featured === true,
      published: true,
      sort_order: Number.isInteger(candidate.sort_order) ? candidate.sort_order as number : 0,
      archived_at: null,
      updated_at: typeof candidate.updated_at === 'string' ? candidate.updated_at : '',
    }];
  });
}

export function resolveRestaurantImage(
  row: SupabaseRestaurantRow,
  fallback: Restaurant | undefined,
  publicImageUrl: (path: string) => string | null,
  placeholder: ImageSourcePropType,
): ImageSourcePropType {
  if (row.image_path) {
    const url = /^https?:\/\//i.test(row.image_path) ? row.image_path : publicImageUrl(row.image_path);
    if (url) return { uri: url };
  }
  return fallback?.image ?? placeholder;
}

export function mapSupabaseRestaurant(
  row: SupabaseRestaurantRow,
  fallback: Restaurant | undefined,
  publicImageUrl: (path: string) => string | null,
  placeholder: ImageSourcePropType,
  now = new Date(),
): Restaurant {
  const category = row.category || 'Uncategorized';
  const cuisine = row.cuisine || 'Cuisine unavailable';
  const tags = [...new Set([row.category, row.cuisine].filter(Boolean))];
  return {
    id: row.id,
    name: row.name,
    category,
    cuisine,
    tags,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    description: row.short_description,
    longDescription: row.full_description || row.short_description,
    ...getAttractionHoursPresentation(row.hours, now),
    distance: row.latitude === null ? 'Distance unavailable' : fallback?.distance ?? 'Distance unavailable',
    walkingTime: row.latitude === null ? 'Walk unavailable' : fallback?.walkingTime ?? 'Walk unavailable',
    image: resolveRestaurantImage(row, fallback, publicImageUrl, placeholder),
    websiteUrl: row.website_url ?? undefined,
    menuUrl: row.menu_url ?? undefined,
    featured: row.featured,
    contentUpdatedAt: row.updated_at || undefined,
    sortOrder: row.sort_order,
  };
}

export function serializeRestaurantCache(rows: SupabaseRestaurantRow[], savedAt: number) {
  return JSON.stringify({ version: RESTAURANT_CACHE_VERSION, savedAt, rows });
}

export function parseRestaurantCache(
  serialized: string | null,
  now = Date.now(),
  maximumAgeMilliseconds = RESTAURANT_CACHE_MAX_AGE_MILLISECONDS,
) {
  if (!serialized) return null;
  try {
    const value: unknown = JSON.parse(serialized);
    if (!isRecord(value) || value.version !== RESTAURANT_CACHE_VERSION || typeof value.savedAt !== 'number') return null;
    if (value.savedAt > now || now - value.savedAt > maximumAgeMilliseconds) return null;
    if (!Array.isArray(value.rows)) return null;
    const rows = parsePublishedRestaurantRows(value.rows);
    return rows.length === value.rows.length ? { rows, savedAt: value.savedAt } : null;
  } catch {
    return null;
  }
}

export async function loadRestaurantRows({
  fetchRows,
  readCache,
  writeCache,
  now = Date.now(),
  maximumCacheAgeMilliseconds = RESTAURANT_CACHE_MAX_AGE_MILLISECONDS,
}: LoadRestaurantRowsOptions): Promise<RestaurantRowLoadResult> {
  try {
    const value = await fetchRows();
    if (!Array.isArray(value)) throw new Error('Restaurant response was not a list.');
    // A readable response is authoritative. Filter unexpected non-public or
    // malformed rows rather than falling back to potentially hidden bundled data.
    const rows = parsePublishedRestaurantRows(value);
    try { await writeCache(serializeRestaurantCache(rows, now)); } catch { /* Fresh data wins. */ }
    return { rows, source: 'supabase', refreshedAt: now };
  } catch {
    let serialized: string | null = null;
    try { serialized = await readCache(); } catch { /* Continue to bundled fallback. */ }
    const cache = parseRestaurantCache(serialized, now, maximumCacheAgeMilliseconds);
    if (cache) return { rows: cache.rows, source: 'cache', refreshedAt: cache.savedAt };
    return { rows: null, source: 'bundled', refreshedAt: now };
  }
}
