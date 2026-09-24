import type { BathroomLocation } from '@/data/bathrooms';
import { sortBathroomsByDistance } from './bathroomDistance.ts';

const assert = (condition: unknown, message: string) => { if (!condition) throw Error(message); };
const base: Omit<BathroomLocation, 'id' | 'name' | 'latitude' | 'longitude' | 'downtownRelevance'> = {
  mapLabel: 'Test', address: 'Salem, MA', restroomType: 'Public Restroom', restroomCategory: 'permanent',
  schedule: { kind: 'unknown', summary: 'Unknown' }, seasonal: false, accessible: null,
  description: '', notes: '', image: 1, directionsDestination: 'Salem, MA', sourceReference: '',
  lastVerifiedDate: '',
};
const bathroom = (id: string, latitude: number | null, longitude: number | null, downtownRelevance: number): BathroomLocation =>
  ({ ...base, id, name: id, mapLabel: id, latitude, longitude, downtownRelevance });

const locations = [
  bathroom('missing', null, null, 0),
  bathroom('far', 42.5300, -70.8800, 1),
  bathroom('near', 42.5201, -70.8901, 3),
];
const origin = { latitude: 42.5200, longitude: -70.8900 };
const nearest = sortBathroomsByDistance(locations, origin);
assert(nearest[0].id === 'near' && nearest[1].id === 'far', 'valid coordinates must sort nearest first');
assert(nearest[2].id === 'missing' && nearest[2].distanceMiles === undefined, 'missing coordinates must sort last without a fake distance');
assert((nearest[0].distanceMiles ?? 1) < (nearest[1].distanceMiles ?? 0), 'distances must be calculated in miles');

const fallback = sortBathroomsByDistance(locations, null);
assert(fallback.map((item) => item.id).join(',') === 'missing,far,near', 'unavailable or denied location must preserve default discovery order');
assert(fallback.every((item) => item.distanceMiles === undefined), 'fallback order must not retain fake distances');

const close = sortBathroomsByDistance([
  bathroom('first-by-default', 42.52005, -70.8900, 0),
  bathroom('second-by-default', 42.5200, -70.89005, 1),
], origin);
assert(close[0].id === 'first-by-default', 'near-equal distances must use deterministic default order');
console.log('Bathroom GPS distance, missing-coordinate, denied/unavailable fallback, and near-equal ordering tests passed.');
