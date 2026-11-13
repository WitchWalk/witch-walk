import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText as Text, AppTextInput as TextInput } from '@/components/AppText';
import { useFavorites } from '@/components/favorites/FavoritesProvider';
import {
  loadPublishedHotels,
  type Hotel,
} from '@/services/hotelContentRepository';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export default function HotelsScreen() {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [query, setQuery] = useState('');
  const [ready, setReady] = useState(false);
  const { isFavorite, toggleFavorite } = useFavorites();

  const refresh = useCallback(async () => {
    const next = await loadPublishedHotels();
    setHotels(next);
    setReady(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const visibleHotels = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) return hotels;

    return hotels.filter((hotel) =>
      [
        hotel.name,
        hotel.address ?? '',
        hotel.shortDescription,
        hotel.fullDescription,
        ...hotel.amenities,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalized),
    );
  }, [hotels, query]);

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
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Back to Home"
            accessibilityRole="button"
            onPress={goBackHome}
            style={styles.circleButton}
          >
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </Pressable>

          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>STAY IN SALEM</Text>
            <Text style={styles.title}>Hotels</Text>
            <Text style={styles.subtitle}>
              Hotels and inns near the places you came to see.
            </Text>
          </View>

          <Pressable
            accessibilityLabel="Open live map"
            accessibilityRole="button"
            onPress={() => router.push('/map')}
            style={styles.circleButton}
          >
            <Ionicons name="map-outline" size={22} color={colors.gold} />
          </Pressable>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={21} color={colors.textMuted} />
          <TextInput
            accessibilityLabel="Search hotels"
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            onChangeText={setQuery}
            placeholder="Search hotels, amenities, or location"
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

        <View style={styles.sectionHeading}>
          <Ionicons name="bed" size={19} color={colors.gold} />
          <Text style={styles.sectionTitle}>
            {visibleHotels.some((hotel) => hotel.featured)
              ? 'Featured Stays'
              : 'Places to Stay'}
          </Text>
          <View style={styles.rule} />
        </View>

        {!ready ? (
          <View style={styles.emptyCard}>
            <Ionicons name="hourglass-outline" size={30} color={colors.gold} />
            <Text style={styles.emptyTitle}>Loading hotels…</Text>
          </View>
        ) : visibleHotels.length ? (
          <View style={styles.list}>
            {visibleHotels.map((hotel) => (
              <Pressable
                accessibilityRole="button"
                key={hotel.id}
                onPress={() =>
                  router.push({
                    pathname: '/hotels/[id]',
                    params: { id: hotel.id },
                  })
                }
                style={({ pressed }) => [
                  styles.card,
                  pressed && styles.pressed,
                ]}
              >
                {hotel.imageUrl ? (
                  <Image
                    source={{ uri: hotel.imageUrl }}
                    resizeMode="cover"
                    style={styles.image}
                  />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons
                      name="bed"
                      size={38}
                      color={colors.gold}
                    />
                  </View>
                )}

                <View style={styles.cardCopy}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardTitle}>
                      {hotel.name}
                    </Text>
                    {hotel.featured ? (
                      <View style={styles.featuredPill}>
                        <Text style={styles.featuredText}>
                          FEATURED
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {hotel.address ? (
                    <Text style={styles.address}>
                      {hotel.address}
                    </Text>
                  ) : null}

                  {hotel.shortDescription ? (
                    <Text
                      numberOfLines={3}
                      style={styles.description}
                    >
                      {hotel.shortDescription}
                    </Text>
                  ) : null}

                  <View style={styles.badges}>
                    {hotel.parkingAvailable ? (
                      <View style={styles.badge}>
                        <Ionicons
                          name="car-outline"
                          size={14}
                          color={colors.gold}
                        />
                        <Text style={styles.badgeText}>Parking</Text>
                      </View>
                    ) : null}

                    {hotel.petFriendly ? (
                      <View style={styles.badge}>
                        <Ionicons
                          name="paw-outline"
                          size={14}
                          color={colors.gold}
                        />
                        <Text style={styles.badgeText}>Pet friendly</Text>
                      </View>
                    ) : null}

                    {hotel.familyFriendly ? (
                      <View style={styles.badge}>
                        <Ionicons
                          name="people-outline"
                          size={14}
                          color={colors.gold}
                        />
                        <Text style={styles.badgeText}>Family friendly</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                <Pressable
                  accessibilityLabel={
                    isFavorite('hotels', hotel.id)
                      ? `Remove ${hotel.name} from favorites`
                      : `Save ${hotel.name} to favorites`
                  }
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={(event) => {
                    event.stopPropagation();
                    toggleFavorite('hotels', hotel.id);
                  }}
                  style={styles.favoriteButton}
                >
                  <Ionicons
                    name={
                      isFavorite('hotels', hotel.id)
                        ? 'heart'
                        : 'heart-outline'
                    }
                    size={24}
                    color={
                      isFavorite('hotels', hotel.id)
                        ? '#FF5C68'
                        : colors.textMuted
                    }
                  />
                </Pressable>

                <Ionicons
                  name="chevron-forward"
                  size={22}
                  color={colors.textMuted}
                />
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="search-outline" size={30} color={colors.gold} />
            <Text style={styles.emptyTitle}>No hotels found</Text>
            <Text style={styles.emptyText}>
              Try another search.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
  },
  circleButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  eyebrow: {
    ...typography.eyebrow,
    color: colors.gold,
  },
  title: {
    ...typography.display,
    fontSize: 34,
    lineHeight: 40,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: 3,
  },
  searchBar: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: '#55405E',
    borderRadius: radius.pill,
    backgroundColor: '#1B1421',
    paddingHorizontal: spacing.lg,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    paddingVertical: 12,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.title,
    fontSize: 20,
    lineHeight: 26,
  },
  rule: {
    flex: 1,
    height: 1,
    backgroundColor: '#6B4D27',
  },
  list: {
    gap: spacing.md,
  },
  card: {
    minHeight: 118,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
    padding: spacing.md,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }],
  },
  favoriteButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: 88,
    height: 88,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  imagePlaceholder: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: '#21172B',
  },
  cardCopy: {
    flex: 1,
    gap: 4,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.heading,
    flexShrink: 1,
    fontSize: 17,
    lineHeight: 22,
  },
  featuredPill: {
    borderRadius: radius.pill,
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  featuredText: {
    ...typography.caption,
    color: colors.background,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '900',
  },
  address: {
    ...typography.caption,
    color: colors.gold,
  },
  description: {
    ...typography.caption,
    color: colors.textMuted,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.pill,
    backgroundColor: '#21172B',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  badgeText: {
    ...typography.caption,
    color: colors.text,
    fontSize: 10.5,
    lineHeight: 13,
    fontWeight: '700',
  },
  emptyCard: {
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.xxl,
  },
  emptyTitle: {
    ...typography.heading,
  },
  emptyText: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
