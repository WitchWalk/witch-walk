import { waitTimeAttractions } from '@/data/waitTimes';
import {
  aggregateWaitReports,
  type WaitTimeAggregate,
} from '@/services/waitReportCore';
import { localWaitReportRepository } from '@/services/waitReportRepository';

export async function getWaitTimeAggregates(now = Date.now()) {
  const reports = await localWaitReportRepository.getReports();
  return Object.fromEntries(
    waitTimeAttractions.map((attraction) => [
      attraction.attractionId,
      aggregateWaitReports(reports, attraction.attractionId, now),
    ]),
  ) as Record<string, WaitTimeAggregate>;
}

export async function getWaitTimeAggregate(attractionId: string, now = Date.now()) {
  const reports = await localWaitReportRepository.getReports();
  return aggregateWaitReports(reports, attractionId, now);
}
