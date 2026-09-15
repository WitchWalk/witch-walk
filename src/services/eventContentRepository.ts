import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadEventRows, mapSupabaseEvent, preferCurrentEventContent, type EventContentSource, type EventLocation } from './eventContentCore';

const CACHE_KEY = '@witch-walk/event-content-v1';
const IMAGE_BUCKET = 'broomstick-event-images';
const PLACEHOLDER = require('../../assets/images/home/events.png');
const COLUMNS = 'id,title,address,short_description,full_description,category,venue,cost,audience,recurring_note,timezone,start_date,end_date,start_time,end_time,all_day,expires_at,latitude,longitude,website_url,ticket_url,source_url,image_path,featured,published,sort_order,archived_at,updated_at';
export type EventContentResult = { events: EventLocation[]; source: EventContentSource; refreshedAt: number };

export async function loadEventContent(current?: EventContentResult): Promise<EventContentResult> {
  let client: Awaited<typeof import('@/lib/supabase')>['supabase'] | null = null;
  const loaded = await loadEventRows({
    fetchRows: async () => {
      ({ supabase: client } = await import('@/lib/supabase'));
      const { data, error } = await client.from('broomstick_events').select(COLUMNS)
        .eq('published', true).is('archived_at', null)
        .order('start_date', { ascending: true }).order('sort_order', { ascending: true })
        .order('title', { ascending: true }).order('id', { ascending: true });
      if (error) throw error;
      return data;
    },
    readCache: () => AsyncStorage.getItem(CACHE_KEY),
    writeCache: value => AsyncStorage.setItem(CACHE_KEY, value),
  });
  if (loaded.rows && !client) {
    try { ({ supabase: client } = await import('@/lib/supabase')); } catch { /* Cached content can use placeholders during an outage. */ }
  }
  const publicImageUrl = (path: string) => client?.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl || null;
  return preferCurrentEventContent(current, {
    events: loaded.rows === null ? [] : loaded.rows.map(row => mapSupabaseEvent(row, PLACEHOLDER, publicImageUrl)),
    source: loaded.source, refreshedAt: loaded.refreshedAt,
  });
}
