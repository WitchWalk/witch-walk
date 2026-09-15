import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FavoriteCard } from '@/components/favorites/FavoriteCard';
import { useAttractions } from '@/components/attractions/AttractionsProvider';
import { useRestaurants } from '@/components/restaurants/RestaurantsProvider';
import { useParking } from '@/components/parking/ParkingProvider';
import { useBathrooms } from '@/components/bathrooms/BathroomsProvider';
import { useFavorites } from '@/components/favorites/FavoritesProvider';
import {
  favoriteFilters,
  filterFavoriteLocations,
  resolveFavoriteLocation,
  type FavoriteLocation,
} from '@/data/favoriteLocations';
import type { FavoriteCategory } from '@/services/favoritesCore';
import { colors, radius, spacing, typography } from '@/theme/tokens';

const heroImage = require('../../assets/images/home/events.png');
type FavoriteFilter = 'all' | FavoriteCategory;

export default function FavoritesScreen() {
  const [filter, setFilter] = useState<FavoriteFilter>('all');
  const { favoriteReferences, ready, toggleFavorite } = useFavorites();
  const { attractions, ready: attractionsReady } = useAttractions();
  const { restaurants, ready: restaurantsReady } = useRestaurants();
  const { locations: parkingLocations, ready: parkingReady } = useParking();
  const { locations: bathroomLocations, ready: bathroomsReady } = useBathrooms();

  const savedLocations = useMemo(() => filterFavoriteLocations(
    favoriteReferences
      .map((reference) => resolveFavoriteLocation(reference, attractions, restaurants, parkingLocations, bathroomLocations))
      .filter((location): location is FavoriteLocation => Boolean(location)),
    filter,
  ),
  [attractions, favoriteReferences, filter, restaurants, parkingLocations, bathroomLocations]);

  const openDetails = (location: FavoriteLocation) => {
    if (location.category === 'attractions') router.push({ pathname: '/attractions/[id]', params: { id: location.id } });
    else if (location.category === 'restaurants') router.push({ pathname: '/restaurants/[id]', params: { id: location.id } });
    else if (location.category === 'parking') router.push({ pathname: '/parking/[id]', params: { id: location.id } });
    else router.push({ pathname: '/bathrooms/[id]', params: { id: location.id } });
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ImageBackground imageStyle={styles.heroImage} resizeMode="cover" source={heroImage} style={styles.hero}>
          <View style={styles.heroShade} />
          <View style={styles.brandRow}>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={styles.brand}>BROOMSTICK</Text>
            <Ionicons color={colors.gold} name="heart" size={24} />
          </View>
          <View>
            <Text style={styles.title}>Favorites</Text>
            <Text style={styles.subtitle}>Your saved places in Salem.</Text>
          </View>
        </ImageBackground>

        <ScrollView contentContainerStyle={styles.filters} horizontal showsHorizontalScrollIndicator={false}>
          {favoriteFilters.map((item) => {
            const selected = filter === item.id;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={item.id}
                onPress={() => setFilter(item.id)}
                style={[styles.filter, selected && styles.filterSelected]}
              >
                <FilterIcon category={item.id} selected={selected} />
                <Text style={[styles.filterText, selected && styles.filterTextSelected]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {!ready || !attractionsReady || !restaurantsReady || !parkingReady || !bathroomsReady ? (
          <View style={styles.emptyState}>
            <Ionicons color={colors.gold} name="heart-outline" size={42} />
            <Text style={styles.emptyTitle}>Loading favorites…</Text>
          </View>
        ) : savedLocations.length ? (
          <View style={styles.list}>
            {savedLocations.map((location) => (
              <FavoriteCard
                key={`${location.category}:${location.id}`}
                location={location}
                onRemove={() => toggleFavorite(location.category, location.id)}
                onViewDetails={() => openDetails(location)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons color="#F18BA3" name="heart-outline" size={42} />
            </View>
            <Text style={styles.emptyTitle}>{filter === 'all' ? 'No favorites yet' : `No saved ${favoriteFilters.find((item) => item.id === filter)?.label.toLowerCase()}`}</Text>
            <Text style={styles.emptyText}>Tap the heart on places you want to save.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function FilterIcon({ category, selected }: { category: FavoriteFilter; selected: boolean }) {
  const color = selected ? colors.black : colors.textMuted;
  if (category === 'bathrooms') return <MaterialCommunityIcons color={color} name="toilet" size={17} />;
  const icon = category === 'all' ? 'sparkles' : category === 'attractions' ? 'location' : category === 'restaurants' ? 'restaurant' : 'car-sport';
  return <Ionicons color={color} name={icon} size={17} />;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md },
  hero: { height: 228, overflow: 'hidden', justifyContent: 'space-between', borderRadius: radius.lg, padding: spacing.lg },
  heroImage: { borderRadius: radius.lg },
  heroShade: { position: 'absolute', inset: 0, backgroundColor: 'rgba(5,3,9,0.48)' },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { ...typography.title, fontSize: 25, lineHeight: 30, textTransform: 'uppercase' },
  brandStar: { color: colors.gold, fontSize: 18 },
  title: { ...typography.display, fontSize: 43, lineHeight: 48 },
  subtitle: { ...typography.body, color: '#F1E7DA', fontSize: 16 },
  filters: { gap: spacing.sm, paddingRight: spacing.lg },
  filter: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#54465E', borderRadius: radius.pill, backgroundColor: '#121017', paddingHorizontal: spacing.md },
  filterSelected: { borderColor: colors.gold, backgroundColor: '#FFD27B' },
  filterText: { color: colors.textMuted, fontSize: 11.5, fontWeight: '800' },
  filterTextSelected: { color: colors.black },
  list: { gap: spacing.sm },
  emptyState: { minHeight: 260, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderSoft, borderRadius: radius.lg, backgroundColor: '#100C16', padding: spacing.xl },
  emptyIcon: { width: 76, height: 76, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, backgroundColor: '#281625' },
  emptyTitle: { ...typography.title, marginTop: spacing.md, fontSize: 22, lineHeight: 27, textAlign: 'center' },
  emptyText: { ...typography.body, color: colors.textMuted, marginTop: spacing.sm, fontSize: 14, textAlign: 'center' },
});
