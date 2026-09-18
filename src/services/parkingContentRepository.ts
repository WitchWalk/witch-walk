import AsyncStorage from '@react-native-async-storage/async-storage';

import { bundledParkingLocations, getParkingLocation, universalParkingImage, type ParkingLocation } from '@/data/parking';
import { loadParkingRows, mapSupabaseParking, preferCurrentParkingContent, type ParkingContentSource } from '@/services/parkingContentCore';

const CACHE_KEY = '@witch-walk/parking-content-v1';
const TABLE_NAME = 'broomstick_parking';
const columns = [
  'id', 'name', 'address', 'short_description', 'full_description', 'parking_type',
  'capacity', 'rate_notes', 'accessibility', 'accessibility_notes', 'ev_charging',
  'ev_charging_notes', 'overnight_allowed', 'rv_suitable', 'motorcycle_notes',
  'latitude', 'longitude', 'website_url', 'directions_url', 'hours', 'featured',
  'published', 'sort_order', 'archived_at', 'updated_at',
].join(',');

export type ParkingContentResult = {
  locations: ParkingLocation[];
  source: ParkingContentSource;
  refreshedAt: number;
};

export async function loadParkingContent(current?: ParkingContentResult): Promise<ParkingContentResult> {
  const loaded = await loadParkingRows({
    fetchRows: async () => {
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select(columns)
        .eq('published', true)
        .is('archived_at', null)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })
        .order('id', { ascending: true });
      if (error) throw error;
      return data;
    },
    readCache: () => AsyncStorage.getItem(CACHE_KEY),
    writeCache: (value) => AsyncStorage.setItem(CACHE_KEY, value),
  });

  if (!loaded.rows) return preferCurrentParkingContent(current, {
    locations: bundledParkingLocations, source: 'bundled', refreshedAt: loaded.refreshedAt,
  });
  return {
    locations: loaded.rows.map((row) => mapSupabaseParking(row, getParkingLocation(row.id), universalParkingImage)),
    source: loaded.source,
    refreshedAt: loaded.refreshedAt,
  };
}
