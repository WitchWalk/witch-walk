import type { ImageSourcePropType } from 'react-native';

import { bundledAttractions, type Attraction } from '@/data/attractions';
import { bathroomLocations, type BathroomLocation } from '@/data/bathrooms';
import { bundledParkingLocations, type ParkingLocation } from '@/data/parking';
import { bundledRestaurants, type Restaurant } from '@/data/restaurants';
import { findRestaurantByStableId } from '@/services/restaurantContentCore';
import { findParkingByStableId } from '@/services/parkingContentCore';
import type { Hotel } from '@/services/hotelContentRepository';
import type { CuratedTourSummary } from '@/services/curatedTours';
import type { FavoriteCategory, FavoriteReference } from '@/services/favoritesCore';

export type FavoriteLocation = FavoriteReference & {
  name: string;
  categoryLabel: string;
  address: string;
  description: string;
  image: ImageSourcePropType;
};

export const favoriteFilters: { id: 'all' | FavoriteCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'attractions', label: 'Attractions' },
  { id: 'restaurants', label: 'Restaurants' },
  { id: 'parking', label: 'Parking' },
  { id: 'bathrooms', label: 'Bathrooms' },
  { id: 'hotels', label: 'Hotels' },
  { id: 'tours', label: 'Tours' },
];

export function filterFavoriteLocations(
  locations: FavoriteLocation[],
  filter: 'all' | FavoriteCategory,
) {
  return filter === 'all'
    ? locations
    : locations.filter((location) => location.category === filter);
}

export function resolveFavoriteLocation(
  reference: FavoriteReference,
  attractionContent: Attraction[] = bundledAttractions,
  restaurantContent: Restaurant[] = bundledRestaurants,
  parkingContent: ParkingLocation[] = bundledParkingLocations,
  bathroomContent: BathroomLocation[] = bathroomLocations,
  hotelContent: Hotel[] = [],
  tourContent: CuratedTourSummary[] = [],
): FavoriteLocation | null {
  if (reference.category === 'attractions') {
    const location = attractionContent.find((item) => item.id === reference.id);
    return location ? { ...reference, name: location.name, categoryLabel: 'Attraction', address: location.address, description: location.description, image: location.image } : null;
  }
  if (reference.category === 'restaurants') {
    const location = findRestaurantByStableId(restaurantContent, reference.id);
    return location ? { ...reference, name: location.name, categoryLabel: 'Restaurant', address: location.address, description: location.description, image: location.image } : null;
  }
  if (reference.category === 'parking') {
    const location = findParkingByStableId(parkingContent, reference.id);
    return location ? { ...reference, name: location.name, categoryLabel: location.type === 'Unknown' ? 'Parking' : location.type, address: location.address, description: location.description, image: location.image } : null;
  }

  if (reference.category === 'bathrooms') {
    const location = bathroomContent.find(item => item.id === reference.id);
    return location ? { ...reference, name: location.name, categoryLabel: 'Bathroom', address: location.address, description: location.description, image: location.image } : null;
  }

  if (reference.category === 'hotels') {
    const hotel = hotelContent.find((item) => item.id === reference.id);
    return hotel
      ? {
          ...reference,
          name: hotel.name,
          categoryLabel: 'Hotel',
          address: hotel.address ?? 'Salem, Massachusetts',
          description: hotel.shortDescription || hotel.fullDescription || 'Salem hotel',
          image: hotel.imageUrl
            ? { uri: hotel.imageUrl }
            : require('../../assets/images/home/events.png'),
        }
      : null;
  }

  const tour = tourContent.find((item) => item.id === reference.id);
  if (!tour) return null;

  const mode =
    tour.tourMode === 'mixed'
      ? 'Walking + driving'
      : tour.tourMode === 'driving'
        ? 'Driving tour'
        : 'Walking tour';

  const duration = tour.estimatedMinutes
    ? ` • ${tour.estimatedMinutes} min`
    : '';

  return {
    ...reference,
    name: tour.name,
    categoryLabel: 'BROOMSTICK Tour',
    address: 'Salem, Massachusetts',
    description: `${mode}${duration}. ${tour.shortDescription}`,
    image: require('../../assets/images/home/attractions.png'),
  };
}
