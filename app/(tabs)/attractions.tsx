import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import type { ComponentProps } from 'react';
import { useCallback, useMemo, useState } from 'react';
import {
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AttractionCard } from '@/components/attractions/AttractionCard';
import { useAttractions } from '@/components/attractions/AttractionsProvider';
import { FeaturedAttractionCard } from '@/components/attractions/FeaturedAttractionCard';
import { useFavorites } from '@/components/favorites/FavoritesProvider';
import { attractionCategories } from '@/data/attractions';
import { colors, radius, spacing, typography } from '@/theme/tokens';

const headerImage = require('../../assets/images/home/attractions.png');

type CategoryIcon = ComponentProps<typeof Ionicons>['name'];

const categoryIcons: Record<(typeof attractionCategories)[number], CategoryIcon> = {
  All: 'sparkles',
  Historic: 'business',
  Museums: 'book',
  Family: 'people',
  Waterfront: 'boat',
  Landmarks: 'location',
  Tours: 'compass',
};

export default function AttractionsScreen() {
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<(typeof attractionCategories)[number]>('All');
  const { isFavorite, toggleFavorite } = useFavorites();
  const { attractions, ready, refresh } = useAttractions();

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  const featured = attractions.find((attraction) => attraction.featured);
  const gridCardWidth = Math.floor((width - spacing.lg * 2 - spacing.sm) / 2);
  const visibleAttractions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return attractions.filter((attraction) => {
      if (featured && attraction.id === featured.id) return false;
      const matchesCategory = category === 'All' || attraction.category === category || attraction.tags.includes(category);
      const matchesQuery =
        normalizedQuery.length === 0 ||
        attraction.name.toLowerCase().includes(normalizedQuery) ||
        attraction.description.toLowerCase().includes(normalizedQuery) ||
        attraction.category.toLowerCase().includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [attractions, category, featured, query]);

  const openDetails = (id: string) => {
    router.push({ pathname: '/attractions/[id]', params: { id } });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <ImageBackground source={headerImage} resizeMode="cover" style={styles.hero} imageStyle={styles.heroImage}>
          <View style={styles.heroShade} />
          <View style={styles.heroTopRow}>
            <Pressable accessibilityRole="button" accessibilityLabel="Back to Home" hitSlop={10} onPress={() => router.back()} style={styles.circleButton}>
              <Ionicons name="chevron-back" size={26} color={colors.text} />
            </Pressable>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={styles.brand}>BROOMSTICK</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Open live map" hitSlop={10} onPress={() => router.push('/map')} style={styles.circleButton}>
              <Ionicons name="map-outline" size={22} color={colors.gold} />
            </Pressable>
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>Explore • Discover • Experience</Text>
            <Text style={styles.title}>Attractions</Text>
            <Text style={styles.subtitle}>History. Haunts. Hidden gems.</Text>
          </View>
        </ImageBackground>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={21} color={colors.textMuted} />
          <TextInput
            accessibilityLabel="Search attractions"
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            onChangeText={setQuery}
            placeholder="Search attractions or landmarks"
            placeholderTextColor="#8D8296"
            returnKeyType="search"
            style={styles.searchInput}
            value={query}
          />
          {query ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={8} onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView horizontal contentContainerStyle={styles.filters} showsHorizontalScrollIndicator={false}>
          {attractionCategories.map((item) => {
            const selected = category === item;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={item}
                onPress={() => setCategory(item)}
                style={[styles.filter, selected && styles.filterSelected]}
              >
                <Ionicons name={categoryIcons[item]} size={19} color={selected ? colors.gold : colors.textMuted} />
                <Text style={[styles.filterText, selected && styles.filterTextSelected]}>{item}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {featured ? (
          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <Ionicons name="sparkles" size={18} color={colors.gold} />
              <Text style={styles.sectionTitle}>Featured Attraction</Text>
              <View style={styles.headingLine} />
            </View>
            <FeaturedAttractionCard
              attraction={featured}
              favorite={isFavorite('attractions', featured.id)}
              onFavoritePress={() => toggleFavorite('attractions', featured.id)}
              onPress={() => openDetails(featured.id)}
            />
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <Ionicons name="sparkles" size={18} color={colors.gold} />
            <Text style={styles.sectionTitle}>Explore Salem Attractions</Text>
            <View style={styles.headingLine} />
          </View>

          {!ready ? (
            <View style={styles.emptyState}>
              <Ionicons name="hourglass-outline" size={32} color={colors.gold} />
              <Text style={styles.emptyTitle}>Loading attractions…</Text>
            </View>
          ) : visibleAttractions.length ? (
            <View style={styles.grid}>
              {visibleAttractions.map((attraction) => (
                <View key={attraction.id} style={[styles.gridItem, { width: gridCardWidth }]}>
                  <AttractionCard
                    attraction={attraction}
                    favorite={isFavorite('attractions', attraction.id)}
                    onFavoritePress={() => toggleFavorite('attractions', attraction.id)}
                    onPress={() => openDetails(attraction.id)}
                  />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={32} color={colors.gold} />
              <Text style={styles.emptyTitle}>No attractions found</Text>
              <Text style={styles.emptyText}>Try a different search or category.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md },
  hero: { height: 192, overflow: 'hidden', justifyContent: 'space-between', borderRadius: radius.lg, padding: spacing.md },
  heroImage: { borderRadius: radius.lg },
  heroShade: { position: 'absolute', inset: 0, backgroundColor: 'rgba(7, 4, 12, 0.5)' },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  circleButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, borderWidth: 1, borderColor: '#7B5931', backgroundColor: 'rgba(8, 6, 12, 0.78)' },
  brand: { ...typography.title, fontSize: 24, lineHeight: 30, textTransform: 'uppercase' },
  brandStar: { color: colors.gold, fontSize: 18 },
  heroCopy: { alignItems: 'center' },
  eyebrow: { ...typography.eyebrow, color: colors.text, fontSize: 9, letterSpacing: 1.35 },
  title: { ...typography.display, fontSize: 34, lineHeight: 40, marginTop: 2 },
  subtitle: { ...typography.body, color: '#EFE4D1', fontSize: 14, lineHeight: 19 },
  searchBar: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: '#1B1421', borderWidth: 1, borderColor: '#55405E', borderRadius: radius.pill, paddingHorizontal: spacing.lg },
  searchInput: { flex: 1, color: colors.text, fontSize: 15, paddingVertical: 12 },
  filters: { gap: spacing.sm, paddingVertical: 2, paddingRight: spacing.lg },
  filter: { minWidth: 72, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: radius.md, backgroundColor: '#17111D', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  filterSelected: { borderColor: colors.gold, backgroundColor: '#2A1C1B' },
  filterText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  filterTextSelected: { color: colors.gold },
  section: { gap: spacing.sm },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionTitle: { ...typography.title, fontSize: 20, lineHeight: 26 },
  headingLine: { flex: 1, height: 1, backgroundColor: '#6B4D27' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', columnGap: spacing.sm, rowGap: spacing.sm },
  gridItem: { flexShrink: 0 },
  emptyState: { alignItems: 'center', borderWidth: 1, borderColor: colors.borderSoft, borderRadius: radius.md, backgroundColor: colors.surface, padding: spacing.xxl },
  emptyTitle: { ...typography.heading, marginTop: spacing.sm },
  emptyText: { ...typography.caption, marginTop: spacing.xs },
});
