/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const originalLoad = Module._load;
const enabled = (id, overrides = {}) => ({
  id,
  name: id,
  address: 'Salem, MA',
  latitude: 42.52,
  longitude: -70.89,
  description: '',
  longDescription: '',
  category: 'Attraction',
  tags: [],
  hours: 'Hours unavailable',
  status: 'unavailable',
  statusLabel: 'Hours unavailable',
  distance: '0.1 mi',
  image: 1,
  visitorTips: [],
  waitReportingEnabled: true,
  published: true,
  archivedAt: null,
  ...overrides,
});
const content = [
  enabled('witch-house'),
  enabled('salem-witch-village'),
  enabled('salem-witch-museum', { waitReportingEnabled: false }),
  enabled('admin-only-untrusted'),
];

Module._load = function (name, ...args) {
  if (name === '@/data/attractions') return { bundledAttractions: content };
  if (name.startsWith('@/')) name = path.join(__dirname, '../src', name.slice(2));
  return originalLoad.call(this, name, ...args);
};
Module._extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(
  fs.readFileSync(filename, 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } },
).outputText, filename);

const {
  filterWaitEligibleAttractionReferences,
  isAttractionWaitEligible,
} = require('../src/services/waitEligibility.ts');
const { trustedWaitReportingAttractions } = require('../src/data/trustedWaitReporting.ts');
const { getWaitTimeAttractionsForContent } = require('../src/data/waitTimes.ts');

assert.equal(trustedWaitReportingAttractions.length, 7);
assert.deepEqual(
  trustedWaitReportingAttractions.find(item => item.id === 'salem-witch-village'),
  { id: 'salem-witch-village', latitude: 42.5204583, longitude: -70.8913991 },
);
assert.equal(isAttractionWaitEligible(content[0]), true, 'Admin-enabled plus trusted is eligible');
assert.equal(isAttractionWaitEligible(content[1]), true, 'Salem Witch Village is eligible');
assert.equal(isAttractionWaitEligible(content[2]), false, 'Admin-disabled plus trusted is ineligible');
assert.equal(isAttractionWaitEligible(content[3]), false, 'Admin-enabled plus untrusted is ineligible');
assert.equal(isAttractionWaitEligible(enabled('witch-house', { published: false })), false);
assert.equal(isAttractionWaitEligible(enabled('witch-house', { archivedAt: '2026-09-23' })), false);

const waitItems = getWaitTimeAttractionsForContent(content);
assert.deepEqual(waitItems.map(item => item.attractionId), ['witch-house', 'salem-witch-village']);
const saved = [{ attractionId: 'witch-house' }, { attractionId: 'admin-only-untrusted' }];
assert.deepEqual(
  filterWaitEligibleAttractionReferences(saved, id => content.find(item => item.id === id)),
  [{ attractionId: 'witch-house' }],
  'Existing ineligible Witch Watch entries are removed safely',
);

const root = path.join(__dirname, '..');
const details = fs.readFileSync(path.join(root, 'src/components/attractions/AttractionDetailsView.tsx'), 'utf8');
const map = fs.readFileSync(path.join(root, 'src/data/mapLocations.ts'), 'utf8');
const reportRoute = fs.readFileSync(path.join(root, 'app/(tabs)/report-wait/[id].tsx'), 'utf8');
const watchRoute = fs.readFileSync(path.join(root, 'app/witch-watch.tsx'), 'utf8');
const watchProvider = fs.readFileSync(path.join(root, 'src/components/WitchWatchProvider.tsx'), 'utf8');
const restaurants = fs.readFileSync(path.join(root, 'src/data/restaurants.ts'), 'utf8');

assert.match(details, /isAttractionWaitEligible\(attraction\)/);
assert.doesNotMatch(details, /title=\{supportsWaitReporting \? 'Report Wait' : 'Witch Watch'\}/);
assert.match(map, /waitReportingSupported: isAttractionWaitEligible\(location\)/);
assert.match(reportRoute, /getWaitTimeAttractionForContent\(id, attractions\)/);
assert.match(watchRoute, /isAttractionWaitEligible\(getAttraction\(id\)\)/);
assert.match(watchProvider, /isActiveAttractionWaitEligible\(watch\.attractionId\)/);
assert.match(watchProvider, /filterWaitEligibleAttractionReferences/);
assert.doesNotMatch(restaurants, /waitReportingEnabled/);

console.log('PASS: canonical eligibility, seven trusted Attractions, route guards, saved-watch cleanup, Wait Times/Map consistency, and Restaurants unsupported');
