import type { Attraction } from '@/data/attractions';

let activeAttractions: Attraction[] | null = null;

export function setActiveAttractions(attractions: Attraction[]) {
  activeAttractions = attractions;
}

export function getActiveAttraction(id: string | undefined) {
  return activeAttractions?.find((attraction) => attraction.id === id);
}

export function isActiveAttractionWaitReportingEnabled(id: string) {
  return getActiveAttraction(id)?.waitReportingEnabled === true;
}
