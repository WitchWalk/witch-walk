import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText as Text } from '@/components/AppText';
import { AttractionDetailsView } from '@/components/attractions/AttractionDetailsView';
import { useAttractions } from '@/components/attractions/AttractionsProvider';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export default function AttractionDetailsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getAttraction, ready } = useAttractions();
  const attraction = getAttraction(id);

  if (attraction) return <AttractionDetailsView attraction={attraction} />;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.content}>
        <Text style={styles.title}>{ready ? 'Attraction unavailable' : 'Loading attraction…'}</Text>
        <Text style={styles.message}>{ready ? 'This attraction is not currently published.' : 'Checking the latest Salem attraction information.'}</Text>
        <Pressable accessibilityRole="button" onPress={() => router.replace('/attractions')} style={styles.button}>
          <Text style={styles.buttonText}>Back to Attractions</Text>
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
  button: { backgroundColor: colors.gold, borderRadius: radius.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, marginTop: spacing.xl },
  buttonText: { color: colors.black, fontWeight: '900' },
});
