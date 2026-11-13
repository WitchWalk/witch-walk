import { router, Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { FavoritesProvider } from '@/components/favorites/FavoritesProvider';
import { PlusProvider } from '@/components/plus/PlusProvider';
import { StartupSequence } from '@/components/StartupSequence';
import { AttractionsProvider } from '@/components/attractions/AttractionsProvider';
import { RestaurantsProvider } from '@/components/restaurants/RestaurantsProvider';
import { ParkingProvider } from '@/components/parking/ParkingProvider';
import { BathroomsProvider } from '@/components/bathrooms/BathroomsProvider';
import { EventsProvider } from '@/components/events/EventsProvider';
import { AppSettingsProvider } from '@/components/settings/AppSettingsProvider';
import { WitchWatchProvider } from '@/components/WitchWatchProvider';
import { WaitRealtimeProvider } from '@/components/WaitRealtimeProvider';
import { colors } from '@/theme/tokens';
import { subscribeRemoteWatchNotifications } from '@/services/witchWatchNotifications';

export default function RootLayout() {
  const [showStartup, setShowStartup] = useState(true);

  const finishStartup = useCallback(
    () => setShowStartup(false),
    [],
  );

  useEffect(() => {
    let unsubscribe: () => void = () => undefined;

    void subscribeRemoteWatchNotifications((id) =>
      router.push(`/attractions/${id}`),
    ).then((value) => {
      unsubscribe = value;
    });

    return () => unsubscribe();
  }, []);

  if (showStartup) {
    return (
      <SafeAreaProvider>
        <StatusBar hidden />
        <StartupSequence
          onFinished={finishStartup}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <AppSettingsProvider>
        <AttractionsProvider>
          <RestaurantsProvider>
            <ParkingProvider>
              <BathroomsProvider>
                <EventsProvider>
                  <FavoritesProvider>
                    <PlusProvider>
                      <WitchWatchProvider>
                      <WaitRealtimeProvider>
                        <View style={styles.container}>
                          <StatusBar style="light" />
                          <Stack
                            screenOptions={{
                              headerShown: false,
                              contentStyle: styles.content,
                            }}
                          >
                            <Stack.Screen name="(tabs)" />
                            <Stack.Screen name="attractions" />
                            <Stack.Screen name="restaurants" />
                            <Stack.Screen name="hotels" />
                            <Stack.Screen name="parking" />
                            <Stack.Screen name="bathrooms" />
                            <Stack.Screen name="settings" />
                            <Stack.Screen name="house-arauz" />
                            <Stack.Screen name="events" />
                            <Stack.Screen name="broomstick-plus" />
                            <Stack.Screen
                              name="live-map"
                              options={{
                                animation: 'slide_from_right',
                              }}
                            />
                            <Stack.Screen
                              name="wait-times-overview"
                              options={{
                                animation: 'slide_from_right',
                              }}
                            />
                          </Stack>
                        </View>
                      </WaitRealtimeProvider>
                    </WitchWatchProvider>
                    </PlusProvider>
                  </FavoritesProvider>
                </EventsProvider>
              </BathroomsProvider>
            </ParkingProvider>
          </RestaurantsProvider>
        </AttractionsProvider>
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
