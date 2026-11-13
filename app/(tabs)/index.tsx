import {
  router,
  useFocusEffect,
  type Href,
} from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, AppState, Linking, Pressable, StyleSheet, View } from 'react-native';

import { AppText as Text } from '@/components/AppText';
import { BrandHeader } from '@/components/BrandHeader';
import { CrowdStatusCard } from '@/components/CrowdStatusCard';
import { HomeShortcutCard } from '@/components/HomeShortcutCard';
import { Screen } from '@/components/Screen';
import { homeActions } from '@/data/homeActions';
import { loadHouseArauzChannelUrl } from '@/services/houseArauzContentRepository';
import { openExternalUrl } from '@/services/supportLinkCore';
import { getAdminDowntownCrowdStatus } from '@/services/downtownCrowdStatus';
import { loadPublicSettings } from '@/services/publicSettingsRepository';
import { colors, spacing, typography } from '@/theme/tokens';

export default function HomeScreen() {
  const [houseArauzChannelUrl, setHouseArauzChannelUrl] = useState<string | null>(null);
  const [downtownCrowdLevel, setDowntownCrowdLevel] =
    useState<'light' | 'moderate' | 'busy' | null>(null);
  const shortcutRows = [
    homeActions.slice(0, 3),
    homeActions.slice(3, 6),
    homeActions.slice(6, 9),
  ];

  const refreshHouseArauzChannel = useCallback(async () => {
    const result = await loadHouseArauzChannelUrl();
    setHouseArauzChannelUrl(result.url);
    return result.url;
  }, []);

  useFocusEffect(useCallback(() => { void refreshHouseArauzChannel(); }, [refreshHouseArauzChannel]));
  useFocusEffect(useCallback(() => {
    let active = true;

    void loadPublicSettings().then((result) => {
      if (!active) return;
      setDowntownCrowdLevel(
        result.settings.downtownSalemCrowdLevel,
      );
    });

    return () => {
      active = false;
    };
  }, []));

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshHouseArauzChannel();
    });
    return () => subscription.remove();
  }, [refreshHouseArauzChannel]);

  const downtownCrowdStatus = useMemo(
    () => getAdminDowntownCrowdStatus(downtownCrowdLevel),
    [downtownCrowdLevel],
  );

  const openAction = async (action: (typeof homeActions)[number]) => {
    if (action.href !== '/house-arauz') {
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

      <CrowdStatusCard status={downtownCrowdStatus} onPress={() => router.push('/map')} />

      <View style={styles.shortcutsSection}>
        <Text style={styles.sectionTitle}>Explore Salem</Text>

        <View style={styles.grid}>
          {shortcutRows.map((row) => (
            <View key={row[0].title} style={styles.gridRow}>
              {row.map((action) => (
                <View key={action.title} style={styles.gridItem}>
                  <HomeShortcutCard {...action} onPress={() => void openAction(action)} />
                </View>
              ))}
            </View>
          ))}
        </View>

        {__DEV__ ? (
          <View style={styles.devTourStack}>
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.push('/tours' as Href)
              }
              style={styles.devTourButton}
            >
              <Text style={styles.devTourTitle}>
                🧹 BROOMSTICK Plus Tours
              </Text>
              <Text style={styles.devTourText}>
                Curated tours + Build My Own Tour
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/build-my-tour')}
              style={styles.devTourSecondary}
            >
              <Text style={styles.devTourSecondaryText}>
                Open route builder directly
              </Text>
            </Pressable>
          </View>
        ) : null}
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
  devTourStack: {
    gap: spacing.sm,
  },

  devTourButton: {
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: 16,
    backgroundColor: '#211710',
    padding: spacing.md,
  },
  devTourTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.gold,
  },
  devTourText: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textMuted,
  },

  devTourSecondary: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },

  devTourSecondaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
});
