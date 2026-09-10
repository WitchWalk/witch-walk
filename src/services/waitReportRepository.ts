import AsyncStorage from '@react-native-async-storage/async-storage';

import type { StoredWaitReport, WaitReportRepository } from '@/services/waitReportCore';

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
    return Array.isArray(parsed) ? parsed as StoredWaitReport[] : [];
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
