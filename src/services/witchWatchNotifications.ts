import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { registerRemotePushToken } from '@/services/witchWatchRemoteRepository';
import { getAttraction } from '@/data/attractions';
import { remoteWitchWatchEnabled } from '@/config/witchWatchBackend';

const askedKey = '@witch-walk/watch-permission-asked-v1';
export async function enableWatchNotifications() {
  if (Platform.OS === 'web') return false;
  const notifications = await import('expo-notifications');
  if (Platform.OS === 'android') await notifications.setNotificationChannelAsync('witch-watch', {
    name: 'Witch Watch', importance: notifications.AndroidImportance.DEFAULT,
  });
  let permission = await notifications.getPermissionsAsync();
  if (!permission.granted && permission.canAskAgain && !(await AsyncStorage.getItem(askedKey))) {
    await AsyncStorage.setItem(askedKey, 'true');
    permission = await notifications.requestPermissionsAsync();
  }
  return permission.granted;
}

export type RemoteNotificationRegistration = 'registered' | 'denied' | 'unavailable';

export async function enableRemoteWatchNotifications(): Promise<RemoteNotificationRegistration> {
  if (!(await enableWatchNotifications())) return 'denied';
  const notifications = await import('expo-notifications');
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (typeof projectId !== 'string' || !projectId) return 'unavailable';
  try {
    const token = (await notifications.getExpoPushTokenAsync({ projectId })).data;
    return await registerRemotePushToken(token) === 'synced' ? 'registered' : 'unavailable';
  } catch {
    return 'unavailable';
  }
}

export async function refreshRemoteWatchNotifications(): Promise<RemoteNotificationRegistration> {
  if (Platform.OS === 'web') return 'unavailable';
  const notifications = await import('expo-notifications');
  if (!(await notifications.getPermissionsAsync()).granted) return 'denied';
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (typeof projectId !== 'string' || !projectId) return 'unavailable';
  try {
    const token = (await notifications.getExpoPushTokenAsync({ projectId })).data;
    return await registerRemotePushToken(token) === 'synced' ? 'registered' : 'unavailable';
  } catch {
    return 'unavailable';
  }
}

export async function subscribeRemoteWatchNotifications(openAttraction: (id: string) => void) {
  if (Platform.OS === 'web') return () => undefined;
  const notifications = await import('expo-notifications');
  notifications.setNotificationHandler({ handleNotification: async () => ({
    shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false,
  }) });
  const open = (response: Awaited<ReturnType<typeof notifications.getLastNotificationResponseAsync>>) => {
    const id = response?.notification.request.content.data?.attractionId;
    if (typeof id === 'string' && getAttraction(id)) openAttraction(id);
  };
  const responseSubscription = notifications.addNotificationResponseReceivedListener(open);
  const tokenSubscription = remoteWitchWatchEnabled
    ? notifications.addPushTokenListener(() => { void refreshRemoteWatchNotifications(); })
    : null;
  open(await notifications.getLastNotificationResponseAsync());
  return () => { responseSubscription.remove(); tokenSubscription?.remove(); };
}
export async function notifyWatch(name: string, attractionId: string) {
  if (Platform.OS === 'web') return;
  const notifications = await import('expo-notifications');
  if (!(await notifications.getPermissionsAsync()).granted) return;
  await notifications.scheduleNotificationAsync({
    content: { title: 'Witch Watch', body: `${name}: conditions improved. Check the latest wait.`, data: { attractionId } },
    trigger: null,
  });
}
