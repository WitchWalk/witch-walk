import AsyncStorage from '@react-native-async-storage/async-storage';
import { WATCH_THRESHOLDS, type Watch } from './witchWatchCore';

const key = '@witch-walk/watches-v1';
export const witchWatchRepository = {
  async load(): Promise<Watch[]> {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return [];
    try {
      const values: unknown = JSON.parse(raw);
      if (!Array.isArray(values)) return [];
      return values.filter((value): value is Watch => value && typeof value.attractionId === 'string'
        && typeof value.enabled === 'boolean'
        && ['busy-to-moderate', 'moderate-to-light'].includes(value.crowdAlertType)
        && (value.waitThresholdMinutes === null || WATCH_THRESHOLDS.some(t => t === value.waitThresholdMinutes)));
    } catch { return []; }
  },
  save(watches: Watch[]) { return AsyncStorage.setItem(key, JSON.stringify(watches)); },
};
