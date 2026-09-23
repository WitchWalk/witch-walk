import type { ImageSourcePropType } from 'react-native';

import { bundledAttractions, type Attraction } from '@/data/attractions';
import { getTrustedWaitReportingAttraction } from '@/data/trustedWaitReporting';
import { getActiveAttractions } from '@/services/attractionContentState';
import { getEligibleWaitAttractions } from '@/services/waitEligibility';

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

export function getWaitTimeAttractionsForContent(attractions: Attraction[]): WaitTimeAttraction[] {
  return getEligibleWaitAttractions(attractions).flatMap((attraction) => {
    const trusted = getTrustedWaitReportingAttraction(attraction.id);
    if (!trusted) return [];

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

export function getActiveWaitTimeAttractions() {
  return getWaitTimeAttractionsForContent(getActiveAttractions() ?? bundledAttractions);
}

export function getWaitTimeAttractionForContent(id: string | undefined, attractions: Attraction[]) {
  return getWaitTimeAttractionsForContent(attractions).find((item) => item.attractionId === id);
}

export const getWaitTimeAttraction = (id?: string) =>
  getActiveWaitTimeAttractions().find((item) => item.attractionId === id);

export const crowdPresentation: Record<CrowdLevel, { label: string; color: string }> = {
  light: { label: 'Light', color: '#5DE29A' },
  moderate: { label: 'Moderate', color: '#FFC44F' },
  busy: { label: 'Busy', color: '#FF616B' },
};
