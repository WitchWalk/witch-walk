import type { ImageSourcePropType } from 'react-native';

import { bundledAttractions, type Attraction } from '@/data/attractions';
import { bathroomLocations, type BathroomLocation } from '@/data/bathrooms';
import { bundledParkingLocations, type ParkingLocation } from '@/data/parking';
import { bundledRestaurants, type Restaurant } from '@/data/restaurants';
import { findRestaurantByStableId } from '@/services/restaurantContentCore';
import { findParkingByStableId } from '@/services/parkingContentCore';
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

  const location = bathroomContent.find(item => item.id === reference.id);
  return location ? { ...reference, name: location.name, categoryLabel: 'Bathroom', address: location.address, description: location.description, image: location.image } : null;
}
