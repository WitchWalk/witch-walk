import {
  createWaitReportService,
  WAIT_REPORT_COOLDOWN_MILLISECONDS,
} from '@/services/waitReportCore';
import { localWaitReportRepository } from '@/services/waitReportRepository';
import { waitReportProximityRules } from '@/services/proximity';

export const waitReportService = createWaitReportService(localWaitReportRepository, {
  cooldownMilliseconds: WAIT_REPORT_COOLDOWN_MILLISECONDS,
  locationMaximumAgeMilliseconds: waitReportProximityRules.maximumAgeMilliseconds,
  locationMaximumAccuracyMeters: waitReportProximityRules.maximumAccuracyMeters,
  allowedRadiusMeters: waitReportProximityRules.allowedRadiusMeters,
});

export {
  APPROVED_CROWD_LEVELS,
  APPROVED_WAIT_MINUTES,
  cooldownMinutesRemaining,
  createSubmissionKey,
  WAIT_REPORT_COOLDOWN_MILLISECONDS,
  WAIT_QUICK_STATUS_OPTIONS,
} from '@/services/waitReportCore';

export type { WaitReportResult } from '@/services/waitReportCore';
