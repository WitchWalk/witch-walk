import * as ExpoLocation from 'expo-location';

import type { LocationFix } from '@/services/proximity';

export { distanceLabel } from '@/services/proximity';
export type { LocationFix } from '@/services/proximity';

export async function requestCurrentForegroundLocation(): Promise<
  | { kind: 'granted'; location: LocationFix }
  | { kind: 'denied' }
  | { kind: 'unavailable'; message: string }
> {
  try {
    const permission = await ExpoLocation.requestForegroundPermissionsAsync();
    if (permission.status !== ExpoLocation.PermissionStatus.GRANTED) return { kind: 'denied' };

    const result = await ExpoLocation.getCurrentPositionAsync({
      accuracy: ExpoLocation.Accuracy.High,
      mayShowUserSettingsDialog: true,
    });

    return {
      kind: 'granted',
      location: {
        latitude: result.coords.latitude,
        longitude: result.coords.longitude,
        accuracyMeters: result.coords.accuracy,
        timestamp: result.timestamp,
        mocked: result.mocked,
      },
    };
  } catch {
    return { kind: 'unavailable', message: 'Your current location could not be determined.' };
  }
}
