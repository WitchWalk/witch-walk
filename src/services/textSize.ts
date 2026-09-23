import type { TextSizePreference } from '@/services/appSettingsRepository';

export const LARGER_TEXT_TARGET_SCALE = 1.16;

export function getAppTextScale(
  preference: TextSizePreference,
  systemFontScale = 1,
) {
  if (preference === 'default') return 1;

  // React Native applies the device font scale separately. Only add enough
  // app-level scaling to reach the selected target so accessibility sizing is
  // not multiplied twice.
  return Math.max(1, LARGER_TEXT_TARGET_SCALE / Math.max(1, systemFontScale));
}
