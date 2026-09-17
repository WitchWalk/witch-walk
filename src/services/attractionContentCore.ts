import type { ImageSourcePropType } from 'react-native';

import type { Attraction } from '@/data/attractions';
import { validateHouseArauzVideoUrl } from './houseArauzContentCore.ts';

export const ATTRACTION_CACHE_VERSION = 1;
export const ATTRACTION_CACHE_MAX_AGE_MILLISECONDS = 6 * 60 * 60 * 1000;

export type AttractionHoursInterval = {
  open: string;
  close: string;
};

export type AttractionHours = Partial<Record<
  'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun',
  AttractionHoursInterval[]
>>;

export type SupabaseAttractionRow = {
  id: string;
  name: string;
  address: string;
  short_description: string;
  full_description: string;
  category: string;
  latitude: number | null;
  longitude: number | null;
  website_url: string | null;
  ticket_url: string | null;
  house_arauz_video_url: string | null;
  hours: AttractionHours;
  hours_notes: string | null;
  visitor_tips: string[];
  image_path: string | null;
  featured: boolean;
  wait_reporting_enabled: boolean;
  published: true;
  sort_order: number;
  archived_at: null;
  updated_at: string;
};

type HoursPresentation = Pick<Attraction, 'hours' | 'status' | 'statusLabel'>;

const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
const timePattern = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readRequiredString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readOptionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readOptionalUrl(value: unknown) {
  const result = readOptionalString(value);
  return result && /^https?:\/\/[^\s]+$/i.test(result) ? result : null;
}

function readCoordinate(value: unknown, minimum: number, maximum: number) {
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum
    ? value
    : null;
}

export function parseAttractionHours(value: unknown): AttractionHours {
  if (!isRecord(value)) return {};
  const result: AttractionHours = {};
  for (const day of dayKeys) {
    const rawIntervals = value[day];
    if (rawIntervals === undefined) continue;
    if (!Array.isArray(rawIntervals)) continue;
    const intervals = rawIntervals.flatMap((candidate): AttractionHoursInterval[] => {
      if (!isRecord(candidate)) return [];
      const open = readOptionalString(candidate.open);
      const close = readOptionalString(candidate.close);
      if (!open || !close || !timePattern.test(open) || !timePattern.test(close) || open >= close) return [];
      return [{ open, close }];
    });
    if (intervals.length === rawIntervals.length) result[day] = intervals;
  }
  return result;
}

function readVisitorTip(value: unknown) {
  if (typeof value === 'string') return value.trim();
  if (!isRecord(value)) return '';
  return readOptionalString(value.text) ?? readOptionalString(value.tip) ?? '';
}

export function parseAttractionVisitorTips(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(readVisitorTip).filter(Boolean);
  if (isRecord(value) && Array.isArray(value.tips)) return parseAttractionVisitorTips(value.tips);
  if (typeof value !== 'string' || !value.trim()) return [];

  const trimmed = value.trim();
  if (trimmed.startsWith('[')) {
    try {
      return parseAttractionVisitorTips(JSON.parse(trimmed));
    } catch {
      // Treat invalid JSON as ordinary text so an Admin-authored tip is not lost.
    }
  }
  return trimmed
    .split(/\r?\n/)
    .map((tip) => tip.replace(/^\s*[-*•]\s*/, '').trim())
    .filter(Boolean);
}

export function parsePublishedAttractionRows(value: unknown): SupabaseAttractionRow[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate): SupabaseAttractionRow[] => {
    if (!isRecord(candidate) || candidate.published !== true || candidate.archived_at !== null) return [];
    const id = readRequiredString(candidate.id);
    const name = readRequiredString(candidate.name);
    const address = readRequiredString(candidate.address);
    if (!id || !name || !address || !/^[A-Za-z0-9_-]{1,100}$/.test(id)) return [];
    const latitude = readCoordinate(candidate.latitude, -90, 90);
    const longitude = readCoordinate(candidate.longitude, -180, 180);
    const hasOneCoordinate = latitude === null !== (longitude === null);
    if (hasOneCoordinate) return [];
    return [{
      id,
      name,
      address,
      short_description: typeof candidate.short_description === 'string' ? candidate.short_description.trim() : '',
      full_description: typeof candidate.full_description === 'string' ? candidate.full_description.trim() : '',
      category: typeof candidate.category === 'string' ? candidate.category.trim() : '',
      latitude,
      longitude,
      website_url: readOptionalUrl(candidate.website_url),
      ticket_url: readOptionalUrl(candidate.ticket_url),
      house_arauz_video_url: validateHouseArauzVideoUrl(candidate.house_arauz_video_url),
      hours: parseAttractionHours(candidate.hours),
      hours_notes: readOptionalString(candidate.hours_notes),
      visitor_tips: parseAttractionVisitorTips(candidate.visitor_tips),
      image_path: readOptionalString(candidate.image_path),
      featured: candidate.featured === true,
      wait_reporting_enabled: candidate.wait_reporting_enabled === true,
      published: true,
      sort_order: Number.isInteger(candidate.sort_order) ? candidate.sort_order as number : 0,
      archived_at: null,
      updated_at: typeof candidate.updated_at === 'string' ? candidate.updated_at : '',
    }];
  });
}

function salemTimeParts(now: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const value = (type: 'weekday' | 'hour' | 'minute') => parts.find((part) => part.type === type)?.value;
  const weekday = value('weekday')?.toLowerCase().slice(0, 3) as (typeof dayKeys)[number] | undefined;
  const hour = Number(value('hour'));
  const minute = Number(value('minute'));
  return { weekday, minutes: hour * 60 + minute };
}

