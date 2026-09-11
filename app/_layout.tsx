import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { FavoritesProvider } from '@/components/favorites/FavoritesProvider';
import { AppSettingsProvider } from '@/components/settings/AppSettingsProvider';
import { WitchWatchProvider } from '@/components/WitchWatchProvider';
import { WaitRealtimeProvider } from '@/components/WaitRealtimeProvider';
import { colors } from '@/theme/tokens';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppSettingsProvider>
        <FavoritesProvider>
          <WitchWatchProvider>
            <WaitRealtimeProvider>
            <View style={styles.container}>
              <StatusBar style="light" />
              <Stack screenOptions={{ headerShown: false, contentStyle: styles.content }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="attractions" />
                <Stack.Screen name="restaurants" />
                <Stack.Screen name="parking" />
                <Stack.Screen name="bathrooms" />
                <Stack.Screen name="settings" />
                <Stack.Screen name="house-arauz" />
                <Stack.Screen name="events" />
                <Stack.Screen name="live-map" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="wait-times-overview" options={{ animation: 'slide_from_right' }} />
              </Stack>
            </View>
            </WaitRealtimeProvider>
          </WitchWatchProvider>
        </FavoritesProvider>
      </AppSettingsProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    backgroundColor: colors.background,
  },
});
