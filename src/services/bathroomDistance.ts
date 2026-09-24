import type { BathroomLocation } from '../data/bathrooms.ts';
import { distanceBetweenCoordinates, type Coordinates } from './proximity.ts';

const metersPerMile = 1609.344;
const nearEqualMiles = 0.01;

function validCoordinatePair(location: BathroomLocation) {
  return location.latitude !== null && location.longitude !== null
    && Number.isFinite(location.latitude) && Number.isFinite(location.longitude)
    && Math.abs(location.latitude) <= 90 && Math.abs(location.longitude) <= 180;
}

export function sortBathroomsByDistance(locations: BathroomLocation[], userLocation: Coordinates | null) {
  const fallback = locations.map((location) => ({ ...location, distanceMiles: undefined }));
  if (!userLocation) return fallback;
  const fallbackRank = new Map(fallback.map((location, index) => [location.id, index]));
  const defaultOrder = (a: BathroomLocation, b: BathroomLocation) =>
    (fallbackRank.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (fallbackRank.get(b.id) ?? Number.MAX_SAFE_INTEGER);
  return locations.map((location) => ({
    ...location,
    distanceMiles: validCoordinatePair(location)
      ? distanceBetweenCoordinates(userLocation, { latitude: location.latitude!, longitude: location.longitude! }) / metersPerMile
      : undefined,
  })).sort((a, b) => {
    if (a.distanceMiles === undefined) return b.distanceMiles === undefined ? defaultOrder(a, b) : 1;
    if (b.distanceMiles === undefined) return -1;
    const distance = a.distanceMiles - b.distanceMiles;
    return Math.abs(distance) < nearEqualMiles ? defaultOrder(a, b) : distance;
  });
}
