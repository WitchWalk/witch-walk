import { waitTimeAttractions } from '@/data/waitTimes';
import {
  aggregateWaitReports,
  type WaitTimeAggregate,
  freshnessLabel, formatEstimatedWait, isApprovedCrowd, isApprovedQuickStatus,
} from '@/services/waitReportCore';
import { localWaitReportRepository } from '@/services/waitReportRepository';
import { publishWaitAggregates } from './waitAggregateEvents';
import { waitBackend } from '@/config/waitBackend';
import { sharedWaitRepository } from '@/services/sharedWaitRepository';

function neutral(now: number, unavailable = false) {
  return Object.fromEntries(waitTimeAttractions.map(item => {
    const value = aggregateWaitReports([], item.attractionId, now);
    if (unavailable) value.freshnessLabel = 'Live updates unavailable';
    return [item.attractionId, value];
  }));
}

export function decodeSharedSummaries(data: unknown, now = Date.now()): Record<string, WaitTimeAggregate> {
  if (!Array.isArray(data)) throw new Error('Invalid summary');
  const results = neutral(now);
  for (const row of data) {
    if (!row || typeof row.attractionId !== 'string' || !results[row.attractionId]) continue;
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

export async function getWaitTimeAggregates(now = Date.now()) {
  if (waitBackend === 'supabase') {
    if (!loading) loading = (async () => {
      try {
        const results = decodeSharedSummaries(await sharedWaitRepository.read(), now);
        publishWaitAggregates(Object.values(results));
        return results;
      } catch {
        // Do not feed a failed read into Witch Watch or silently use local reports.
        return neutral(now, true);
      } finally { loading = undefined; }
    })();
    return loading;
  }
  const reports = await localWaitReportRepository.getReports();
  const results = Object.fromEntries(
    waitTimeAttractions.map((attraction) => [
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
