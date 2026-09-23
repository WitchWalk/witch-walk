import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText as Text } from '@/components/AppText';
import { ParkingDetailsView } from '@/components/parking/ParkingDetailsView';
import { useParking } from '@/components/parking/ParkingProvider';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export default function ParkingDetailsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getLocation, ready } = useParking();
  const location = getLocation(id);

  if (location) return <ParkingDetailsView location={location} />;

  if (!ready) return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.content}><Text style={styles.title}>Loading parking…</Text></View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.content}>
        <Text style={styles.title}>Parking location not found</Text>
        <Text style={styles.message}>This parking location is not currently available.</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/parking')}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Back to Parking</Text>
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
    backgroundColor: colors.gold,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    marginTop: spacing.xl,
  },
  buttonText: { color: colors.black, fontWeight: '900' },
});
