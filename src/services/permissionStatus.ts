import * as Location from 'expo-location';
import { Platform } from 'react-native';

export type PermissionSummary = {
  label: 'Allowed' | 'Not Allowed' | 'Not Set' | 'Unavailable' | 'While Using App';
  canOpenSettings: boolean;
};

export async function getNotificationPermissionSummary(): Promise<PermissionSummary> {
  if (Platform.OS === 'web') return { label: 'Unavailable', canOpenSettings: false };
  try {
    const notifications = await import('expo-notifications');
    const permission = await notifications.getPermissionsAsync();
    if (permission.granted) return { label: 'Allowed', canOpenSettings: false };
    if (permission.status === 'undetermined') return { label: 'Not Set', canOpenSettings: false };
    return { label: 'Not Allowed', canOpenSettings: true };
  } catch {
    return { label: 'Unavailable', canOpenSettings: false };
  }
}

export async function getLocationPermissionSummary(): Promise<PermissionSummary> {
  if (Platform.OS === 'web') return { label: 'Unavailable', canOpenSettings: false };
  try {
    const permission = await Location.getForegroundPermissionsAsync();
    if (permission.granted) return { label: 'While Using App', canOpenSettings: false };
    if (permission.status === Location.PermissionStatus.UNDETERMINED) return { label: 'Not Set', canOpenSettings: false };
    return { label: 'Not Allowed', canOpenSettings: true };
  } catch {
    return { label: 'Unavailable', canOpenSettings: false };
  }
}
