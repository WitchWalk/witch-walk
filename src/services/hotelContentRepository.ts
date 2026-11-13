import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = '@broomstick/hotel-content-v1';
const TABLE_NAME = 'broomstick_hotels';
const IMAGE_BUCKET = 'broomstick-hotel-images';

export type Hotel = {
  id: string;
  name: string;
  address: string | null;
  shortDescription: string;
  fullDescription: string;
  latitude: number | null;
  longitude: number | null;
  websiteUrl: string | null;
  bookingUrl: string | null;
  phone: string | null;
  imageUrl: string | null;
  amenities: string[];
  petFriendly: boolean;
  familyFriendly: boolean;
  parkingAvailable: boolean;
  featured: boolean;
};

type HotelRow = {
  id: string;
  name: string;
  address: string | null;
  short_description: string;
  full_description: string;
  latitude: number | null;
  longitude: number | null;
  website_url: string | null;
  booking_url: string | null;
  phone: string | null;
  image_path: string | null;
  amenities: string[] | null;
  pet_friendly: boolean;
  family_friendly: boolean;
  parking_available: boolean;
  featured: boolean;
};

const columns = [
  'id',
  'name',
  'address',
  'short_description',
  'full_description',
  'latitude',
  'longitude',
  'website_url',
  'booking_url',
  'phone',
  'image_path',
  'amenities',
  'pet_friendly',
  'family_friendly',
  'parking_available',
  'featured',
].join(',');

function normalizeHotel(
  row: HotelRow,
  imageUrl: (path: string) => string | null,
): Hotel {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    shortDescription: row.short_description ?? '',
    fullDescription: row.full_description ?? '',
    latitude: row.latitude,
    longitude: row.longitude,
    websiteUrl: row.website_url,
    bookingUrl: row.booking_url,
    phone: row.phone,
    imageUrl: row.image_path ? imageUrl(row.image_path) : null,
    amenities: Array.isArray(row.amenities) ? row.amenities : [],
    petFriendly: row.pet_friendly === true,
    familyFriendly: row.family_friendly === true,
    parkingAvailable: row.parking_available === true,
    featured: row.featured === true,
  };
}

export async function loadPublishedHotels(): Promise<Hotel[]> {
  try {
    const { supabase } = await import('@/lib/supabase');
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select(columns)
      .eq('published', true)
      .is('archived_at', null)
      .order('featured', { ascending: false })
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;

    const publicImageUrl = (path: string) =>
      supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl || null;

    const hotels = ((data ?? []) as HotelRow[]).map((row) =>
      normalizeHotel(row, publicImageUrl),
    );

    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(hotels));
    return hotels;
  } catch {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      return cached ? (JSON.parse(cached) as Hotel[]) : [];
    } catch {
      return [];
    }
  }
}

export async function loadPublishedHotel(id: string): Promise<Hotel | null> {
  const hotels = await loadPublishedHotels();
  return hotels.find((hotel) => hotel.id === id) ?? null;
}
