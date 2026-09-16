import type { HouseArauzChannelResult } from '@/services/houseArauzContentCore';
import { loadPublicSettings } from '@/services/publicSettingsRepository';

export async function loadHouseArauzChannelUrl(now = Date.now()): Promise<HouseArauzChannelResult> {
  const result = await loadPublicSettings(now);
  return {
    url: result.settings.houseArauzYoutubeChannelUrl,
    source: result.source,
    refreshedAt: result.refreshedAt,
  };
}
