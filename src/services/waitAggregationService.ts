import { waitTimeAttractions } from '@/data/waitTimes';
import {
  aggregateWaitReports,
  type WaitTimeAggregate,
} from '@/services/waitReportCore';
import { localWaitReportRepository } from '@/services/waitReportRepository';
import { publishWaitAggregates } from './waitAggregateEvents';

export async function getWaitTimeAggregates(now = Date.now()) {
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
  const reports = await localWaitReportRepository.getReports();
  const result = aggregateWaitReports(reports, attractionId, now);
  publishWaitAggregates([result]);
  return result;
}
