import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RestaurantDetailsView } from '@/components/restaurants/RestaurantDetailsView';
import { useRestaurants } from '@/components/restaurants/RestaurantsProvider';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export default function RestaurantDetailsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getRestaurant, ready } = useRestaurants();
  const restaurant = getRestaurant(id);

  if (restaurant) return <RestaurantDetailsView restaurant={restaurant} />;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.content}>
        <Text style={styles.title}>{ready ? 'Restaurant unavailable' : 'Loading restaurant…'}</Text>
        <Text style={styles.message}>{ready ? 'This restaurant is not currently published.' : 'Checking the latest Salem restaurant information.'}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/restaurants')}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Back to Restaurants</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  title: { ...typography.title },
  message: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm },
  button: {
    backgroundColor: colors.gold,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    marginTop: spacing.xl,
  },
  buttonText: { color: colors.black, fontWeight: '900' },
});
