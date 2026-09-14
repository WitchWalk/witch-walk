import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { useMemo, useState } from 'react';
import { Alert, ImageBackground, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BathroomCard } from '@/components/bathrooms/BathroomCard';
import { RestroomMap } from '@/components/bathrooms/RestroomMap';
import { useFavorites } from '@/components/favorites/FavoritesProvider';
import {
  bathroomFilters,
  getBathroomMapDestination,
  getBathroomOperatingStatus,
  getVisibleBathroomLocations,
  sortBathroomsForDiscovery,
  type BathroomFilter,
  type BathroomLocation,
} from '@/data/bathrooms';
import { colors, radius, spacing, typography } from '@/theme/tokens';

const headerImage = require('../../assets/images/home/bathrooms.png');

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const filterIcons: Record<BathroomFilter, IoniconName> = {
  All: 'sparkles',
  Permanent: 'business-outline',
  Seasonal: 'calendar-outline',
  Accessible: 'accessibility',
  'Open Now': 'time-outline',
};

export default function BathroomsScreen() {
  const [filter, setFilter] = useState<BathroomFilter>('All');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const { isFavorite, toggleFavorite } = useFavorites();

  const visibleBathrooms = useMemo(() => {
    const filtered = getVisibleBathroomLocations().filter((location) => {
      if (filter === 'All') return true;
      if (filter === 'Permanent') return location.restroomCategory === 'permanent';
      if (filter === 'Seasonal') return location.restroomCategory === 'seasonal_public';
      if (filter === 'Accessible') return location.accessible === true;
      return getBathroomOperatingStatus(location).kind === 'open';
    });

    return sortBathroomsForDiscovery(filtered);
  }, [filter]);

  const openDetails = (id: string) => {
    router.push({ pathname: '/bathrooms/[id]', params: { id } });
  };

  const openDirections = async (location: BathroomLocation) => {
    const query = encodeURIComponent(getBathroomMapDestination(location));
    try {
      await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
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
              accessibilityLabel="Open live map"
              accessibilityRole="button"
              hitSlop={10}
              onPress={() => router.push('/map')}
              style={styles.circleButton}
            >
              <Ionicons color={colors.gold} name="map-outline" size={22} />
            </Pressable>
          </View>
          <View style={styles.heroCopy}>
            <MaterialCommunityIcons color="#F4D46C" name="toilet" size={30} />
            <Text style={styles.title}>Bathrooms</Text>
            <Text style={styles.subtitle}>Find nearby public restrooms in Salem.</Text>
          </View>
        </ImageBackground>

        <ScrollView
          contentContainerStyle={styles.filters}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {bathroomFilters.map((item) => {
            const selected = filter === item;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={item}
                onPress={() => setFilter(item)}
                style={[styles.filterItem, selected && styles.filterItemSelected]}
              >
                <Ionicons
                  color={selected ? colors.gold : '#AEB6CE'}
                  name={filterIcons[item]}
                  size={20}
                />
                <Text style={[styles.filterText, selected && styles.filterTextSelected]}>{item}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.viewToggle}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: viewMode === 'list' }}
            onPress={() => setViewMode('list')}
            style={[styles.viewToggleButton, viewMode === 'list' && styles.viewToggleButtonSelected]}
          >
            <Ionicons color={viewMode === 'list' ? colors.black : colors.textMuted} name="list" size={18} />
            <Text style={[styles.viewToggleText, viewMode === 'list' && styles.viewToggleTextSelected]}>List</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: viewMode === 'map' }}
            onPress={() => setViewMode('map')}
            style={[styles.viewToggleButton, viewMode === 'map' && styles.viewToggleButtonSelected]}
          >
            <Ionicons color={viewMode === 'map' ? colors.black : colors.textMuted} name="map" size={18} />
            <Text style={[styles.viewToggleText, viewMode === 'map' && styles.viewToggleTextSelected]}>Map</Text>
          </Pressable>
        </View>

        <View style={styles.tipCard}>
          <View style={styles.tipIcon}>
            <Ionicons color={colors.gold} name="bulb" size={24} />
          </View>
          <View style={styles.tipCopy}>
            <Text style={styles.tipTitle}>Bathroom Tip</Text>
            <Text style={styles.tipText}>
              Public restrooms can get busy in October. Check nearby options before crossing downtown.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <Ionicons color={colors.gold} name="sparkles" size={17} />
            <Text style={styles.sectionTitle}>Nearby Bathrooms</Text>
            <View style={styles.headingLine} />
            <Text style={styles.sortText}>Distance</Text>
          </View>

          {visibleBathrooms.length && viewMode === 'list' ? (
            <View style={styles.bathroomList}>
              {visibleBathrooms.map((location) => (
                <BathroomCard
                  favorite={isFavorite('bathrooms', location.id)}
                  key={location.id}
                  location={location}
                  onDirections={() => void openDirections(location)}
                  onFavoritePress={() => toggleFavorite('bathrooms', location.id)}
                  onPress={() => openDetails(location.id)}
                />
              ))}
            </View>
          ) : visibleBathrooms.length && viewMode === 'map' ? (
            <RestroomMap
              locations={visibleBathrooms}
              onDirections={(location) => void openDirections(location)}
              onViewDetails={(location) => openDetails(location.id)}
            />
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons color="#F4D46C" name="toilet" size={34} />
              <Text style={styles.emptyTitle}>No matching bathrooms</Text>
              <Text style={styles.emptyText}>Try another restroom filter.</Text>
            </View>
          )}
        </View>

        <Text style={styles.sampleNote}>
          Hours may change. Verify posted information when you arrive. Last data review: September 10, 2026.
        </Text>
      </ScrollView>
    </SafeAreaView>
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
    borderWidth: 1,
    borderColor: '#6D553D',
    borderRadius: radius.pill,
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
  title: { ...typography.display, fontSize: 38, lineHeight: 43, marginTop: -3 },
  subtitle: { ...typography.body, color: '#EFE4D1', fontSize: 14, lineHeight: 19, textAlign: 'center' },
  filters: { gap: spacing.sm, paddingVertical: spacing.xs, paddingRight: spacing.lg },
  filterItem: {
    minWidth: 82,
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: '#46516B',
    borderRadius: radius.md,
    backgroundColor: '#11131D',
    paddingHorizontal: spacing.md,
  },
  filterItemSelected: { borderColor: colors.gold, backgroundColor: '#2A2117' },
  filterText: { color: colors.textMuted, fontSize: 11, fontWeight: '800' },
  filterTextSelected: { color: colors.gold },
  viewToggle: {
    flexDirection: 'row',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#4D3D5F',
    borderRadius: radius.pill,
    backgroundColor: '#11101A',
    padding: 3,
  },
  viewToggleButton: {
    minWidth: 108,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
  },
  viewToggleButtonSelected: { backgroundColor: colors.gold },
  viewToggleText: { color: colors.textMuted, fontSize: 12, fontWeight: '900' },
  viewToggleTextSelected: { color: colors.black },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: '#9257B5',
    borderRadius: radius.md,
    backgroundColor: '#111622',
    padding: spacing.md,
  },
  tipIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: '#2D2416',
  },
  tipCopy: { flex: 1 },
  tipTitle: { ...typography.title, color: colors.orange, fontSize: 18, lineHeight: 22 },
  tipText: { ...typography.caption, color: '#E8E0E9', fontSize: 11.5, lineHeight: 16, marginTop: 2 },
  section: { gap: spacing.sm },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionTitle: { ...typography.title, fontSize: 20, lineHeight: 26 },
  headingLine: { flex: 1, minWidth: 8, height: 1, backgroundColor: '#6B4D27' },
  sortText: { color: '#AEB6CE', fontSize: 10.5, fontWeight: '800' },
  bathroomList: { gap: spacing.md },
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
  sampleNote: { ...typography.caption, fontSize: 10.5, lineHeight: 15, textAlign: 'center' },
});