function minutesFromTime(value: string) {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

function formatTime(value: string) {
  const [hourValue, minute] = value.split(':').map(Number);
  const suffix = hourValue >= 12 ? 'PM' : 'AM';
  const hour = hourValue % 12 || 12;
  return `${hour}:${String(minute).padStart(2, '0')} ${suffix}`;
}

export function getAttractionHoursPresentation(hours: AttractionHours, now = new Date()): HoursPresentation {
  const { weekday, minutes } = salemTimeParts(now);
  if (!weekday || !(weekday in hours)) {
    return { hours: 'Hours unavailable', status: 'unavailable', statusLabel: 'Hours unavailable' };
  }
  const intervals = hours[weekday] ?? [];
  if (!intervals.length) return { hours: 'Closed today', status: 'closed', statusLabel: 'Closed Today' };
  const label = intervals.map((interval) => `${formatTime(interval.open)} – ${formatTime(interval.close)}`).join(', ');
  const open = intervals.some((interval) => minutes >= minutesFromTime(interval.open) && minutes < minutesFromTime(interval.close));
  return { hours: label, status: open ? 'open' : 'closed', statusLabel: open ? 'Open Now' : 'Closed Now' };
}

export function resolveAttractionImage(
  row: SupabaseAttractionRow,
  fallback: Attraction | undefined,
  publicImageUrl: (path: string) => string | null,
  placeholder: ImageSourcePropType,
): ImageSourcePropType {
  if (row.image_path) {
    const url = /^https?:\/\//i.test(row.image_path) ? row.image_path : publicImageUrl(row.image_path);
    if (url) return { uri: url };
  }
  return fallback?.image ?? placeholder;
}

export function mapSupabaseAttraction(
  row: SupabaseAttractionRow,
  fallback: Attraction | undefined,
  publicImageUrl: (path: string) => string | null,
  placeholder: ImageSourcePropType,
  now = new Date(),
): Attraction {
  const category = row.category || 'Uncategorized';
  const tags = [...new Set([category, ...(fallback?.tags ?? []).filter((tag) => tag !== fallback?.category)])];
  return {
    id: row.id,
    name: row.name,
    shortName: fallback?.shortName,
    category,
    tags,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    description: row.short_description,
    longDescription: row.full_description,
    ...getAttractionHoursPresentation(row.hours, now),
    hoursNotes: row.hours_notes ?? undefined,
    distance: fallback?.distance ?? 'Distance unavailable',
    image: resolveAttractionImage(row, fallback, publicImageUrl, placeholder),
    featured: row.featured,
    crowdStatus: fallback?.crowdStatus,
    websiteUrl: row.website_url ?? undefined,
    ticketUrl: row.ticket_url ?? undefined,
    waitReportingEnabled: row.wait_reporting_enabled,
    contentUpdatedAt: row.updated_at || undefined,
    sortOrder: row.sort_order,
    historicalFact: fallback?.historicalFact,
    visitorTips: row.visitor_tips,
    houseArauzVideoUrl: row.house_arauz_video_url ?? undefined,
  };
}

export function serializeAttractionCache(rows: SupabaseAttractionRow[], savedAt: number) {
  return JSON.stringify({ version: ATTRACTION_CACHE_VERSION, savedAt, rows });
}

export function parseAttractionCache(
  serialized: string | null,
  now = Date.now(),
  maximumAgeMilliseconds = ATTRACTION_CACHE_MAX_AGE_MILLISECONDS,
) {
  if (!serialized) return null;
  try {
    const value: unknown = JSON.parse(serialized);
    if (!isRecord(value) || value.version !== ATTRACTION_CACHE_VERSION || typeof value.savedAt !== 'number') return null;
    if (value.savedAt > now || now - value.savedAt > maximumAgeMilliseconds) return null;
    if (!Array.isArray(value.rows)) return null;
    const rows = parsePublishedAttractionRows(value.rows);
    return rows.length === value.rows.length ? { rows, savedAt: value.savedAt } : null;
  } catch {
    return null;
  }
}

export type AttractionContentSource = 'supabase' | 'cache' | 'bundled';

export type AttractionRowLoadResult = {
  rows: SupabaseAttractionRow[] | null;
  source: AttractionContentSource;
  refreshedAt: number;
};

type LoadAttractionRowsOptions = {
  fetchRows: () => Promise<unknown>;
  readCache: () => Promise<string | null>;
  writeCache: (serialized: string) => Promise<void>;
  now?: number;
  maximumCacheAgeMilliseconds?: number;
};

export async function loadAttractionRows({
  fetchRows,
  readCache,
  writeCache,
  now = Date.now(),
  maximumCacheAgeMilliseconds = ATTRACTION_CACHE_MAX_AGE_MILLISECONDS,
}: LoadAttractionRowsOptions): Promise<AttractionRowLoadResult> {
  try {
    const value = await fetchRows();
    if (!Array.isArray(value)) throw new Error('Attraction response was not a list.');
    const rows = parsePublishedAttractionRows(value);
    if (rows.length !== value.length) throw new Error('Attraction response contained invalid rows.');
    try { await writeCache(serializeAttractionCache(rows, now)); } catch { /* Cache failure must not discard fresh content. */ }
    return { rows, source: 'supabase', refreshedAt: now };
  } catch {
    let serialized: string | null = null;
    try { serialized = await readCache(); } catch { /* Continue to bundled fallback. */ }
    const cache = parseAttractionCache(serialized, now, maximumCacheAgeMilliseconds);
    if (cache) return { rows: cache.rows, source: 'cache', refreshedAt: cache.savedAt };
    return { rows: null, source: 'bundled', refreshedAt: now };
  }
}
