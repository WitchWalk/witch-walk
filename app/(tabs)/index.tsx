import { Ionicons } from '@expo/vector-icons';
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="BROOMSTICK Plus Tours. Curated narrated tours and Build My Own Tour."
            onPress={() => router.push('/tours' as Href)}
            style={({ pressed }) => [
              styles.plusTourCard,
              pressed && styles.plusTourCardPressed,
            ]}
          >
            <View style={styles.plusTourIconShell}>
              <Text style={styles.plusTourEmoji}>🧹</Text>
            </View>

            <View style={styles.plusTourCopy}>
              <Text style={styles.plusTourEyebrow}>
                BROOMSTICK PLUS
              </Text>
              <Text style={styles.plusTourTitle}>
                Salem Tours
              </Text>
              <Text style={styles.plusTourText}>
                Curated narrated tours + build your own adventure
              </Text>
            </View>

            <View style={styles.plusTourArrow}>
              <Ionicons
                name="chevron-forward"
                size={24}
                color={colors.gold}
              />
            </View>
          </Pressable>
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
  plusTourCard: {
    minHeight: 106,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#D4A94A',
    borderRadius: 18,
    backgroundColor: '#27163A',
    padding: spacing.md,
  },
  plusTourCardPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  plusTourIconShell: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 122, 0.52)',
    borderRadius: 29,
    backgroundColor: '#3B2455',
  },
  plusTourEmoji: {
    fontSize: 30,
    lineHeight: 34,
  },
  plusTourCopy: {
    flex: 1,
    gap: 2,
  },
  plusTourEyebrow: {
    ...typography.eyebrow,
    color: colors.gold,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  plusTourTitle: {
    ...typography.title,
    color: colors.text,
    fontSize: 21,
    lineHeight: 26,
  },
  plusTourText: {
    ...typography.caption,
    color: '#E6DDF0',
    fontSize: 12,
    lineHeight: 17,
  },
  plusTourArrow: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255, 215, 128, 0.08)',
  },
});
