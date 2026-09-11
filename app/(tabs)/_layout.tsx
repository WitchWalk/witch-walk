import { Ionicons } from '@expo/vector-icons';
import { Tabs, useSegments } from 'expo-router';
import type { ComponentProps } from 'react';
import { Text } from 'react-native';

import { colors } from '@/theme/tokens';

type IconName = ComponentProps<typeof Ionicons>['name'];

const icons: Record<string, { active: IconName; inactive: IconName }> = {
  index: { active: 'home', inactive: 'home-outline' },
  map: { active: 'map', inactive: 'map-outline' },
  'wait-times': { active: 'people', inactive: 'people-outline' },
  favorites: { active: 'heart', inactive: 'heart-outline' },
  more: { active: 'menu', inactive: 'menu-outline' },
};

export default function TabLayout() {
  const segments = useSegments();
  const homeFlowActive = segments.some((segment) =>
    ['attractions', 'restaurants', 'parking', 'bathrooms'].includes(segment),
  );

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 2,
        },
        tabBarStyle: {
          height: 78,
          paddingTop: 8,
          paddingBottom: 10,
          backgroundColor: '#0C0911',
          borderTopColor: colors.borderSoft,
          borderTopWidth: 1,
        },
        tabBarIcon: ({ color, focused, size }) => {
          const routeIcons = icons[route.name] ?? icons.index;
          return <Ionicons name={focused ? routeIcons.active : routeIcons.inactive} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              color={homeFlowActive ? colors.gold : color}
              name={focused || homeFlowActive ? 'home' : 'home-outline'}
              size={size}
            />
          ),
          tabBarLabel: ({ color }) => (
            <Text style={{ color: homeFlowActive ? colors.gold : color, fontSize: 11, fontWeight: '700' }}>
              Home
            </Text>
          ),
        }}
      />
      <Tabs.Screen name="attractions" options={{ href: null }} />
      <Tabs.Screen name="restaurants" options={{ href: null }} />
      <Tabs.Screen name="parking" options={{ href: null }} />
      <Tabs.Screen name="bathrooms" options={{ href: null }} />
      <Tabs.Screen name="map" options={{ title: 'Map' }} />
      <Tabs.Screen name="wait-times" options={{ title: 'Wait Times' }} />
      <Tabs.Screen name="report-wait/[id]" options={{ href: null }} />
      <Tabs.Screen name="favorites" options={{ title: 'Favorites' }} />
      <Tabs.Screen name="more" options={{ title: 'More' }} />
    </Tabs>
  );
}
