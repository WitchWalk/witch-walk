import AsyncStorage from '@react-native-async-storage/async-storage';

import { bundledAttractions, getBundledAttraction, type Attraction } from '@/data/attractions';
import { getTrustedWaitReportingAttraction } from '@/data/trustedWaitReporting';
import {
  loadAttractionRows,
  mapSupabaseAttraction,
  type AttractionContentSource,
  type SupabaseAttractionRow,
} from '@/services/attractionContentCore';

const CACHE_KEY = '@witch-walk/attraction-content-v1';
const TABLE_NAME = 'broomstick_attractions';
const IMAGE_BUCKET = 'broomstick-attraction-images';
const PLACEHOLDER = require('../../assets/images/home/attractions.png');

const columns = [
  'id', 'name', 'address', 'short_description', 'full_description', 'category',
  'latitude', 'longitude', 'website_url', 'ticket_url', 'house_arauz_video_url',
  'hours', 'hours_notes', 'visitor_tips', 'image_path',
  'featured', 'wait_reporting_enabled', 'published', 'sort_order', 'archived_at', 'updated_at',
].join(',');

export type AttractionContentResult = {
  attractions: Attraction[];
  source: AttractionContentSource;
  refreshedAt: number;
};

function distanceInFeet(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = radians(b.latitude - a.latitude);
  const longitudeDelta = radians(b.longitude - a.longitude);
  const value = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return 20_902_231 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function auditReportingCoordinate(row: SupabaseAttractionRow) {
  if (!__DEV__ || !row.wait_reporting_enabled || row.latitude === null || row.longitude === null) return;
  const trusted = getTrustedWaitReportingAttraction(row.id);
  if (!trusted) {
    console.warn(`[Attractions] Wait reporting is enabled for untrusted attraction ID ${row.id}. Reporting remains blocked.`);
    return;
  }
  const difference = Math.round(distanceInFeet(trusted, { latitude: row.latitude, longitude: row.longitude }));
  if (difference > 50) console.warn(`[Attractions] Content coordinates for ${row.id} differ from trusted reporting coordinates by ${difference} feet.`);
}

export async function loadAttractionContent(): Promise<AttractionContentResult> {
  let supabase: Awaited<typeof import('@/lib/supabase')>['supabase'] | null = null;
  const loaded = await loadAttractionRows({
    fetchRows: async () => {
      ({ supabase } = await import('@/lib/supabase'));
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

  if (!loaded.rows) return { attractions: bundledAttractions, source: loaded.source, refreshedAt: loaded.refreshedAt };
  if (!supabase) {
    try { ({ supabase } = await import('@/lib/supabase')); } catch {
      return { attractions: bundledAttractions, source: 'bundled', refreshedAt: loaded.refreshedAt };
    }
  }
  const client = supabase;

  const publicImageUrl = (path: string) => {
    const { data } = client.storage.from(IMAGE_BUCKET).getPublicUrl(path);
    return data.publicUrl || null;
  };
  const attractions = loaded.rows.map((row) => {
    auditReportingCoordinate(row);
    return mapSupabaseAttraction(row, getBundledAttraction(row.id), publicImageUrl, PLACEHOLDER);
  });
  return { attractions, source: loaded.source, refreshedAt: loaded.refreshedAt };
}
