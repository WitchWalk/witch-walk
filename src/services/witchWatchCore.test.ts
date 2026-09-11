import { evaluateWatch, type Watch } from './witchWatchCore';
const assert = { equal(actual: unknown, expected: unknown) { if (actual !== expected) throw new Error(`Expected ${expected}, received ${actual}`); } };

const base: Watch = { attractionId: 'witch-house', enabled: true, crowdAlertType: 'busy-to-moderate', waitThresholdMinutes: 20, lastKnownCrowdStatus: 'busy', lastKnownEstimatedWait: 30, lastTriggeredState: null, lastAlertTimestamp: null };
let watch = base;
function step(crowdLevel: 'busy' | 'moderate' | 'light' | null, estimatedWaitMinutes: number | null, expected: boolean) {
  const result = evaluateWatch(watch, { hasRecentReports: crowdLevel !== null, crowdLevel, estimatedWaitMinutes }, 1234);
  assert.equal(result.triggered, expected); watch = result.watch;
}
step('moderate', 20, true);
step('moderate', 15, false);
step('light', 10, false);
step('busy', 30, false);
step('moderate', 20, true);
watch = { ...base, crowdAlertType: 'moderate-to-light', lastKnownCrowdStatus: 'moderate', waitThresholdMinutes: null };
step('light', 10, true); step('light', 10, false);
step(null, null, false); step('light', 10, false);
watch = { ...base, enabled: false }; step('moderate', 10, false);
assert.equal(evaluateWatch(base, { hasRecentReports: true, crowdLevel: 'busy', estimatedWaitMinutes: 20 }).triggered, true);
assert.equal(evaluateWatch({ ...base, lastKnownCrowdStatus: null, lastKnownEstimatedWait: null }, { hasRecentReports: true, crowdLevel: 'light', estimatedWaitMinutes: 10 }).triggered, false);
assert.equal(base.lastKnownCrowdStatus, 'busy');
console.log('Witch Watch crossing, re-arm, disabled, missing-data, and independent-state checks passed.');
