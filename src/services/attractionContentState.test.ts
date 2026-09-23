import type { Attraction } from '../data/attractions.ts';
import {
  getActiveAttraction,
  isActiveAttractionWaitEligible,
  setActiveAttractions,
} from './attractionContentState.ts';

const assert = {
  equal(actual: unknown, expected: unknown) {
    if (actual !== expected) throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
  },
};

const attraction: Attraction = {
  id: 'witch-house',
  name: 'Admin-managed name',
  category: 'Historic',
  tags: ['Historic'],
  address: '310 1/2 Essex Street, Salem, MA',
  latitude: 42.5215539,
  longitude: -70.8988987,
  description: 'Admin-managed summary',
  longDescription: 'Admin-managed details',
  hours: '10:00 AM – 5:00 PM',
  status: 'open',
  statusLabel: 'Open Now',
  distance: '0.5 mi',
  image: 1,
  waitReportingEnabled: true,
  visitorTips: [],
};

setActiveAttractions([attraction]);
assert.equal(getActiveAttraction('witch-house')?.name, 'Admin-managed name');
assert.equal(getActiveAttraction('hidden-attraction'), undefined);
assert.equal(isActiveAttractionWaitEligible('witch-house'), true);
setActiveAttractions([{ ...attraction, waitReportingEnabled: false }]);
assert.equal(isActiveAttractionWaitEligible('witch-house'), false);
console.log('Stable-ID content lookup, hidden-item handling, and reporting eligibility checks passed.');
