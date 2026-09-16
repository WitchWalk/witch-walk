export const HOUSE_ARAUZ_CHANNEL_SETTING_KEY = 'house_arauz_youtube_channel_url';
export const HOUSE_ARAUZ_CHANNEL_CACHE_MAX_AGE_MILLISECONDS = 6 * 60 * 60 * 1000;

type PublicSettingRow = {
  key: typeof HOUSE_ARAUZ_CHANNEL_SETTING_KEY;
  value: string;
};

function parseHttpsUrl(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    return url;
  } catch {
    return null;
  }
}

function isYoutubeHost(hostname: string) {
  return ['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(hostname.toLowerCase());
}

export function validateHouseArauzChannelUrl(value: unknown) {
  const url = parseHttpsUrl(value);
  if (!url || !isYoutubeHost(url.hostname)) return null;
  const path = url.pathname.replace(/\/+$/, '');
  if (!/^\/(?:@[^/]+|channel\/[^/]+|c\/[^/]+|user\/[^/]+)$/.test(path)) return null;
  return typeof value === 'string' ? value.trim() : null;
}

export function validateHouseArauzVideoUrl(value: unknown) {
  const url = parseHttpsUrl(value);
  if (!url) return null;
  const host = url.hostname.toLowerCase();
  let videoId = '';
  if (host === 'youtu.be') videoId = url.pathname.split('/').filter(Boolean)[0] ?? '';
  else if (isYoutubeHost(host) && url.pathname === '/watch') videoId = url.searchParams.get('v') ?? '';
  else if (isYoutubeHost(host) && url.pathname.startsWith('/shorts/')) videoId = url.pathname.split('/').filter(Boolean)[1] ?? '';
  if (!/^[A-Za-z0-9_-]{6,}$/.test(videoId)) return null;
  return typeof value === 'string' ? value.trim() : null;
}

export function parseHouseArauzChannelSetting(value: unknown): PublicSettingRow | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const channelUrl = validateHouseArauzChannelUrl(row.value);
  return row.key === HOUSE_ARAUZ_CHANNEL_SETTING_KEY && channelUrl
    ? { key: HOUSE_ARAUZ_CHANNEL_SETTING_KEY, value: channelUrl }
    : null;
}

export function serializeHouseArauzChannelCache(url: string, savedAt: number) {
  return JSON.stringify({ version: 1, savedAt, url });
}

export function parseHouseArauzChannelCache(value: string | null, now = Date.now()) {
  try {
    const cache: unknown = JSON.parse(value ?? 'null');
    if (!cache || typeof cache !== 'object' || Array.isArray(cache)) return null;
    const record = cache as Record<string, unknown>;
    const url = validateHouseArauzChannelUrl(record.url);
    if (record.version !== 1 || typeof record.savedAt !== 'number' || !Number.isFinite(record.savedAt)
      || record.savedAt > now || now - record.savedAt > HOUSE_ARAUZ_CHANNEL_CACHE_MAX_AGE_MILLISECONDS || !url) return null;
    return { url, savedAt: record.savedAt };
  } catch {
    return null;
  }
}

export type HouseArauzChannelResult = {
  url: string | null;
  source: 'supabase' | 'cache' | 'unavailable';
  refreshedAt: number;
};

export async function loadHouseArauzChannel(options: {
  fetchSetting: () => Promise<unknown>;
  readCache: () => Promise<string | null>;
  writeCache: (value: string | null) => Promise<void>;
  now?: number;
}): Promise<HouseArauzChannelResult> {
  const now = options.now ?? Date.now();
  try {
    const value = await options.fetchSetting();
    const row = parseHouseArauzChannelSetting(value);
    if (!row) {
      try { await options.writeCache(null); } catch { /* The authoritative empty response still wins. */ }
      return { url: null, source: 'supabase', refreshedAt: now };
    }
    try { await options.writeCache(serializeHouseArauzChannelCache(row.value, now)); } catch { /* Fresh data wins. */ }
    return { url: row.value, source: 'supabase', refreshedAt: now };
  } catch {
    try {
      const cache = parseHouseArauzChannelCache(await options.readCache(), now);
      if (cache) return { url: cache.url, source: 'cache', refreshedAt: cache.savedAt };
    } catch { /* Continue to neutral unavailable state. */ }
    return { url: null, source: 'unavailable', refreshedAt: now };
  }
}
