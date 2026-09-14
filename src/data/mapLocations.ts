import type { ImageSourcePropType } from 'react-native';

import { bundledAttractions, type Attraction } from '@/data/attractions';
import { getTrustedWaitReportingAttraction } from '@/data/trustedWaitReporting';
import { bathroomLocations, getBathroomMapDestination, getVisibleBathroomLocations } from '@/data/bathrooms';
import { getParkingMapDestination, parkingLocations } from '@/data/parking';
import { restaurants } from '@/data/restaurants';
import type { WaitTimeAggregate } from '@/services/waitReportCore';

export type MapCategory = 'attractions' | 'restaurants' | 'parking' | 'bathrooms';
export type MapFilter = 'all' | MapCategory;
export type CrowdLevel = 'light' | 'moderate' | 'busy';

export type MapLocation = {
  mapId: string;
  sourceId: string;
  name: string;
  category: MapCategory;
  categoryLabel: string;
  latitude: number;
  longitude: number;
  address: string;
  image: ImageSourcePropType;
  directionsDestination: string;
  crowdLevel?: CrowdLevel;
  waitReportingSupported?: boolean;
  waitEstimateLabel?: string;
  waitFreshnessLabel?: string;
};

export const mapFilters: { id: MapFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'attractions', label: 'Attractions' },
  { id: 'restaurants', label: 'Food' },
  { id: 'parking', label: 'Parking' },
  { id: 'bathrooms', label: 'Bathrooms' },
];

function hasCoordinates(location: { latitude: number | null; longitude: number | null }) {
  return Number.isFinite(location.latitude) && Number.isFinite(location.longitude);
}

export function getMapLocations(
  waitAggregates: Record<string, WaitTimeAggregate> = {},
  now = new Date(),
  attractionContent: Attraction[] = bundledAttractions,
): MapLocation[] {
  const attractionPins: MapLocation[] = attractionContent
    .filter(hasCoordinates)
    .map((location) => {
      const aggregate = waitAggregates[location.id];
      return {
        mapId: `attractions:${location.id}`,
        sourceId: location.id,
        name: location.name,
        category: 'attractions',
        categoryLabel: 'Attraction',
        latitude: location.latitude as number,
        longitude: location.longitude as number,
        address: location.address,
        image: location.image,
        directionsDestination: `${location.name}, ${location.address}`,
        crowdLevel: aggregate?.crowdLevel ?? undefined,
        waitReportingSupported: location.waitReportingEnabled === true
          && Boolean(getTrustedWaitReportingAttraction(location.id)),
        waitEstimateLabel: aggregate?.estimatedWaitLabel,
        waitFreshnessLabel: aggregate?.freshnessLabel,
      };
    });

  const restaurantPins: MapLocation[] = restaurants
    .filter(hasCoordinates)
    .map((location) => ({
      mapId: `restaurants:${location.id}`,
      sourceId: location.id,
      name: location.name,
      category: 'restaurants',
      categoryLabel: 'Restaurant',
      latitude: location.latitude,
      longitude: location.longitude,
      address: location.address,
      image: location.image,
      directionsDestination: `${location.name}, ${location.address}`,
    }));

  const parkingPins: MapLocation[] = parkingLocations
    .filter(hasCoordinates)
    .map((location) => ({
      mapId: `parking:${location.id}`,
      sourceId: location.id,
      name: location.name,
      category: 'parking',
      categoryLabel: location.type,
      latitude: location.latitude as number,
      longitude: location.longitude as number,
      address: location.address,
      image: location.image,
      directionsDestination: getParkingMapDestination(location),
    }));

  const visibleBathroomIds = new Set(getVisibleBathroomLocations(now).map((location) => location.id));
  const bathroomPins: MapLocation[] = bathroomLocations
    .filter((location) => visibleBathroomIds.has(location.id) && hasCoordinates(location))
    .map((location) => ({
      mapId: `bathrooms:${location.id}`,
      sourceId: location.id,
      name: location.name,
      category: 'bathrooms',
      categoryLabel: 'Public restroom',
      latitude: location.latitude,
      longitude: location.longitude,
      address: location.address,
      image: location.image,
      directionsDestination: getBathroomMapDestination(location),
    }));

  return [...attractionPins, ...restaurantPins, ...parkingPins, ...bathroomPins];
}

export function filterMapLocations(locations: MapLocation[], filter: MapFilter) {
  return filter === 'all' ? locations : locations.filter((location) => location.category === filter);
}
