export type TrustedWaitReportingAttraction = {
  id: string;
  latitude: number;
  longitude: number;
};

// These coordinates mirror the server-side reporting allowlist. Admin-managed
// content coordinates may move map pins, but must never silently replace this
// trusted proximity-verification data.
export const trustedWaitReportingAttractions: readonly TrustedWaitReportingAttraction[] = [
  { id: 'salem-witch-museum', latitude: 42.5237449, longitude: -70.8911625 },
  { id: 'witch-house', latitude: 42.5215539, longitude: -70.8988987 },
  { id: 'house-seven-gables', latitude: 42.5218159, longitude: -70.8838227 },
  { id: 'peabody-essex-museum', latitude: 42.5215925, longitude: -70.8921931 },
  { id: 'witch-dungeon-museum', latitude: 42.5225674, longitude: -70.8971921 },
  { id: 'salem-maritime', latitude: 42.5190589, longitude: -70.8855837 },
];

export const trustedWaitReportingAttractionIds = trustedWaitReportingAttractions.map(
  (attraction) => attraction.id,
);

export function getTrustedWaitReportingAttraction(id: string | undefined) {
  return trustedWaitReportingAttractions.find((attraction) => attraction.id === id);
}
