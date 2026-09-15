import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import type { ComponentProps } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { Alert, ImageBackground, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useFavorites } from '@/components/favorites/FavoritesProvider';
import { ParkingCard } from '@/components/parking/ParkingCard';
import { useParking } from '@/components/parking/ParkingProvider';
import {
  getParkingExternalMapUrl,
  parkingFilterOptions,
  type ParkingFilter,
} from '@/data/parking';
import { parkingMatchesFilter } from '@/services/parkingContentCore';
import { colors, radius, spacing, typography } from '@/theme/tokens';

const headerImage = require('../../assets/images/home/parking.png');

type FilterIcon = ComponentProps<typeof Ionicons>['name'];

const filterIcons: Record<ParkingFilter, FilterIcon> = {
  All: 'car',
  Garages: 'business',
  Lots: 'car-sport',
  Accessible: 'accessibility',
  'EV Charging': 'flash',
};

export default function ParkingScreen() {
  const [filter, setFilter] = useState<ParkingFilter>('All');
  const { isFavorite, toggleFavorite } = useFavorites();
  const { locations, ready, refresh } = useParking();
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  const featuredParking = locations.find((location) => location.featured && parkingMatchesFilter(location, filter));

  const visibleLocations = useMemo(
    () =>
      locations.filter((location) => {
        if (location.featured) return false;
        return parkingMatchesFilter(location, filter);
      }),
    [filter, locations],
  );

  const openDetails = (id: string) => {
    router.push({ pathname: '/parking/[id]', params: { id } });
  };

  const openMap = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Unable to open map', 'Please try again from your maps app.');
    }
  };

  const goBackHome = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ImageBackground
          imageStyle={styles.heroImage}
          resizeMode="cover"
          source={headerImage}
          style={styles.hero}
        >
          <View style={styles.heroShade} />
          <View style={styles.heroTopRow}>
            <Pressable
              accessibilityLabel="Back to Home"
              accessibilityRole="button"
              hitSlop={10}
              onPress={goBackHome}
              style={styles.circleButton}
            >
              <Ionicons color={colors.text} name="chevron-back" size={26} />
            </Pressable>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={styles.brand}>
              BROOMSTICK
            </Text>
            <Pressable
              accessibilityLabel="Open settings"
              accessibilityRole="button"
              hitSlop={10}
              onPress={() => router.push('/more')}
              style={styles.circleButton}
            >
              <Ionicons color={colors.text} name="settings-outline" size={21} />
            </Pressable>
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>Park • Explore • Discover Salem</Text>
            <Text style={styles.title}>Parking</Text>
            <Text style={styles.subtitle}>Practical places to park in Salem.</Text>
          </View>
        </ImageBackground>

        <ScrollView
          contentContainerStyle={styles.filters}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {parkingFilterOptions.map((item) => {
            const selected = filter === item;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={item}
                onPress={() => setFilter(item)}
                style={styles.filterItem}
              >
                <View style={[styles.filterIcon, selected && styles.filterIconSelected]}>
                  <Ionicons
                    color={selected ? colors.gold : colors.textMuted}
                    name={filterIcons[item]}
                    size={22}
                  />
                </View>
                <Text style={[styles.filterText, selected && styles.filterTextSelected]}>{item}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {featuredParking ? (
          <View style={styles.section}>
            <SectionHeading title="Featured Parking" />
            <ParkingCard
              featured
              favorite={isFavorite('parking', featuredParking.id)}
              location={featuredParking}
              onDirections={() => void openMap(getParkingExternalMapUrl(featuredParking, 'directions'))}
              onFavoritePress={() => toggleFavorite('parking', featuredParking.id)}
              onPress={() => openDetails(featuredParking.id)}
              onViewMap={() => void openMap(getParkingExternalMapUrl(featuredParking, 'map'))}
            />
          </View>
        ) : null}

        <View style={styles.noticeCard}>
          <View style={styles.noticeIcon}>
            <Ionicons color={colors.gold} name="information-circle" size={25} />
          </View>
          <View style={styles.noticeCopy}>
            <Text style={styles.noticeTitle}>Plan ahead</Text>
            <Text style={styles.noticeText}>
              Rates and restrictions can change during October, events, and snow emergencies. Check posted signs when you arrive.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeading title="Nearby Parking Options" />
          {!ready ? (
            <View style={styles.emptyState}>
              <Ionicons color="#70AEFF" name="hourglass-outline" size={32} />
              <Text style={styles.emptyTitle}>Loading parking…</Text>
            </View>
          ) : visibleLocations.length ? (
            <View style={styles.parkingList}>
              {visibleLocations.map((location) => (
                <ParkingCard
                  favorite={isFavorite('parking', location.id)}
                  key={location.id}
                  location={location}
                  onDirections={() => void openMap(getParkingExternalMapUrl(location, 'directions'))}
                  onFavoritePress={() => toggleFavorite('parking', location.id)}
                  onPress={() => openDetails(location.id)}
                  onViewMap={() => void openMap(getParkingExternalMapUrl(location, 'map'))}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons color="#70AEFF" name="car-outline" size={32} />
              <Text style={styles.emptyTitle}>{filter === 'All' ? featuredParking ? 'No other parking listed' : 'No parking listed' : 'No matching parking'}</Text>
              <Text style={styles.emptyText}>{filter === 'All' ? 'Check back as more locations are published.' : 'Try another parking filter.'}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeading}>
      <Ionicons color={colors.gold} name="sparkles" size={17} />
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.headingLine} />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md },
  hero: {
    height: 218,
    overflow: 'hidden',
    justifyContent: 'space-between',
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  heroImage: { borderRadius: radius.lg },
  heroShade: { position: 'absolute', inset: 0, backgroundColor: 'rgba(7, 4, 12, 0.42)' },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  circleButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#6D553D',
    backgroundColor: 'rgba(8, 6, 12, 0.78)',
  },
  brand: {
    ...typography.title,
    fontSize: 24,
    lineHeight: 30,
    textTransform: 'uppercase',
    textShadowColor: colors.black,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  brandStar: { color: colors.gold, fontSize: 18 },
  heroCopy: { alignItems: 'center' },
  eyebrow: { ...typography.eyebrow, color: colors.text, fontSize: 9, letterSpacing: 1.35 },
  title: { ...typography.display, fontSize: 38, lineHeight: 44 },
  subtitle: { ...typography.body, color: '#EFE4D1', fontSize: 14, lineHeight: 19 },
  filters: { gap: spacing.md, paddingVertical: spacing.xs, paddingRight: spacing.lg },
  filterItem: { minWidth: 66, alignItems: 'center', gap: 5 },
  filterIcon: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: '#17131D',
  },
  filterIconSelected: { borderColor: colors.gold, backgroundColor: '#2A2117' },
  filterText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  filterTextSelected: { color: colors.gold },
  section: { gap: spacing.sm },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionTitle: { ...typography.title, fontSize: 20, lineHeight: 26 },
  headingLine: { flex: 1, height: 1, backgroundColor: '#6B4D27' },
  parkingList: { gap: spacing.md },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#11121B',
    borderWidth: 1,
    borderColor: '#4A5570',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  noticeIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: '#2D2416',
  },
  noticeCopy: { flex: 1 },
  noticeTitle: { color: colors.gold, fontSize: 13, fontWeight: '900', textTransform: 'uppercase' },
  noticeText: { ...typography.caption, fontSize: 11.5, lineHeight: 16, marginTop: 2 },
  emptyState: {
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.xxl,
  },
  emptyTitle: { ...typography.heading, marginTop: spacing.sm },
  emptyText: { ...typography.caption, marginTop: spacing.xs },
});
