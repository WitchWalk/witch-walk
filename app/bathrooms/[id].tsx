import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BathroomDetailsView } from '@/components/bathrooms/BathroomDetailsView';
import { getBathroomLocation } from '@/data/bathrooms';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export default function BathroomDetailsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const location = getBathroomLocation(id);

  if (location) return <BathroomDetailsView location={location} />;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.content}>
        <Text style={styles.title}>Bathroom location not found</Text>
        <Text style={styles.message}>This local restroom entry is not available.</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/bathrooms')}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Back to Bathrooms</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  title: { ...typography.title, textAlign: 'center' },
  message: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm },
  button: {
    borderRadius: radius.md,
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    marginTop: spacing.xl,
  },
  buttonText: { color: colors.black, fontWeight: '900' },
});
