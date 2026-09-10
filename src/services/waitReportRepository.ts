import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  WAIT_QUICK_STATUS_OPTIONS,
  type ApprovedCrowdLevel,
  type ApprovedWaitMinutes,
  type StoredWaitReport,
  type WaitQuickStatusTag,
  type WaitReportRepository,
} from '@/services/waitReportCore';

const deviceIdKey = '@witch-walk/report-device-id-v1';
const reportsKey = '@witch-walk/local-wait-reports-v1';
const maximumStoredReports = 200;

function createPrivateDeviceReportId() {
  return `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
}

async function readReports() {
  const stored = await AsyncStorage.getItem(reportsKey);
  if (!stored) return [];

  try {
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    const reports = parsed.flatMap((value): StoredWaitReport[] => {
      if (!value || typeof value !== 'object') return [];
      const report = value as Record<string, unknown>;
      if (
        typeof report.id !== 'string' ||
        typeof report.deviceReportId !== 'string' ||
        typeof report.submissionKey !== 'string' ||
        typeof report.attractionId !== 'string' ||
        typeof report.waitMinutes !== 'number' ||
        typeof report.crowdLevel !== 'string' ||
        typeof report.submittedAt !== 'number'
      ) return [];

      const quickStatusTag = WAIT_QUICK_STATUS_OPTIONS.some((option) => option.id === report.quickStatusTag)
        ? report.quickStatusTag as WaitQuickStatusTag
        : null;
      return [{
        id: report.id,
        deviceReportId: report.deviceReportId,
        submissionKey: report.submissionKey,
        attractionId: report.attractionId,
        waitMinutes: report.waitMinutes as ApprovedWaitMinutes,
        crowdLevel: report.crowdLevel as ApprovedCrowdLevel,
        quickStatusTag,
        submittedAt: report.submittedAt,
        locationVerified: report.locationVerified === true,
        locationAccuracyMeters: typeof report.locationAccuracyMeters === 'number' ? report.locationAccuracyMeters : null,
      }];
    });

    const cleaned = JSON.stringify(reports);
    if (cleaned !== stored) await AsyncStorage.setItem(reportsKey, cleaned);
    return reports;
  } catch {
    return [];
  }
}

export const localWaitReportRepository: WaitReportRepository = {
  async getOrCreateDeviceReportId() {
    const existing = await AsyncStorage.getItem(deviceIdKey);
    if (existing) return existing;

    const created = createPrivateDeviceReportId();
    await AsyncStorage.setItem(deviceIdKey, created);
    return created;
  },

  getReports: readReports,

  async saveReport(report) {
    const reports = await readReports();
    const next = [...reports, report]
      .sort((a, b) => b.submittedAt - a.submittedAt)
      .slice(0, maximumStoredReports);
    await AsyncStorage.setItem(reportsKey, JSON.stringify(next));
  },
};
