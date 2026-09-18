import AsyncStorage from '@react-native-async-storage/async-storage';
import { bathroomLocations, getBathroomLocation, universalBathroomImage, type BathroomLocation } from '@/data/bathrooms';
import { loadBathroomRows, mapSupabaseBathroom, preferCurrentBathroomContent, type BathroomContentSource } from '@/services/bathroomContentCore';

const CACHE_KEY = '@witch-walk/bathroom-content-v1';
const columns = 'id,name,facility_name,short_description,address,latitude,longitude,restroom_type,public_access,access_notes,seasonal_state,seasonal_notes,hours,portable_toilets,accessibility,accessibility_notes,changing_table,family_restroom,advisory_level,advisory_text,official_url,directions_url,featured,published,sort_order,archived_at,updated_at';
export type BathroomContentResult = { locations: BathroomLocation[]; source: BathroomContentSource; refreshedAt: number };

export async function loadBathroomContent(current?: BathroomContentResult): Promise<BathroomContentResult> {
  const loaded = await loadBathroomRows({
    fetchRows: async () => {
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase.from('broomstick_bathrooms').select(columns)
        .eq('published', true).is('archived_at', null)
        .order('sort_order', { ascending: true }).order('name', { ascending: true }).order('id', { ascending: true });
      if (error) throw error;
      return data;
    },
    readCache: () => AsyncStorage.getItem(CACHE_KEY),
    writeCache: value => AsyncStorage.setItem(CACHE_KEY, value),
  });
  return preferCurrentBathroomContent(current, {
    locations: loaded.rows === null ? bathroomLocations : loaded.rows.map(row => mapSupabaseBathroom(row, getBathroomLocation(row.id), universalBathroomImage)),
    source: loaded.source, refreshedAt: loaded.refreshedAt,
  });
}
