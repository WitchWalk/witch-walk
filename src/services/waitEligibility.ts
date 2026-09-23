import type { Attraction } from '@/data/attractions';
import { getTrustedWaitReportingAttraction } from '@/data/trustedWaitReporting';

/**
 * The content repository exposes only published, non-archived Attractions.
 * Optional visibility fields keep this rule fail-closed for callers that pass
 * richer content records in the future while preserving bundled V1 content.
 */
export function isAttractionWaitEligible(attraction: Attraction | null | undefined) {
  if (!attraction || attraction.published === false || attraction.archivedAt) return false;
  return attraction.waitReportingEnabled === true
    && Boolean(getTrustedWaitReportingAttraction(attraction.id));
}

export function getEligibleWaitAttractions(attractions: Attraction[]) {
  return attractions.filter(isAttractionWaitEligible);
}

export function filterWaitEligibleAttractionReferences<T extends { attractionId: string }>(
  values: T[],
  resolveAttraction: (id: string) => Attraction | undefined,
) {
  return values.filter(value => isAttractionWaitEligible(resolveAttraction(value.attractionId)));
}
