import type { Attraction } from '@/data/attractions';
import { isAttractionWaitEligible } from '@/services/waitEligibility';

let activeAttractions: Attraction[] | null = null;

export function setActiveAttractions(attractions: Attraction[]) {
  activeAttractions = attractions;
}

export function getActiveAttraction(id: string | undefined) {
  return activeAttractions?.find((attraction) => attraction.id === id);
}

export function getActiveAttractions() {
  return activeAttractions;
}

export function isActiveAttractionWaitEligible(id: string) {
  return isAttractionWaitEligible(getActiveAttraction(id));
}
