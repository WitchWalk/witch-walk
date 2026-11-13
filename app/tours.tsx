import { Ionicons } from '@expo/vector-icons';
import {
  router,
  useFocusEffect,
  type Href,
} from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { AppText as Text } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import {
  listPublishedCuratedTours,
  type CuratedTourSummary,
} from '@/services/curatedTours';
import {
  colors,
  radius,
  spacing,
  typography,
} from '@/theme/tokens';

export default function ToursScreen() {
  const [tours, setTours] = useState<CuratedTourSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      let active = true;

      setLoading(true);
      setError('');

      void listPublishedCuratedTours()
        .then((result) => {
          if (active) {
            setTours(result);
          }
        })
        .catch(() => {
          if (active) {
            setError(
              'BROOMSTICK could not load the tour library.',
            );
          }
        })
        .finally(() => {
          if (active) {
            setLoading(false);
          }
        });

      return () => {
        active = false;
      };
    }, []),
  );

  return (
    <Screen scroll contentContainerStyle={styles.content}>
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

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/build-my-tour')}
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
          <Text style={styles.builderTitle}>
            Build My Own Tour
          </Text>
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
                  {
                    pathname: '/tours/[id]',
                    params: { id: tour.id },
                  } as Href,
                )
              }
              style={styles.tourCard}
            >
              <View style={styles.tourTopRow}>
                <View style={styles.modePill}>
                  <Ionicons
                    name={
                      tour.tourMode === 'driving'
                        ? 'car'
                        : 'walk'
                    }
                    size={15}
                    color={colors.gold}
                  />
                  <Text style={styles.modeText}>
                    {tour.tourMode === 'mixed'
                      ? 'Walking + Driving'
                      : tour.tourMode === 'driving'
                        ? 'Driving'
                        : 'Walking'}
                  </Text>
                </View>

                <Text style={styles.plusLabel}>
                  {tour.published === false
                    ? 'DEV PREVIEW'
                    : 'PLUS'}
                </Text>
              </View>

              <Text style={styles.tourTitle}>
                {tour.name}
              </Text>

              <Text style={styles.tourDescription}>
                {tour.shortDescription}
              </Text>

              <View style={styles.metaRow}>
                {tour.estimatedMinutes ? (
                  <Text style={styles.metaText}>
                    {tour.estimatedMinutes} min
                  </Text>
                ) : null}

                {tour.estimatedDistanceMiles != null ? (
                  <Text style={styles.metaText}>
                    {tour.estimatedDistanceMiles.toFixed(1)} mi
                  </Text>
                ) : null}
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
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
    padding: spacing.lg,
  },

  tourTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.pill,
    backgroundColor: '#2A1C38',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },

  modeText: {
    ...typography.caption,
    color: colors.gold,
    fontWeight: '800',
  },

  plusLabel: {
    ...typography.eyebrow,
    color: colors.gold,
  },

  tourTitle: {
    ...typography.title,
    fontSize: 22,
    lineHeight: 28,
  },

  tourDescription: {
    ...typography.body,
    color: colors.textMuted,
  },

  metaRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },

  metaText: {
    ...typography.caption,
    color: colors.gold,
    fontWeight: '800',
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
