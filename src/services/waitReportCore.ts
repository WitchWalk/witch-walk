export const WAIT_REPORT_COOLDOWN_MILLISECONDS = 10 * 60 * 1_000;
export const WAIT_REPORT_RECENT_WINDOW_MILLISECONDS = 30 * 60 * 1_000;
export const APPROVED_WAIT_MINUTES = [0, 10, 20, 30, 45, 60] as const;
export const APPROVED_CROWD_LEVELS = ['light', 'moderate', 'busy'] as const;
export const WAIT_QUICK_STATUS_OPTIONS = [
  { id: 'line-moving-quickly', label: 'Line moving quickly' },
  { id: 'ticket-line-only', label: 'Ticket line only' },
  { id: 'line-wraps-outside', label: 'Line wraps outside' },
  { id: 'temporary-delay', label: 'Temporary delay' },
  { id: 'entrance-moved', label: 'Entrance moved' },
] as const;

export type ApprovedWaitMinutes = (typeof APPROVED_WAIT_MINUTES)[number];
export type ApprovedCrowdLevel = (typeof APPROVED_CROWD_LEVELS)[number];
export type WaitQuickStatusTag = (typeof WAIT_QUICK_STATUS_OPTIONS)[number]['id'];

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
  quickStatusTag?: unknown;
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
  quickStatusTag: WaitQuickStatusTag | null;
  submittedAt: number;
  locationVerified: boolean;
  locationAccuracyMeters: number | null;
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
  | { kind: 'invalid'; field: 'attraction' | 'wait' | 'crowd' | 'quick status' }
  | { kind: 'location-failed'; reason: 'expired' | 'inaccurate' | 'outside-radius' | 'unverified' };

export type WaitReportRules = {
  cooldownMilliseconds: number;
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

function isApprovedQuickStatus(value: unknown): value is WaitQuickStatusTag {
  return typeof value === 'string' && WAIT_QUICK_STATUS_OPTIONS.some((option) => option.id === value);
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
    if (input.quickStatusTag != null && !isApprovedQuickStatus(input.quickStatusTag)) {
      return { kind: 'invalid', field: 'quick status' };
    }

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
      quickStatusTag: input.quickStatusTag ?? null,
      submittedAt: now,
      locationVerified: true,
      locationAccuracyMeters: input.verification.accuracyMeters as number,
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

export type WaitTimeAggregate = {
  attractionId: string;
  hasRecentReports: boolean;
  estimatedWaitMinutes: number | null;
  estimatedWaitLabel: string;
  crowdLevel: ApprovedCrowdLevel | null;
  freshnessLabel: string;
  quickStatusTag: WaitQuickStatusTag | null;
  reportCount: number;
  newestReportTimestamp: number | null;
  waitSpreadMinutes: number | null;
};

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function aggregateCrowd(reports: StoredWaitReport[]): ApprovedCrowdLevel {
  const crowdOrder: ApprovedCrowdLevel[] = ['light', 'moderate', 'busy'];
  const counts = crowdOrder.map((level) => ({
    level,
    count: reports.filter((report) => report.crowdLevel === level).length,
  }));
  const highestCount = Math.max(...counts.map((entry) => entry.count));
  const tiedLevels = counts.filter((entry) => entry.count === highestCount).map((entry) => crowdOrder.indexOf(entry.level));
  return crowdOrder[Math.round(median(tiedLevels))];
}

function aggregateQuickStatus(reports: StoredWaitReport[]) {
  const counts = new Map<WaitQuickStatusTag, { count: number; newest: number }>();
  reports.forEach((report) => {
    if (!report.quickStatusTag) return;
    const current = counts.get(report.quickStatusTag) ?? { count: 0, newest: 0 };
    counts.set(report.quickStatusTag, {
      count: current.count + 1,
      newest: Math.max(current.newest, report.submittedAt),
    });
  });

  return [...counts.entries()]
    .sort(([, a], [, b]) => b.count - a.count || b.newest - a.newest)[0]?.[0] ?? null;
}

export function freshnessLabel(timestamp: number, now = Date.now()) {
  const minutes = Math.max(0, Math.floor((now - timestamp) / 60_000));
  if (minutes < 1) return 'Updated just now';
  return `Updated ${minutes} min ago`;
}

export function formatEstimatedWait(minutes: number | null) {
  if (minutes === null) return 'No recent wait reports';
  if (minutes === 0) return 'No wait';
  if (minutes >= 60) return '60+ min';
  return `${minutes} min`;
}

export function getQuickStatusLabel(tag: WaitQuickStatusTag | null) {
  return WAIT_QUICK_STATUS_OPTIONS.find((option) => option.id === tag)?.label ?? null;
}

export function aggregateWaitReports(
  reports: StoredWaitReport[],
  attractionId: string,
  now = Date.now(),
  recentWindowMilliseconds = WAIT_REPORT_RECENT_WINDOW_MILLISECONDS,
): WaitTimeAggregate {
  const recentReports = reports.filter((report) =>
    report.attractionId === attractionId &&
    report.locationVerified === true &&
    Number.isFinite(report.submittedAt) &&
    report.submittedAt <= now &&
    now - report.submittedAt <= recentWindowMilliseconds &&
    isApprovedWait(report.waitMinutes) &&
    isApprovedCrowd(report.crowdLevel) &&
    (report.quickStatusTag === null || isApprovedQuickStatus(report.quickStatusTag)));

  if (!recentReports.length) {
    return {
      attractionId,
      hasRecentReports: false,
      estimatedWaitMinutes: null,
      estimatedWaitLabel: 'No recent wait reports',
      crowdLevel: null,
      freshnessLabel: 'No recent wait reports',
      quickStatusTag: null,
      reportCount: 0,
      newestReportTimestamp: null,
      waitSpreadMinutes: null,
    };
  }

  const waitValues = recentReports.map((report) => report.waitMinutes);
  const estimatedWaitMinutes = Math.min(60, Math.round(median(waitValues) / 5) * 5);
  const newestReportTimestamp = Math.max(...recentReports.map((report) => report.submittedAt));

  return {
    attractionId,
    hasRecentReports: true,
    estimatedWaitMinutes,
    estimatedWaitLabel: formatEstimatedWait(estimatedWaitMinutes),
    crowdLevel: aggregateCrowd(recentReports),
    freshnessLabel: freshnessLabel(newestReportTimestamp, now),
    quickStatusTag: aggregateQuickStatus(recentReports),
    reportCount: recentReports.length,
    newestReportTimestamp,
    waitSpreadMinutes: Math.max(...waitValues) - Math.min(...waitValues),
  };
}
