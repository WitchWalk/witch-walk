export const WATCH_THRESHOLDS = [10, 20, 30, 45] as const;
export type Crowd = 'busy' | 'moderate' | 'light';
export type WatchRule = 'busy-to-moderate' | 'moderate-to-light';
export type Watch = {
  attractionId: string;
  enabled: boolean;
  crowdAlertType: WatchRule;
  waitThresholdMinutes: number | null;
  lastKnownCrowdStatus: Crowd | null;
  lastKnownEstimatedWait: number | null;
  lastTriggeredState: string | null;
  lastAlertTimestamp: number | null;
};
export type WatchSnapshot = { hasRecentReports: boolean; crowdLevel: Crowd | null; estimatedWaitMinutes: number | null };
export function evaluateWatch(watch: Watch, snapshot: WatchSnapshot, now = Date.now()) {
  if (!watch.enabled) return { watch, triggered: false };
  const crowd = snapshot.hasRecentReports ? snapshot.crowdLevel : null;
  const wait = snapshot.hasRecentReports ? snapshot.estimatedWaitMinutes : null;
  const crowdCrossed = watch.crowdAlertType === 'busy-to-moderate'
    ? watch.lastKnownCrowdStatus === 'busy' && (crowd === 'moderate' || crowd === 'light')
    : watch.lastKnownCrowdStatus === 'moderate' && crowd === 'light';
  const waitCrossed = watch.waitThresholdMinutes !== null && watch.lastKnownEstimatedWait !== null && wait !== null
    && watch.lastKnownEstimatedWait > watch.waitThresholdMinutes && wait <= watch.waitThresholdMinutes;
  const triggered = crowdCrossed || waitCrossed;
  return { triggered, watch: { ...watch, lastKnownCrowdStatus: crowd, lastKnownEstimatedWait: wait,
    lastTriggeredState: triggered ? `${crowd}:${wait}` : watch.lastTriggeredState,
    lastAlertTimestamp: triggered ? now : watch.lastAlertTimestamp } };
}
export const watchRuleLabel = (rule: WatchRule) => rule === 'busy-to-moderate' ? 'Busy → Moderate or better' : 'Moderate → Light';
