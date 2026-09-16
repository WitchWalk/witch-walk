import { validateHouseArauzChannelUrl } from './houseArauzContentCore';

export const PUBLIC_SETTINGS_CACHE_MAX_AGE_MILLISECONDS = 6 * 60 * 60 * 1_000;
export const PUBLIC_SETTING_KEYS = [
  'house_arauz_youtube_channel_url',
  'privacy_policy_url',
  'terms_of_service_url',
  'support_url',
  'support_email',
  'about_broomstick_text',
] as const;

export type PublicSettingKey = (typeof PUBLIC_SETTING_KEYS)[number];

export type PublicSettings = {
  houseArauzYoutubeChannelUrl: string | null;
  privacyPolicyUrl: string | null;
  termsOfServiceUrl: string | null;
  supportUrl: string | null;
  supportEmail: string | null;
  aboutBroomstickText: string | null;
};

export const EMPTY_PUBLIC_SETTINGS: PublicSettings = {
  houseArauzYoutubeChannelUrl: null,
  privacyPolicyUrl: null,
  termsOfServiceUrl: null,
  supportUrl: null,
  supportEmail: null,
  aboutBroomstickText: null,
};

export function validatePublicHttpsUrl(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    return value.trim();
  } catch {
    return null;
  }
}

export function validateSupportEmail(value: unknown) {
  if (typeof value !== 'string') return null;
  const email = value.trim();
  if (!email || email.length > 254 || /[\r\n]/.test(email)) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function createSupportEmailUrl(email: string) {
  const validEmail = validateSupportEmail(email);
  return validEmail ? `mailto:${validEmail}?subject=${encodeURIComponent('BROOMSTICK Support')}` : null;
}

function plainText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function mapPublicSettings(rows: unknown): PublicSettings {
  if (!Array.isArray(rows)) throw new Error('Invalid public settings response');
  const values = new Map<PublicSettingKey, unknown>();
  rows.forEach((row) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return;
    const record = row as Record<string, unknown>;
    if (typeof record.key === 'string' && PUBLIC_SETTING_KEYS.includes(record.key as PublicSettingKey)) {
      values.set(record.key as PublicSettingKey, record.value);
    }
  });
  return {
    houseArauzYoutubeChannelUrl: validateHouseArauzChannelUrl(values.get('house_arauz_youtube_channel_url')),
    privacyPolicyUrl: validatePublicHttpsUrl(values.get('privacy_policy_url')),
    termsOfServiceUrl: validatePublicHttpsUrl(values.get('terms_of_service_url')),
    supportUrl: validatePublicHttpsUrl(values.get('support_url')),
    supportEmail: validateSupportEmail(values.get('support_email')),
    aboutBroomstickText: plainText(values.get('about_broomstick_text')),
  };
}

export function serializePublicSettingsCache(settings: PublicSettings, savedAt: number) {
  return JSON.stringify({ version: 1, savedAt, settings });
}

export function parsePublicSettingsCache(value: string | null, now = Date.now()) {
  try {
    const cache: unknown = JSON.parse(value ?? 'null');
    if (!cache || typeof cache !== 'object' || Array.isArray(cache)) return null;
    const record = cache as Record<string, unknown>;
    if (record.version !== 1 || typeof record.savedAt !== 'number' || !Number.isFinite(record.savedAt)
      || record.savedAt > now || now - record.savedAt > PUBLIC_SETTINGS_CACHE_MAX_AGE_MILLISECONDS
      || !record.settings || typeof record.settings !== 'object' || Array.isArray(record.settings)) return null;
    const settings = record.settings as Record<string, unknown>;
    return {
      savedAt: record.savedAt,
      settings: {
        houseArauzYoutubeChannelUrl: validateHouseArauzChannelUrl(settings.houseArauzYoutubeChannelUrl),
        privacyPolicyUrl: validatePublicHttpsUrl(settings.privacyPolicyUrl),
        termsOfServiceUrl: validatePublicHttpsUrl(settings.termsOfServiceUrl),
        supportUrl: validatePublicHttpsUrl(settings.supportUrl),
        supportEmail: validateSupportEmail(settings.supportEmail),
        aboutBroomstickText: plainText(settings.aboutBroomstickText),
      } satisfies PublicSettings,
    };
  } catch {
    return null;
  }
}

export type PublicSettingsResult = {
  settings: PublicSettings;
  source: 'supabase' | 'cache' | 'unavailable';
  refreshedAt: number;
};

export async function loadPublicSettingsCore(options: {
  fetchSettings: () => Promise<unknown>;
  readCache: () => Promise<string | null>;
  writeCache: (value: string) => Promise<void>;
  now?: number;
}): Promise<PublicSettingsResult> {
  const now = options.now ?? Date.now();
  try {
    const settings = mapPublicSettings(await options.fetchSettings());
    try { await options.writeCache(serializePublicSettingsCache(settings, now)); } catch { /* Fresh data remains authoritative. */ }
    return { settings, source: 'supabase', refreshedAt: now };
  } catch {
    try {
      const cached = parsePublicSettingsCache(await options.readCache(), now);
      if (cached) return { settings: cached.settings, source: 'cache', refreshedAt: cached.savedAt };
    } catch { /* Continue to a safe empty state. */ }
    return { settings: EMPTY_PUBLIC_SETTINGS, source: 'unavailable', refreshedAt: now };
  }
}
