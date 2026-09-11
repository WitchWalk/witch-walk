import AsyncStorage from '@react-native-async-storage/async-storage';

import { WATCH_THRESHOLDS } from '@/services/witchWatchCore';

export type TextSizePreference = 'default' | 'larger';

export type AppSettings = {
  witchWatchEnabled: boolean;
  busyToModerateAlertsEnabled: boolean;
  moderateToLightAlertsEnabled: boolean;
  defaultWaitThresholdMinutes: (typeof WATCH_THRESHOLDS)[number];
  textSizePreference: TextSizePreference;
};

export const defaultAppSettings: AppSettings = {
  witchWatchEnabled: true,
  busyToModerateAlertsEnabled: true,
  moderateToLightAlertsEnabled: true,
  defaultWaitThresholdMinutes: 20,
  textSizePreference: 'default',
};

const storageKey = '@witch-walk/app-settings-v1';

function readBoolean(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback;
}

export const appSettingsRepository = {
  async load(): Promise<AppSettings> {
    const raw = await AsyncStorage.getItem(storageKey);
    if (!raw) return defaultAppSettings;

    try {
      const value: unknown = JSON.parse(raw);
      if (!value || typeof value !== 'object') return defaultAppSettings;
      const stored = value as Partial<AppSettings>;
      const threshold = WATCH_THRESHOLDS.find((option) => option === stored.defaultWaitThresholdMinutes);

      return {
        witchWatchEnabled: readBoolean(stored.witchWatchEnabled, defaultAppSettings.witchWatchEnabled),
        busyToModerateAlertsEnabled: readBoolean(stored.busyToModerateAlertsEnabled, defaultAppSettings.busyToModerateAlertsEnabled),
        moderateToLightAlertsEnabled: readBoolean(stored.moderateToLightAlertsEnabled, defaultAppSettings.moderateToLightAlertsEnabled),
        defaultWaitThresholdMinutes: threshold ?? defaultAppSettings.defaultWaitThresholdMinutes,
        textSizePreference: stored.textSizePreference === 'larger' ? 'larger' : 'default',
      };
    } catch {
      return defaultAppSettings;
    }
  },

  save(settings: AppSettings) {
    return AsyncStorage.setItem(storageKey, JSON.stringify(settings));
  },
};
