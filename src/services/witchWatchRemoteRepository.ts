import { Platform } from 'react-native';

import type { AppSettings } from '@/services/appSettingsRepository';
import { getWaitClient } from '@/services/sharedWaitRepository';
import { ensureSupabaseSession } from '@/services/supabaseSession';
import type { Watch } from '@/services/witchWatchCore';

export type RemoteWatchSyncResult = 'synced' | 'unavailable';

export async function syncRemoteWitchWatchState(
  watches: Watch[],
  settings: AppSettings,
): Promise<RemoteWatchSyncResult> {
  try {
    const client = await getWaitClient();
    await ensureSupabaseSession(client);
    const { error } = await client.rpc('replace_my_witch_watches', {
      p_alerts_enabled: settings.witchWatchEnabled,
      p_busy_to_moderate_enabled: settings.busyToModerateAlertsEnabled,
      p_moderate_to_light_enabled: settings.moderateToLightAlertsEnabled,
      p_watches: watches.map((watch) => ({
        attractionId: watch.attractionId,
        enabled: watch.enabled,
        crowdAlertType: watch.crowdAlertType,
        waitThresholdMinutes: watch.waitThresholdMinutes,
        lastKnownCrowdStatus: watch.lastKnownCrowdStatus,
        lastKnownEstimatedWait: watch.lastKnownEstimatedWait,
      })),
    });
    return error ? 'unavailable' : 'synced';
  } catch {
    return 'unavailable';
  }
}

export async function registerRemotePushToken(token: string): Promise<RemoteWatchSyncResult> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return 'unavailable';
  try {
    const client = await getWaitClient();
    await ensureSupabaseSession(client);
    const { error } = await client.rpc('register_witch_watch_push_token', {
      p_token: token,
      p_platform: Platform.OS,
      p_enabled: true,
    });
    return error ? 'unavailable' : 'synced';
  } catch {
    return 'unavailable';
  }
}

export async function disableRemotePushTokens(): Promise<void> {
  try {
    const client = await getWaitClient();
    const session = await client.auth.getSession();
    if (!session.data.session) return;
    await client.rpc('disable_my_witch_watch_push_tokens');
  } catch {
    // Notification delivery is optional; local browsing and watch storage remain usable.
  }
}
