import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, AppState, Linking, StyleSheet, Text, View } from 'react-native';

import { BrandHeader } from '@/components/BrandHeader';
import { CrowdStatusCard } from '@/components/CrowdStatusCard';
import { HomeShortcutCard } from '@/components/HomeShortcutCard';
import { Screen } from '@/components/Screen';
import { homeActions } from '@/data/homeActions';
import { loadHouseArauzChannelUrl } from '@/services/houseArauzContentRepository';
import { openExternalUrl } from '@/services/supportLinkCore';
import { colors, spacing, typography } from '@/theme/tokens';

export default function HomeScreen() {
  const [houseArauzChannelUrl, setHouseArauzChannelUrl] = useState<string | null>(null);
  const shortcutRows = [homeActions.slice(0, 3), homeActions.slice(3, 6)];
  const featuredActions = homeActions.slice(6, 8);

  const refreshHouseArauzChannel = useCallback(async () => {
    const result = await loadHouseArauzChannelUrl();
    setHouseArauzChannelUrl(result.url);
    return result.url;
  }, []);

  useFocusEffect(useCallback(() => { void refreshHouseArauzChannel(); }, [refreshHouseArauzChannel]));
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshHouseArauzChannel();
    });
    return () => subscription.remove();
  }, [refreshHouseArauzChannel]);

  const openAction = async (action: (typeof homeActions)[number]) => {
    if (action.title !== 'HOUSE ARAUZ Videos') {
      router.push(action.href);
      return;
    }
    const url = houseArauzChannelUrl ?? await refreshHouseArauzChannel();
    if (url && await openExternalUrl(url, Linking)) return;
    Alert.alert('HOUSE ARAUZ channel unavailable', 'Please try again later.');
  };

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <BrandHeader onSettingsPress={() => router.push('/more')} />

      <CrowdStatusCard onPress={() => router.push('/map')} />

      <View style={styles.shortcutsSection}>
        <Text style={styles.sectionTitle}>Explore Salem</Text>

        <View style={styles.grid}>
          {shortcutRows.map((row) => (
            <View key={row[0].title} style={styles.gridRow}>
              {row.map((action) => (
                <View key={action.title} style={styles.gridItem}>
                  <HomeShortcutCard {...action} onPress={() => router.push(action.href)} />
                </View>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.featuredRow}>
          {featuredActions.map((action) => (
            <View key={action.title} style={styles.featuredItem}>
              <HomeShortcutCard {...action} wide onPress={() => void openAction(action)} />
            </View>
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    gap: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  shortcutsSection: {
    flex: 1,
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.title,
    fontSize: 20,
    lineHeight: 25,
  },
  grid: {
    flex: 1,
    rowGap: spacing.sm,
  },
  gridRow: {
    flex: 1,
    minHeight: 136,
    flexDirection: 'row',
    columnGap: spacing.sm,
  },
  gridItem: {
    flex: 1,
  },
  featuredRow: {
    minHeight: 112,
    flexDirection: 'row',
    columnGap: spacing.sm,
  },
  featuredItem: {
    flex: 1,
  },
});
