import { Ionicons } from '@expo/vector-icons';
import {
  router,
  useFocusEffect,
  type Href,
} from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { AppText as Text } from '@/components/AppText';
import { useFavorites } from '@/components/favorites/FavoritesProvider';
import { usePlus } from '@/components/plus/PlusProvider';
import { Screen } from '@/components/Screen';
import {
  listPublishedCuratedTours,
  type CuratedTourSummary,
} from '@/services/curatedTours';
import {
  listCachedCuratedTours,
} from '@/services/tourOffline';
import {
  colors,
  radius,
  spacing,
  typography,
} from '@/theme/tokens';

const toursHero = require('../assets/images/home/attractions.png');

export default function ToursScreen() {
  const [tours, setTours] = useState<CuratedTourSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { isFavorite, toggleFavorite } = useFavorites();
  const { hasPlus, ready: plusReady } = usePlus();

  useFocusEffect(
    useCallback(() => {
      let active = true;

      setLoading(true);
      setError('');

      void (async () => {
        const cached =
          await listCachedCuratedTours();

        if (!active) {
          return;
        }

        if (cached.length) {
          setTours(cached);
          setLoading(false);
        }

        try {
          const live =
            await listPublishedCuratedTours();

          if (!active) {
            return;
          }

          if (live.length) {
            const merged = new Map(
              cached.map((tour) => [
                tour.id,
                tour as CuratedTourSummary,
              ]),
            );

            for (const tour of live) {
              merged.set(tour.id, tour);
            }

            setTours(Array.from(merged.values()));
          } else if (!cached.length) {
            setTours([]);
          }
        } catch {
          if (active && !cached.length) {
            setError(
              'BROOMSTICK could not load the tour library.',
            );
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      })();

      return () => {
        active = false;
      };
    }, []),
  );

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <View style={styles.heroArtworkShell}>
        <Image
          source={toursHero}
          resizeMode="cover"
          style={styles.heroArtwork}
        />
      </View>

      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons
            name="chevron-back"
            size={25}
            color={colors.text}
          />
        </Pressable>

        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>
            BROOMSTICK PLUS
          </Text>
          <Text style={styles.title}>
            Salem Tours
          </Text>
          <Text style={styles.subtitle}>
            Pick a curated narrated tour or build your own.
          </Text>
        </View>
      </View>

      <View style={styles.readyMadeHeader}>
        <Text style={styles.readyMadeEyebrow}>READY-MADE TOURS</Text>
        <Text style={styles.readyMadeTitle}>Choose a Salem tour</Text>
        <Text style={styles.readyMadeText}>
          Pick one of our curated narrated tours below, or build your own route.
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() =>
          router.push(
            hasPlus
              ? '/build-my-tour'
              : '/broomstick-plus',
          )
        }
        style={styles.builderCard}
      >
        <View style={styles.builderIcon}>
          <Ionicons
            name="options"
            size={24}
            color={colors.background}
          />
        </View>

        <View style={styles.builderCopy}>
          <View style={styles.builderTitleRow}>
            <Text style={styles.builderTitle}>
              Build My Own Tour
            </Text>
            {plusReady && !hasPlus ? (
              <View style={styles.lockPill}>
                <Ionicons name="lock-closed" size={12} color={colors.background} />
                <Text style={styles.lockPillText}>PLUS</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.builderText}>
            Choose your stops and let BROOMSTICK route them.
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={20}
          color={colors.gold}
        />
      </Pressable>

      {loading ? (
        <View style={styles.emptyCard}>
          <Text style={styles.muted}>
            Loading curated tours…
          </Text>
        </View>
      ) : error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : tours.length ? (
        <View style={styles.list}>
          {tours.map((tour) => (
            <Pressable
              accessibilityRole="button"
              key={tour.id}
              onPress={() =>
                router.push(
                  `/tours/${encodeURIComponent(tour.id)}` as Href,
                )
              }
              style={styles.tourCard}
            >
              <View style={styles.tourImageShell}>
                <Image
                  source={
                    tour.coverImageUrl
                      ? { uri: tour.coverImageUrl }
                      : toursHero
                  }
                  resizeMode="cover"
                  style={styles.tourImage}
                />

                <View style={styles.imageShade} />

                <View style={styles.tourImageTopRow}>
                  <View style={styles.premiumPill}>
                    <Ionicons
                      name="sparkles"
                      size={13}
                      color={colors.background}
                    />
                    <Text style={styles.premiumPillText}>
                      BROOMSTICK PLUS
                    </Text>
                  </View>

                  <Pressable
                    accessibilityLabel={
                      isFavorite('tours', tour.id)
                        ? `Remove ${tour.name} from favorites`
                        : `Save ${tour.name} to favorites`
                    }
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={(event) => {
                      event.stopPropagation();
                      toggleFavorite('tours', tour.id);
                    }}
                    style={styles.favoriteButtonPremium}
                  >
                    <Ionicons
                      name={
                        isFavorite('tours', tour.id)
                          ? 'heart'
                          : 'heart-outline'
                      }
                      size={22}
                      color={
                        isFavorite('tours', tour.id)
                          ? '#FF6672'
                          : '#FFFFFF'
                      }
                    />
                  </Pressable>
                </View>

                <View style={styles.imageBottomRow}>
                  <View style={styles.modePillPremium}>
                    <Ionicons
                      name={
                        tour.tourMode === 'driving'
                          ? 'car'
                          : tour.tourMode === 'mixed'
                            ? 'navigate'
                            : 'walk'
                      }
                      size={14}
                      color={colors.gold}
                    />
                    <Text style={styles.modeTextPremium}>
                      {tour.tourMode === 'mixed'
                        ? 'Walking + Driving'
                        : tour.tourMode === 'driving'
                          ? 'Driving Tour'
                          : 'Walking Tour'}
                    </Text>
                  </View>

                  {tour.featured ? (
                    <View style={styles.featuredPill}>
                      <Ionicons
                        name="star"
                        size={12}
                        color={colors.gold}
                      />
                      <Text style={styles.featuredPillText}>
                        FEATURED
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <View style={styles.tourCardBody}>
                <View style={styles.tourTitleRow}>
                  <Text style={styles.tourTitle}>
                    {tour.name}
                  </Text>

                  {tour.published === false ? (
                    <View style={styles.devPill}>
                      <Text style={styles.devPillText}>
                        DEV
                      </Text>
                    </View>
                  ) : null}
                </View>

                <Text
                  numberOfLines={3}
                  style={styles.tourDescription}
                >
                  {tour.shortDescription}
                </Text>

                <View style={styles.metaGrid}>
                  {tour.stopCount != null ? (
                    <View style={styles.metaChip}>
                      <Ionicons
                        name="location-outline"
                        size={15}
                        color={colors.gold}
                      />
                      <Text style={styles.metaText}>
                        {tour.stopCount}{' '}
                        {tour.stopCount === 1 ? 'stop' : 'stops'}
                      </Text>
                    </View>
                  ) : null}

                  {tour.estimatedMinutes ? (
                    <View style={styles.metaChip}>
                      <Ionicons
                        name="time-outline"
                        size={15}
                        color={colors.gold}
                      />
                      <Text style={styles.metaText}>
                        {tour.estimatedMinutes} min
                      </Text>
                    </View>
                  ) : null}

                  {tour.estimatedDistanceMiles != null ? (
                    <View style={styles.metaChip}>
                      <Ionicons
                        name="map-outline"
                        size={15}
                        color={colors.gold}
                      />
                      <Text style={styles.metaText}>
                        {tour.estimatedDistanceMiles.toFixed(1)} mi
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.openTourRow}>
                  <View style={styles.unlockCopy}>
                    {plusReady && !hasPlus ? (
                      <Ionicons
                        name="lock-closed"
                        size={14}
                        color={colors.gold}
                      />
                    ) : (
                      <Ionicons
                        name="checkmark-circle"
                        size={15}
                        color={colors.gold}
                      />
                    )}
                    <Text style={styles.unlockText}>
                      {hasPlus ? 'Included with Plus' : 'Plus tour'}
                    </Text>
                  </View>

                  <View style={styles.openTourButton}>
                    <Text style={styles.openTourButtonText}>
                      View Tour
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={colors.background}
                    />
                  </View>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>
            Curated tours are being prepared
          </Text>
          <Text style={styles.muted}>
            Build My Own Tour is available for development testing.
          </Text>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
  },

  heroArtworkShell: {
    overflow: 'hidden',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },

  heroArtwork: {
    width: '100%',
    height: 180,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },

  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },

  headerCopy: {
    flex: 1,
  },

  eyebrow: {
    ...typography.eyebrow,
    color: colors.gold,
  },

  title: {
    ...typography.display,
    fontSize: 32,
    lineHeight: 38,
  },

  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: 3,
  },

  readyMadeHeader: {
    gap: 3,
    borderWidth: 1,
    borderColor: '#5C486C',
    borderRadius: radius.md,
    backgroundColor: '#17111F',
    padding: spacing.md,
  },

  readyMadeEyebrow: {
    ...typography.eyebrow,
    color: colors.gold,
  },

  readyMadeTitle: {
    ...typography.title,
    fontSize: 22,
    lineHeight: 27,
  },

  readyMadeText: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 12.5,
    lineHeight: 17,
  },

  builderCard: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 2,
    borderColor: colors.gold,
    borderRadius: radius.lg,
    backgroundColor: '#21172B',
    padding: spacing.md,
  },

  builderIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.gold,
  },

  builderCopy: {
    flex: 1,
    gap: 2,
  },

  builderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  lockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },

  lockPillText: {
    color: colors.background,
    fontSize: 9,
    fontWeight: '900',
  },

  builderTitle: {
    ...typography.heading,
    color: colors.gold,
    fontSize: 17,
  },

  builderText: {
    ...typography.caption,
    color: colors.textMuted,
  },

  list: {
    gap: spacing.md,
  },

  tourCard: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#4D3A5C',
    borderRadius: radius.lg,
    backgroundColor: '#17111F',
  },

  tourImageShell: {
    height: 168,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },

  tourImage: {
    width: '100%',
    height: '100%',
  },

  imageShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 5, 12, 0.22)',
  },

  tourImageTopRow: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  premiumPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },

  premiumPillText: {
    color: colors.background,
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  favoriteButtonPremium: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(12,8,16,0.72)',
  },

  imageBottomRow: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },

  modePillPremium: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(231, 190, 91, 0.45)',
    backgroundColor: 'rgba(18, 10, 25, 0.88)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },

  modeTextPremium: {
    ...typography.caption,
    color: '#FFF7E2',
    fontWeight: '800',
  },

  featuredPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(18, 10, 25, 0.88)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },

  featuredPillText: {
    ...typography.eyebrow,
    color: colors.gold,
    fontSize: 9,
  },

  tourCardBody: {
    gap: spacing.sm,
    padding: spacing.lg,
  },

  tourTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },

  tourTitle: {
    ...typography.title,
    flex: 1,
    color: '#FFF9EE',
    fontSize: 23,
    lineHeight: 28,
  },

  devPill: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#725C82',
    paddingHorizontal: 7,
    paddingVertical: 3,
  },

  devPillText: {
    ...typography.eyebrow,
    color: '#C7B8D2',
    fontSize: 8,
  },

  tourDescription: {
    ...typography.body,
    color: '#C9BFCE',
    lineHeight: 21,
  },

  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingTop: 2,
  },

  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.pill,
    backgroundColor: '#24182F',
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },

  metaText: {
    ...typography.caption,
    color: '#F2E8FA',
    fontWeight: '800',
  },

  openTourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#352742',
    marginTop: spacing.xs,
    paddingTop: spacing.md,
  },

  unlockCopy: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  unlockText: {
    ...typography.caption,
    color: colors.gold,
    fontWeight: '800',
  },

  openTourButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
  },

  openTourButtonText: {
    ...typography.caption,
    color: colors.background,
    fontWeight: '900',
  },

  emptyCard: {
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },

  emptyTitle: {
    ...typography.heading,
  },

  muted: {
    ...typography.body,
    color: colors.textMuted,
  },

  errorCard: {
    borderWidth: 1,
    borderColor: '#8B3D45',
    borderRadius: radius.lg,
    backgroundColor: '#2A1519',
    padding: spacing.lg,
  },

  errorText: {
    ...typography.body,
    color: '#FFD8DC',
  },
});
