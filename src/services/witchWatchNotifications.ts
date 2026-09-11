import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

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
export async function notifyWatch(name: string, attractionId: string) {
  if (Platform.OS === 'web') return;
  const notifications = await import('expo-notifications');
  if (!(await notifications.getPermissionsAsync()).granted) return;
  notifications.setNotificationHandler({ handleNotification: async () => ({
    shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false,
  }) });
  await notifications.scheduleNotificationAsync({
    content: { title: 'Witch Watch', body: `${name}: conditions improved. Check the latest wait.`, data: { attractionId } },
    trigger: null,
  });
}
