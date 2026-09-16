import Constants from 'expo-constants';
import { Platform } from 'react-native';

export function formatVersionBuild(version: string | null | undefined, build: string | number | null | undefined) {
  const safeVersion = typeof version === 'string' && version.trim() ? version.trim() : 'Unavailable';
  const safeBuild = typeof build === 'number' && Number.isFinite(build) ? String(build)
    : typeof build === 'string' && build.trim() ? build.trim() : null;
  return safeBuild ? `Version ${safeVersion} (${safeBuild})` : `Version ${safeVersion}`;
}

export function getInstalledAppVersionLabel() {
  const build = Platform.OS === 'ios'
    ? Constants.platform?.ios?.buildNumber
    : Platform.OS === 'android' ? Constants.platform?.android?.versionCode : null;
  return formatVersionBuild(Constants.expoConfig?.version, build);
}
