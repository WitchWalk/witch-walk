import type { ImageSourcePropType } from 'react-native';

import { getAttraction } from '@/data/attractions';
import { getBathroomLocation } from '@/data/bathrooms';
import { getParkingLocation } from '@/data/parking';
import { getRestaurant } from '@/data/restaurants';
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

export function resolveFavoriteLocation(reference: FavoriteReference): FavoriteLocation | null {
  if (reference.category === 'attractions') {
    const location = getAttraction(reference.id);
    return location ? { ...reference, name: location.name, categoryLabel: 'Attraction', address: location.address, description: location.description, image: location.image } : null;
  }
  if (reference.category === 'restaurants') {
    const location = getRestaurant(reference.id);
    return location ? { ...reference, name: location.name, categoryLabel: 'Restaurant', address: location.address, description: location.description, image: location.image } : null;
  }
  if (reference.category === 'parking') {
    const location = getParkingLocation(reference.id);
    return location ? { ...reference, name: location.name, categoryLabel: `Parking ${location.type}`, address: location.address, description: location.description, image: location.image } : null;
  }

  const location = getBathroomLocation(reference.id);
  return location ? { ...reference, name: location.name, categoryLabel: 'Bathroom', address: location.address, description: location.description, image: location.image } : null;
}
