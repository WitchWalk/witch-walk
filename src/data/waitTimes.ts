import type { ImageSourcePropType } from 'react-native';

import { attractions } from '@/data/attractions';

export type CrowdLevel = 'light' | 'moderate' | 'busy';

export type WaitTimeAttraction = {
  attractionId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distance: string;
  image: ImageSourcePropType;
};

export const waitReportingAttractionIds = [
  'salem-witch-museum',
  'witch-house',
  'house-seven-gables',
  'peabody-essex-museum',
  'witch-dungeon-museum',
  'salem-maritime',
];

export const waitTimeAttractions: WaitTimeAttraction[] = waitReportingAttractionIds.flatMap((attractionId) => {
  const attraction = attractions.find((item) => item.id === attractionId);
  if (!attraction) return [];

  return [{
    attractionId,
    name: attraction.name,
    address: attraction.address,
    latitude: attraction.latitude,
    longitude: attraction.longitude,
    distance: attraction.distance,
    image: attraction.image,
  }];
});

export const getWaitTimeAttraction = (id?: string) =>
  waitTimeAttractions.find((item) => item.attractionId === id);

export const crowdPresentation: Record<CrowdLevel, { label: string; color: string }> = {
  light: { label: 'Light', color: '#5DE29A' },
  moderate: { label: 'Moderate', color: '#FFC44F' },
  busy: { label: 'Busy', color: '#FF616B' },
};
