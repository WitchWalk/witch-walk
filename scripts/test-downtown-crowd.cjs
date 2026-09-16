/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

Module._extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText, filename);

const {
  DOWNTOWN_SALEM_WAIT_ATTRACTION_IDS,
  aggregateDowntownCrowdStatus,
  getDowntownCrowdAccessibilityLabel,
} = require('../src/services/downtownCrowdStatus.ts');

const now = Date.parse('2026-09-16T16:00:00Z');
const summary = (attractionId, crowdLevel, ageMinutes = 1) => ({
  attractionId,
  hasRecentReports: true,
  estimatedWaitMinutes: 20,
  estimatedWaitLabel: '20 min',
  crowdLevel,
  freshnessLabel: `Updated ${ageMinutes} min ago`,
  quickStatusTag: null,
  reportCount: 1,
  newestReportTimestamp: now - ageMinutes * 60_000,
  waitSpreadMinutes: 0,
});
const aggregates = (...levels) => Object.fromEntries(levels.map((level, index) => [
  DOWNTOWN_SALEM_WAIT_ATTRACTION_IDS[index],
  summary(DOWNTOWN_SALEM_WAIT_ATTRACTION_IDS[index], level),
]));
const level = (...levels) => aggregateDowntownCrowdStatus(aggregates(...levels), { now });

assert.equal(level('light', 'light').level, 'light');
assert.equal(level('moderate', 'moderate').level, 'moderate');
assert.equal(level('busy', 'busy').level, 'busy');
assert.equal(level('light', 'moderate', 'moderate').level, 'moderate');
assert.equal(level('light', 'moderate').level, 'moderate');
assert.equal(level('moderate', 'busy').level, 'busy');
assert.equal(level('light', 'busy').level, 'busy');
assert.equal(level('busy').kind, 'no-data');
assert.equal(level().kind, 'no-data');

const stale = aggregates('busy', 'busy');
Object.values(stale).forEach((item) => { item.newestReportTimestamp = now - 31 * 60_000; });
assert.equal(aggregateDowntownCrowdStatus(stale, { now }).kind, 'no-data');

const unavailableStatus = aggregateDowntownCrowdStatus({}, { now, liveStatusUnavailable: true });
assert.equal(unavailableStatus.kind, 'unavailable');
assert.match(getDowntownCrowdAccessibilityLabel(unavailableStatus), /live status is unavailable/i);
assert.match(getDowntownCrowdAccessibilityLabel(level('light', 'light')), /currently light/i);
assert.match(getDowntownCrowdAccessibilityLabel(level('moderate', 'moderate')), /currently moderate/i);
assert.match(getDowntownCrowdAccessibilityLabel(level('busy', 'busy')), /currently busy/i);
assert.match(getDowntownCrowdAccessibilityLabel(level()), /no recent crowd data/i);

const home = fs.readFileSync(path.join(__dirname, '../app/(tabs)/index.tsx'), 'utf8');
const card = fs.readFileSync(path.join(__dirname, '../src/components/CrowdStatusCard.tsx'), 'utf8');
assert.match(home, /subscribeWaitAggregates/);
assert.match(home, /getWaitTimeAggregates/);
assert.match(home, /router\.push\('\/map'\)/);
assert.match(card, /getDowntownCrowdAccessibilityLabel\(status\)/);

const realtimeInitial = aggregates('light', 'light', 'busy');
assert.equal(aggregateDowntownCrowdStatus(realtimeInitial, { now }).level, 'light');
const realtimeUpdated = {
  ...realtimeInitial,
  [DOWNTOWN_SALEM_WAIT_ATTRACTION_IDS[0]]: summary(DOWNTOWN_SALEM_WAIT_ATTRACTION_IDS[0], 'busy'),
};
assert.equal(aggregateDowntownCrowdStatus(realtimeUpdated, { now }).level, 'busy');

console.log('PASS: Downtown crowd aggregation, freshness, availability, Realtime-driven state, accessibility, and Home navigation');
