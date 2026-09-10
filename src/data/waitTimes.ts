import type { ImageSourcePropType } from 'react-native';

import { attractions } from '@/data/attractions';

export type CrowdLevel = 'light' | 'moderate' | 'busy';

export type WaitTimeRecord = {
  attractionId: string;
  estimatedMinutes: number;
  crowdLevel: CrowdLevel;
  lastUpdated: string;
};

export type WaitTimeAttraction = WaitTimeRecord & {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distance: string;
  image: ImageSourcePropType;
};

export const waitTimeRecords: WaitTimeRecord[] = [
  { attractionId: 'salem-witch-museum', estimatedMinutes: 55, crowdLevel: 'busy', lastUpdated: '4 min ago' },
  { attractionId: 'witch-house', estimatedMinutes: 20, crowdLevel: 'moderate', lastUpdated: '7 min ago' },
  { attractionId: 'house-seven-gables', estimatedMinutes: 10, crowdLevel: 'light', lastUpdated: '12 min ago' },
  { attractionId: 'peabody-essex-museum', estimatedMinutes: 15, crowdLevel: 'light', lastUpdated: '9 min ago' },
  { attractionId: 'witch-dungeon-museum', estimatedMinutes: 25, crowdLevel: 'moderate', lastUpdated: '15 min ago' },
  { attractionId: 'salem-maritime', estimatedMinutes: 5, crowdLevel: 'light', lastUpdated: '18 min ago' },
];

export const waitTimeAttractions: WaitTimeAttraction[] = waitTimeRecords.flatMap((record) => {
  const attraction = attractions.find((item) => item.id === record.attractionId);
  if (!attraction) return [];

  return [{
    ...record,
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
