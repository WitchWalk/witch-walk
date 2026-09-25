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
  { id: 'salem-witch-village', latitude: 42.5204583, longitude: -70.8913991 },
  { id: 'chambers-of-terror', latitude: 42.5205259, longitude: -70.8885739 },
  { id: 'count-orloks', latitude: 42.5213235, longitude: -70.8948752 },
  { id: 'frankensteins-castle', latitude: 42.5204351, longitude: -70.8916638 },
  { id: 'gallows-hill', latitude: 42.5221611, longitude: -70.8966158 },
  { id: 'halloween-museum-of-salem', latitude: 42.5220679, longitude: -70.8913786 },
  { id: 'haunted-warren-museum', latitude: 42.5212799, longitude: -70.896699 },
  { id: 'new-england-pirate-museum', latitude: 42.520703, longitude: -70.8907714 },
  { id: 'real-pirates-salem', latitude: 42.519699, longitude: -70.8912048 },
  { id: 'salem-wax-a-halloween-experience', latitude: 42.5202787, longitude: -70.8915574 },
];

export function getTrustedWaitReportingAttraction(id: string | undefined) {
  return trustedWaitReportingAttractions.find((attraction) => attraction.id === id);
}
