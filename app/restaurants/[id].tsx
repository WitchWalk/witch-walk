import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RestaurantDetailsView } from '@/components/restaurants/RestaurantDetailsView';
import { getRestaurant } from '@/data/restaurants';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export default function RestaurantDetailsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const restaurant = getRestaurant(id);

  if (restaurant) return <RestaurantDetailsView restaurant={restaurant} />;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.content}>
        <Text style={styles.title}>Restaurant not found</Text>
        <Text style={styles.message}>This local restaurant entry is not available.</Text>
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
