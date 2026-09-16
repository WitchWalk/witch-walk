import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  PUBLIC_SETTING_KEYS,
  loadPublicSettingsCore,
  type PublicSettingsResult,
} from '@/services/publicSettingsCore';

const CACHE_KEY = '@witch-walk/public-settings-v1';
const TABLE_NAME = 'broomstick_app_settings';
let pending: Promise<PublicSettingsResult> | null = null;

export function loadPublicSettings(now = Date.now()): Promise<PublicSettingsResult> {
  if (pending) return pending;
  pending = loadPublicSettingsCore({
    now,
    fetchSettings: async () => {
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase.from(TABLE_NAME).select('key,value').in('key', [...PUBLIC_SETTING_KEYS]);
      if (error) throw error;
      return data;
    },
    readCache: () => AsyncStorage.getItem(CACHE_KEY),
    writeCache: (value) => AsyncStorage.setItem(CACHE_KEY, value),
  }).finally(() => { pending = null; });
  return pending;
}
