import { Stack } from 'expo-router';

export default function RestaurantsLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
