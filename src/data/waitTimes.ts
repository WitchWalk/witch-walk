import type { ImageSourcePropType } from 'react-native';

import { bundledAttractions, type Attraction } from '@/data/attractions';
import { trustedWaitReportingAttractions } from '@/data/trustedWaitReporting';

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

export const waitReportingAttractionIds = trustedWaitReportingAttractions.map((item) => item.id);

export function getWaitTimeAttractionsForContent(attractions: Attraction[]): WaitTimeAttraction[] {
  return trustedWaitReportingAttractions.flatMap((trusted) => {
    const attraction = attractions.find((item) => item.id === trusted.id && item.waitReportingEnabled === true);
    if (!attraction) return [];

    return [{
      attractionId: trusted.id,
      name: attraction.name,
      address: attraction.address,
      latitude: trusted.latitude,
      longitude: trusted.longitude,
      distance: attraction.distance,
      image: attraction.image,
    }];
  });
}

export const waitTimeAttractions: WaitTimeAttraction[] = getWaitTimeAttractionsForContent(bundledAttractions);

export function getWaitTimeAttractionForContent(id: string | undefined, attractions: Attraction[]) {
  return getWaitTimeAttractionsForContent(attractions).find((item) => item.attractionId === id);
}

export const getWaitTimeAttraction = (id?: string) =>
  waitTimeAttractions.find((item) => item.attractionId === id);

export const crowdPresentation: Record<CrowdLevel, { label: string; color: string }> = {
  light: { label: 'Light', color: '#5DE29A' },
  moderate: { label: 'Moderate', color: '#FFC44F' },
  busy: { label: 'Busy', color: '#FF616B' },
};
