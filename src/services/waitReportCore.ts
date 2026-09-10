export const WAIT_REPORT_COOLDOWN_MILLISECONDS = 10 * 60 * 1_000;
export const WAIT_REPORT_NOTE_MAX_LENGTH = 120;
export const APPROVED_WAIT_MINUTES = [0, 10, 20, 30, 45, 60] as const;
export const APPROVED_CROWD_LEVELS = ['light', 'moderate', 'busy'] as const;

export type ApprovedWaitMinutes = (typeof APPROVED_WAIT_MINUTES)[number];
export type ApprovedCrowdLevel = (typeof APPROVED_CROWD_LEVELS)[number];

export type ReportVerificationProof = {
  verified: boolean;
  reason: string;
  distanceMeters?: number;
  accuracyMeters?: number | null;
  locationTimestamp?: number;
};

export type WaitReportSubmission = {
  attractionId: string;
  waitMinutes: unknown;
  crowdLevel: unknown;
  note?: string;
  submissionKey: string;
  verification: ReportVerificationProof;
};

export type StoredWaitReport = {
  id: string;
  deviceReportId: string;
  submissionKey: string;
  attractionId: string;
  waitMinutes: ApprovedWaitMinutes;
  crowdLevel: ApprovedCrowdLevel;
  note: string;
  submittedAt: number;
};

export type WaitReportRepository = {
  getOrCreateDeviceReportId: () => Promise<string>;
  getReports: () => Promise<StoredWaitReport[]>;
  saveReport: (report: StoredWaitReport) => Promise<void>;
};

export type WaitReportResult =
  | { kind: 'success'; report: StoredWaitReport }
  | { kind: 'duplicate'; report: StoredWaitReport }
  | { kind: 'cooldown'; remainingMilliseconds: number }
  | { kind: 'invalid'; field: 'attraction' | 'wait' | 'crowd' }
  | { kind: 'location-failed'; reason: 'expired' | 'inaccurate' | 'outside-radius' | 'unverified' };

export type WaitReportRules = {
  cooldownMilliseconds: number;
  noteMaximumLength: number;
  locationMaximumAgeMilliseconds: number;
  locationMaximumAccuracyMeters: number;
  allowedRadiusMeters: number;
};

function isApprovedWait(value: unknown): value is ApprovedWaitMinutes {
  return typeof value === 'number' && APPROVED_WAIT_MINUTES.some((approved) => approved === value);
}

function isApprovedCrowd(value: unknown): value is ApprovedCrowdLevel {
  return typeof value === 'string' && APPROVED_CROWD_LEVELS.some((approved) => approved === value);
}

export function sanitizeWaitReportNote(note: string | undefined, maximumLength = WAIT_REPORT_NOTE_MAX_LENGTH) {
  return (note ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maximumLength);
}

function validateVerification(proof: ReportVerificationProof, now: number, rules: WaitReportRules): WaitReportResult | null {
  if (!proof.verified || !proof.locationTimestamp) return { kind: 'location-failed', reason: 'unverified' };
  if (now - proof.locationTimestamp > rules.locationMaximumAgeMilliseconds) return { kind: 'location-failed', reason: 'expired' };
  if (proof.accuracyMeters === null || proof.accuracyMeters === undefined || proof.accuracyMeters > rules.locationMaximumAccuracyMeters) {
    return { kind: 'location-failed', reason: 'inaccurate' };
  }
  if (proof.distanceMeters === undefined || proof.distanceMeters > rules.allowedRadiusMeters) {
    return { kind: 'location-failed', reason: 'outside-radius' };
  }
  return null;
}

function createReportId(deviceReportId: string, attractionId: string, now: number) {
  return `${deviceReportId}:${attractionId}:${now}`;
}

export function createWaitReportService(repository: WaitReportRepository, rules: WaitReportRules) {
  const activeSubmissions = new Map<string, Promise<WaitReportResult>>();
  let submissionQueue: Promise<void> = Promise.resolve();

  const processSubmission = async (input: WaitReportSubmission, now: number): Promise<WaitReportResult> => {
    const attractionId = input.attractionId.trim();
    if (!attractionId) return { kind: 'invalid', field: 'attraction' };
    if (!isApprovedWait(input.waitMinutes)) return { kind: 'invalid', field: 'wait' };
    if (!isApprovedCrowd(input.crowdLevel)) return { kind: 'invalid', field: 'crowd' };

    const locationFailure = validateVerification(input.verification, now, rules);
    if (locationFailure) return locationFailure;

    const deviceReportId = await repository.getOrCreateDeviceReportId();
    const reports = await repository.getReports();
    const existingSubmission = reports.find((report) => report.deviceReportId === deviceReportId && report.submissionKey === input.submissionKey);
    if (existingSubmission) return { kind: 'duplicate', report: existingSubmission };

    const latestAttractionReport = reports
      .filter((report) => report.deviceReportId === deviceReportId && report.attractionId === attractionId)
      .sort((a, b) => b.submittedAt - a.submittedAt)[0];
    if (latestAttractionReport) {
      const elapsed = now - latestAttractionReport.submittedAt;
      if (elapsed < rules.cooldownMilliseconds) {
        return { kind: 'cooldown', remainingMilliseconds: rules.cooldownMilliseconds - elapsed };
      }
    }

    const report: StoredWaitReport = {
      id: createReportId(deviceReportId, attractionId, now),
      deviceReportId,
      submissionKey: input.submissionKey,
      attractionId,
      waitMinutes: input.waitMinutes,
      crowdLevel: input.crowdLevel,
      note: sanitizeWaitReportNote(input.note, rules.noteMaximumLength),
      submittedAt: now,
    };

    await repository.saveReport(report);
    return { kind: 'success', report };
  };

  return {
    submit(input: WaitReportSubmission, now = Date.now()) {
      const activeKey = `${input.attractionId}:${input.submissionKey}`;
      const active = activeSubmissions.get(activeKey);
      if (active) return active;

      const pending = submissionQueue
        .then(() => processSubmission(input, now))
        .finally(() => activeSubmissions.delete(activeKey));
      submissionQueue = pending.then(() => undefined, () => undefined);
      activeSubmissions.set(activeKey, pending);
      return pending;
    },
  };
}

export function cooldownMinutesRemaining(milliseconds: number) {
  return Math.max(1, Math.ceil(milliseconds / 60_000));
}

export function createSubmissionKey() {
  return `wait-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}
