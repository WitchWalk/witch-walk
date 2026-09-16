import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  HOUSE_ARAUZ_CHANNEL_SETTING_KEY,
  loadHouseArauzChannel,
  type HouseArauzChannelResult,
} from '@/services/houseArauzContentCore';

const CACHE_KEY = '@witch-walk/house-arauz-channel-v1';
const TABLE_NAME = 'broomstick_app_settings';

export async function loadHouseArauzChannelUrl(now = Date.now()): Promise<HouseArauzChannelResult> {
  return loadHouseArauzChannel({
    now,
    fetchSetting: async () => {
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase.from(TABLE_NAME).select('key,value')
        .eq('key', HOUSE_ARAUZ_CHANNEL_SETTING_KEY).maybeSingle();
      if (error) throw error;
      return data;
    },
    readCache: () => AsyncStorage.getItem(CACHE_KEY),
    writeCache: (value) => value === null ? AsyncStorage.removeItem(CACHE_KEY) : AsyncStorage.setItem(CACHE_KEY, value),
  });
}
