import * as ExpoLocation from 'expo-location';

import type { LocationFix } from '@/services/proximity';

export { distanceLabel } from '@/services/proximity';
export type { LocationFix } from '@/services/proximity';

export type ForegroundLocationResult =
  | { kind: 'granted'; location: LocationFix }
  | { kind: 'denied'; canAskAgain: boolean }
  | { kind: 'imprecise' }
  | { kind: 'unavailable'; message: string };

function hasPrecisePermission(permission: ExpoLocation.LocationPermissionResponse) {
  if (permission.ios) return permission.ios.accuracy === 'full';
  if (permission.android) return permission.android.accuracy === 'fine';
  return true;
}

export async function requestCurrentForegroundLocation(options: { requirePrecise?: boolean } = {}): Promise<ForegroundLocationResult> {
  try {
    let permission = await ExpoLocation.getForegroundPermissionsAsync();

    if (permission.status !== ExpoLocation.PermissionStatus.GRANTED) {
      if (!permission.canAskAgain) return { kind: 'denied', canAskAgain: false };
      permission = await ExpoLocation.requestForegroundPermissionsAsync();
    }

    if (permission.status !== ExpoLocation.PermissionStatus.GRANTED) {
      return { kind: 'denied', canAskAgain: permission.canAskAgain };
    }

    if (options.requirePrecise && !hasPrecisePermission(permission)) return { kind: 'imprecise' };

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
