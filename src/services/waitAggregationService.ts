import { getActiveWaitTimeAttractions } from '@/data/waitTimes';
import {
  aggregateWaitReports,
  type WaitTimeAggregate,
  freshnessLabel, formatEstimatedWait, isApprovedCrowd, isApprovedQuickStatus,
} from '@/services/waitReportCore';
import { localWaitReportRepository } from '@/services/waitReportRepository';
import { publishWaitAggregates } from './waitAggregateEvents';
import { waitBackend } from '@/config/waitBackend';
import { sharedWaitRepository } from '@/services/sharedWaitRepository';
import type { SafeWaitEvent } from '@/services/waitRealtimeCore';

function neutral(now: number, unavailable = false) {
  return Object.fromEntries(getActiveWaitTimeAttractions().map(item => {
    const value = aggregateWaitReports([], item.attractionId, now);
    if (unavailable) value.freshnessLabel = 'Live updates unavailable';
    return [item.attractionId, value];
  }));
}

export function decodeSharedSummaries(data: unknown, now = Date.now()): Record<string, WaitTimeAggregate> {
  if (!Array.isArray(data)) throw new Error('Invalid summary');
  const results = neutral(now);
  for (const row of data) {
    if (!row || typeof row.attractionId !== 'string' || !Object.hasOwn(results, row.attractionId)) continue;
    if (row.reportCount === 0) continue;
    if (!Number.isInteger(row.reportCount) || row.reportCount < 0
      || !Number.isFinite(row.estimatedWaitMinutes) || row.estimatedWaitMinutes < 0 || row.estimatedWaitMinutes > 60
      || !isApprovedCrowd(row.crowdLevel) || !Number.isFinite(row.newestReportTimestamp)
      || (row.quickStatusTag !== null && !isApprovedQuickStatus(row.quickStatusTag))) throw new Error('Invalid summary');
    results[row.attractionId] = {
      attractionId: row.attractionId, hasRecentReports: true,
      estimatedWaitMinutes: row.estimatedWaitMinutes, estimatedWaitLabel: formatEstimatedWait(row.estimatedWaitMinutes),
      crowdLevel: row.crowdLevel, freshnessLabel: freshnessLabel(row.newestReportTimestamp, now),
      quickStatusTag: row.quickStatusTag, reportCount: row.reportCount,
      newestReportTimestamp: row.newestReportTimestamp, waitSpreadMinutes: row.waitSpreadMinutes,
    };
  }
  return results;
}
let loading: Promise<Record<string, WaitTimeAggregate>> | undefined;
let cached: Record<string, WaitTimeAggregate> = {};
let liveServiceUnavailable = false;
const versions = new Map<string, { revision: number; evaluated: number }>();

export function isWaitAggregateServiceUnavailable() {
  return waitBackend === 'supabase' && liveServiceUnavailable;
}

function mergeEvents(events: SafeWaitEvent[], snapshot: boolean) {
  const eligibleIds = new Set(getActiveWaitTimeAttractions().map(item => item.attractionId));
  const changed: WaitTimeAggregate[] = [];
  for (const event of events) {
    const row = event?.summary as { attractionId?: unknown } | undefined;
    const id = row?.attractionId;
    const evaluated = Date.parse(event?.evaluated_at);
    if (typeof id !== 'string' || !eligibleIds.has(id)
      || !Number.isSafeInteger(event.revision) || event.revision < 0 || !Number.isFinite(evaluated)) continue;
    const previous = versions.get(id);
    if (previous && (event.revision < previous.revision || evaluated < previous.evaluated
      || (!snapshot && event.revision === previous.revision))) continue;
    try {
      const next = decodeSharedSummaries([event.summary])[id];
      versions.set(id, { revision: event.revision, evaluated });
      if (JSON.stringify(cached[id]) !== JSON.stringify(next)) { cached = { ...cached, [id]: next }; changed.push(next); }
    } catch { /* Malformed transport events never replace trusted cached data. */ }
  }
  if (changed.length) {
    liveServiceUnavailable = false;
    publishWaitAggregates(changed);
  }
}
export function applyRealtimeWaitEvents(events: SafeWaitEvent[]) { mergeEvents(events, false); }
function currentCache(now: number) {
  const eligibleIds = new Set(getActiveWaitTimeAttractions().map(item => item.attractionId));
  return { ...neutral(now), ...Object.fromEntries(Object.entries(cached).flatMap(([id,value]) => eligibleIds.has(id) ? [[id, {
    ...value, freshnessLabel: value.newestReportTimestamp ? freshnessLabel(value.newestReportTimestamp, now) : value.freshnessLabel,
  }]] : [])) };
}

export async function getWaitTimeAggregates(now = Date.now()) {
  if (waitBackend === 'supabase') {
    if (!loading) loading = (async () => {
      try {
        const data = await sharedWaitRepository.read();
        if (!Array.isArray(data)) throw new Error('Invalid snapshot');
        liveServiceUnavailable = false;
        if (data.length && data[0]?.summary) mergeEvents(data, true);
        else {
          const results = decodeSharedSummaries(data, now);
          // Compatibility for deployments which have not yet installed Realtime.
          if (!versions.size) { cached = results; publishWaitAggregates(Object.values(results)); }
        }
        return currentCache(now);
      } catch {
        liveServiceUnavailable = true;
        // Do not feed a failed read into Witch Watch or silently use local reports.
        return Object.keys(cached).length ? currentCache(now) : neutral(now, true);
      } finally { loading = undefined; }
    })();
    return loading;
  }
  const reports = await localWaitReportRepository.getReports();
  liveServiceUnavailable = false;
  const results = Object.fromEntries(
    getActiveWaitTimeAttractions().map((attraction) => [
      attraction.attractionId,
      aggregateWaitReports(reports, attraction.attractionId, now),
    ]),
  ) as Record<string, WaitTimeAggregate>;
  publishWaitAggregates(Object.values(results));
  return results;
}

export async function getWaitTimeAggregate(attractionId: string, now = Date.now()) {
  if (waitBackend === 'supabase') {
    return (await getWaitTimeAggregates(now))[attractionId] ?? aggregateWaitReports([], attractionId, now);
  }
  const reports = await localWaitReportRepository.getReports();
  const result = aggregateWaitReports(reports, attractionId, now);
  publishWaitAggregates([result]);
  return result;
}
