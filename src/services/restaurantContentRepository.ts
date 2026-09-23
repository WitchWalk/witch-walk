import AsyncStorage from '@react-native-async-storage/async-storage';

import { bundledRestaurants, getBundledRestaurant, type Restaurant } from '@/data/restaurants';
import {
  loadRestaurantRows,
  mapSupabaseRestaurant,
  preferCurrentRestaurantContent,
  type RestaurantContentSource,
} from '@/services/restaurantContentCore';

const CACHE_KEY = '@witch-walk/restaurant-content-v1';
const TABLE_NAME = 'broomstick_restaurants';
const IMAGE_BUCKET = 'broomstick-restaurant-images';
const PLACEHOLDER = require('../../assets/images/home/restaurants.png');

const columns = [
  'id', 'name', 'address', 'short_description', 'full_description', 'category', 'cuisine',
  'latitude', 'longitude', 'website_url', 'menu_url', 'hours', 'hours_notes', 'image_path',
  'featured', 'published', 'sort_order', 'archived_at', 'updated_at',
].join(',');

export type RestaurantContentResult = {
  restaurants: Restaurant[];
  source: RestaurantContentSource;
  refreshedAt: number;
};

export async function loadRestaurantContent(current?: RestaurantContentResult): Promise<RestaurantContentResult> {
  let supabase: Awaited<typeof import('@/lib/supabase')>['supabase'] | null = null;
  const loaded = await loadRestaurantRows({
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

  if (!loaded.rows) return preferCurrentRestaurantContent(current, {
    restaurants: bundledRestaurants, source: loaded.source, refreshedAt: loaded.refreshedAt,
  });
  if (!supabase) {
    try { ({ supabase } = await import('@/lib/supabase')); } catch { /* Cached rows still remain usable. */ }
  }
  const publicImageUrl = (path: string) => {
    if (!supabase) return null;
    const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
    return data.publicUrl || null;
  };
  const restaurants = loaded.rows.map((row) =>
    mapSupabaseRestaurant(row, getBundledRestaurant(row.id), publicImageUrl, PLACEHOLDER));
  return { restaurants, source: loaded.source, refreshedAt: loaded.refreshedAt };
}
