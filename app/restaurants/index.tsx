import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { useMemo, useState } from 'react';
import {
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useFavorites } from '@/components/favorites/FavoritesProvider';
import { RestaurantCard } from '@/components/restaurants/RestaurantCard';
import {
  restaurantCategories,
  restaurants,
  type RestaurantCategory,
} from '@/data/restaurants';
import { colors, radius, spacing, typography } from '@/theme/tokens';

const headerImage = require('../../assets/images/home/restaurants.png');

type CategoryIcon = ComponentProps<typeof Ionicons>['name'];

const categoryIcons: Record<'All' | RestaurantCategory, CategoryIcon> = {
  All: 'restaurant',
  Pizza: 'pizza',
  Seafood: 'fish',
  American: 'fast-food',
  Coffee: 'cafe',
  Breakfast: 'sunny',
  Pub: 'beer',
  Family: 'people',
};

export default function RestaurantsScreen() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'All' | RestaurantCategory>('All');
  const { isFavorite, toggleFavorite } = useFavorites();

  const visibleRestaurants = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return restaurants.filter((restaurant) => {
      const matchesCategory =
        category === 'All' ||
        restaurant.category === category ||
        restaurant.tags.includes(category);
      const searchableText = [
        restaurant.name,
        restaurant.cuisine,
        restaurant.description,
        restaurant.address,
        ...restaurant.tags,
      ]
        .join(' ')
        .toLowerCase();

      return matchesCategory && (!normalizedQuery || searchableText.includes(normalizedQuery));
    });
  }, [category, query]);

  const openDetails = (id: string) => {
    router.push({ pathname: '/restaurants/[id]', params: { id } });
  };

  const goBackHome = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <ImageBackground
          source={headerImage}
          resizeMode="cover"
          style={styles.hero}
          imageStyle={styles.heroImage}
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
              <Ionicons name="chevron-back" size={26} color={colors.text} />
            </Pressable>
            <Text style={styles.brand}>
              Witch <Text style={styles.brandStar}>✦</Text> Walk
            </Text>
            <Pressable
              accessibilityLabel="Open live map"
              accessibilityRole="button"
              hitSlop={10}
              onPress={() => router.push('/map')}
              style={styles.circleButton}
            >
              <Ionicons name="map-outline" size={22} color={colors.gold} />
            </Pressable>
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>Explore • Discover • Experience</Text>
            <Text style={styles.title}>Restaurants</Text>
            <Text style={styles.subtitle}>Great food. Historic vibes.</Text>
          </View>
        </ImageBackground>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={21} color={colors.textMuted} />
          <TextInput
            accessibilityLabel="Search restaurants"
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            onChangeText={setQuery}
            placeholder="Search restaurants, cuisine, or location"
            placeholderTextColor="#8D8296"
            returnKeyType="search"
            style={styles.searchInput}
            value={query}
          />
          {query ? (
            <Pressable
              accessibilityLabel="Clear search"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => setQuery('')}
            >
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          horizontal
          contentContainerStyle={styles.filters}
          showsHorizontalScrollIndicator={false}
        >
          {restaurantCategories.map((item) => {
            const selected = category === item;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={item}
                onPress={() => setCategory(item)}
                style={styles.filterItem}
              >
                <View style={[styles.filterIcon, selected && styles.filterIconSelected]}>
                  <Ionicons
                    name={categoryIcons[item]}
                    size={22}
                    color={selected ? colors.gold : colors.textMuted}
                  />
                </View>
                <Text style={[styles.filterText, selected && styles.filterTextSelected]}>{item}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.sectionHeading}>
          <Ionicons name="sparkles" size={18} color={colors.gold} />
          <Text style={styles.sectionTitle}>Featured Restaurants</Text>
          <View style={styles.headingLine} />
        </View>

        {visibleRestaurants.length ? (
          <View style={styles.restaurantList}>
            {visibleRestaurants.map((restaurant) => (
              <RestaurantCard
                favorite={isFavorite('restaurants', restaurant.id)}
                key={restaurant.id}
                onFavoritePress={() => toggleFavorite('restaurants', restaurant.id)}
                onPress={() => openDetails(restaurant.id)}
                restaurant={restaurant}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={32} color={colors.gold} />
            <Text style={styles.emptyTitle}>No restaurants found</Text>
            <Text style={styles.emptyText}>Try a different search or cuisine.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  hero: {
    height: 202,
    overflow: 'hidden',
    justifyContent: 'space-between',
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  heroImage: { borderRadius: radius.lg },
  heroShade: { position: 'absolute', inset: 0, backgroundColor: 'rgba(7, 4, 12, 0.48)' },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  circleButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#7B5931',
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
  title: { ...typography.display, fontSize: 34, lineHeight: 40, marginTop: 2 },
  subtitle: { ...typography.body, color: '#EFE4D1', fontSize: 14, lineHeight: 19 },
  searchBar: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#1B1421',
    borderWidth: 1,
    borderColor: '#55405E',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 15, paddingVertical: 12 },
  filters: { gap: spacing.md, paddingVertical: spacing.xs, paddingRight: spacing.lg },
  filterItem: { minWidth: 58, alignItems: 'center', gap: 5 },
  filterIcon: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: '#18131D',
  },
  filterIconSelected: { borderColor: colors.gold, backgroundColor: '#2A1C1B' },
  filterText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  filterTextSelected: { color: colors.gold },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionTitle: { ...typography.title, fontSize: 20, lineHeight: 26 },
  headingLine: { flex: 1, height: 1, backgroundColor: '#6B4D27' },
  restaurantList: { gap: spacing.md },
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
