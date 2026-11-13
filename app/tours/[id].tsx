import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { AppText as Text } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import {
  getPublishedCuratedTour,
  type CuratedTourDetail,
} from '@/services/curatedTours';
import {
  cacheCuratedTourForOffline,
  getCachedCuratedTour,
  getTourSafeOfflineStatus,
} from '@/services/tourOffline';
import {
  colors,
  radius,
  spacing,
  typography,
} from '@/theme/tokens';

export default function TourDetailScreen() {
  const { id, addedStops } =
    useLocalSearchParams<{
      id: string;
      addedStops?: string;
    }>();

  const addedStopIds = addedStops
    ? addedStops.split(',').filter(Boolean)
    : [];
  const [tour, setTour] =
    useState<CuratedTourDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [offlineMessage, setOfflineMessage] =
    useState('');
  const [offlineReady, setOfflineReady] =
    useState(false);
  const [offlineCoverage, setOfflineCoverage] =
    useState<{ cached: number; total: number } | null>(null);

  useEffect(() => {
    let active = true;

    if (!id) {
      setLoading(false);
      setError('Tour unavailable.');
      return () => {
        active = false;
      };
    }

    setLoading(true);
    setError('');

    void (async () => {
      const cached = await getCachedCuratedTour(id);

      if (!active) {
        return;
      }

      if (cached) {
        setTour(cached);
        setOfflineMessage(
          'TourSafe offline copy loaded.',
        );
        setLoading(false);

        void getPublishedCuratedTour(id)
          .then((fresh) => {
            if (!active || !fresh) return;
            setTour(fresh);
          })
          .catch(() => {
            // Cached copy remains active.
          });

        return;
      }

      try {
        const fresh = await getPublishedCuratedTour(id);

        if (!active) {
          return;
        }

        if (fresh) {
          setTour(fresh);
        } else {
          setError('Tour unavailable.');
        }
      } catch {
        if (active) {
          setError(
            'BROOMSTICK could not load this tour.',
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
  }, [id]);

  useEffect(() => {
    let active = true;

    if (!tour) {
      setOfflineReady(false);
      setOfflineCoverage(null);
      return () => {
        active = false;
      };
    }

    void getTourSafeOfflineStatus(
      tour,
      addedStopIds,
    ).then((status) => {
      if (!active) return;

      setOfflineReady(status.ready);
      setOfflineCoverage({
        cached: status.cached,
        total: status.total,
      });
    });

    return () => {
      active = false;
    };
  }, [tour, addedStops]);

  const downloadOffline = async () => {
    if (!tour || downloading) {
      return;
    }

    setDownloading(true);
    setOfflineMessage('');

    try {
      const result =
        await cacheCuratedTourForOffline(
          tour,
          addedStopIds,
        );

      const ready = result.unavailable === 0;

      setOfflineReady(ready);
      setOfflineCoverage({
        cached: result.cached,
        total: result.total,
      });

      setOfflineMessage(
        ready
          ? `✓ TourSafe ready: ${result.cached} of ${result.total} narrations saved offline.`
          : `TourSafe saved ${result.cached} of ${result.total} narrations. ${result.unavailable} stop(s) are not ready yet.`,
      );
    } catch {
      setOfflineMessage(
        'TourSafe could not finish the offline download.',
      );
    } finally {
      setDownloading(false);
    }
  };

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
            {tour?.name ?? 'Tour'}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.panel}>
          <Text style={styles.muted}>
            Loading tour…
          </Text>
        </View>
      ) : error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : tour ? (
        <>
          <View style={styles.hero}>
            <View style={styles.modeRow}>
              <View style={styles.modePill}>
                <Ionicons
                  name={
                    tour.tourMode === 'driving'
                      ? 'car'
                      : 'walk'
                  }
                  size={16}
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

              <Text style={styles.plusText}>
                {tour.published === false
                  ? 'DEV PREVIEW'
                  : 'PLUS'}
              </Text>
            </View>

            <Text style={styles.description}>
              {tour.fullDescription ||
                tour.shortDescription}
            </Text>

            <View style={styles.stats}>
              <View style={styles.stat}>
                <Ionicons
                  name="location-outline"
                  size={18}
                  color={colors.gold}
                />
                <Text style={styles.statText}>
                  {tour.stops.length + addedStopIds.length} stops
                </Text>
              </View>

              {tour.estimatedMinutes ? (
                <View style={styles.stat}>
                  <Ionicons
                    name="time-outline"
                    size={18}
                    color={colors.gold}
                  />
                  <Text style={styles.statText}>
                    {tour.estimatedMinutes} min
                  </Text>
                </View>
              ) : null}

              {tour.estimatedDistanceMiles != null ? (
                <View style={styles.stat}>
                  <Ionicons
                    name="navigate-outline"
                    size={18}
                    color={colors.gold}
                  />
                  <Text style={styles.statText}>
                    {tour.estimatedDistanceMiles.toFixed(1)} mi
                  </Text>
                </View>
              ) : null}
            </View>
          </View>



          <Pressable
            accessibilityRole="button"
            onPress={() =>
              router.push({
                pathname: '/build-my-tour',
                params: {
                  tourId: tour.id,
                  customize: '1',
                  addedStops,
                },
              })
            }
            style={styles.addStopsButton}
          >
            <Ionicons
              name="add-circle-outline"
              size={20}
              color={colors.gold}
            />
            <Text style={styles.addStopsButtonText}>
              CUSTOMIZE TOUR STOPS
            </Text>
          </Pressable>

          <View style={styles.prepHeader}>
            <Text style={styles.eyebrow}>
              BEFORE YOU START
            </Text>
            <Text style={styles.prepTitle}>
              Get the tour ready
            </Text>
            <Text style={styles.prepText}>
              Save the narration for weak-service areas, or customize the stops before you begin.
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={downloading}
            onPress={() => void downloadOffline()
            style={[
              styles.offlineButton,
              offlineReady && styles.offlineButtonReady,
              downloading && styles.startButtonDisabled,
            ]}
          >
            <Ionicons
              name={
                offlineReady
                  ? 'shield-checkmark'
                  : 'download-outline'
              }
              size={20}
              color={
                offlineReady
                  ? colors.background
                  : colors.gold
              }
            />
            <Text
              style={[
                styles.offlineButtonText,
                offlineReady &&
                  styles.offlineButtonTextReady,
              ]}
            >
              {downloading
                ? 'Downloading TourSafe…'
                : offlineReady
                  ? 'TOURSAFE READY'
                  : 'DOWNLOAD FOR OFFLINE'}
            </Text>
          </Pressable>

          {offlineCoverage ? (
            <Text style={styles.offlineCoverageText}>
              {offlineCoverage.cached} of {offlineCoverage.total} tour narrations saved on this phone
            </Text>
          ) : null}

          {offlineMessage ? (
            <View style={styles.offlineStatus}>
              <Text style={styles.offlineStatusText}>
                {offlineMessage}
              </Text>
            </View>
          ) : null}

          <Text style={styles.tourSafeNote}>
            TourSafe keeps downloaded narration available even when cellular service is weak or unavailable.
          </Text>

          <Pressable
            accessibilityRole="button"
            disabled={tour.stops.length === 0}
            onPress={() =>
              router.push({
                pathname: '/build-my-tour',
                params: {
                  tourId: tour.id,
                  autoStart: '1',
                  addedStops,
                },
              })
            }
            style={[
              styles.startButton,
              tour.stops.length === 0 &&
                styles.startButtonDisabled,
            ]}
          >
            <Ionicons
              name="navigate"
              size={22}
              color={colors.background}
            />
            <Text style={styles.startButtonText}>
              START TOUR
            </Text>
          </Pressable>

          {addedStopIds.length > 0 ? (
            <View style={styles.addedStopsNotice}>
              <View style={styles.addedStopsNoticeHeader}>
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={colors.background}
                />
                <Text style={styles.addedStopsNoticeTitle}>
                  EXTRA STOPS ADDED TO THIS TOUR
                </Text>
              </View>
              <Text style={styles.addedStopsNoticeText}>
                {addedStopIds.length} extra stop{addedStopIds.length === 1 ? '' : 's'} will appear in your Tour List once you start the tour.
              </Text>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Tour stops
            </Text>

            <View style={styles.stopList}>
              {tour.stops.map((stop, index) => (
                <View
                  key={stop.attractionId}
                  style={styles.stopRow}
                >
                  <View style={styles.number}>
                    <Text style={styles.numberText}>
                      {index + 1}
                    </Text>
                  </View>

                  <View style={styles.stopCopy}>
                    <Text style={styles.stopName}>
                      {stop.name}
                    </Text>
                    <Text style={styles.stopAddress}>
                      {stop.address}
                    </Text>

                    {stop.optional ? (
                      <Text style={styles.optionalText}>
                        Optional stop
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          </View>


        </>
      ) : null}
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
    alignItems: 'center',
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
    fontSize: 30,
    lineHeight: 36,
  },

  hero: {
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
    padding: spacing.lg,
  },

  modeRow: {
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

  plusText: {
    ...typography.eyebrow,
    color: colors.gold,
  },

  description: {
    ...typography.body,
    color: colors.text,
  },

  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },

  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  statText: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '800',
  },

  section: {
    gap: spacing.sm,
  },

  sectionTitle: {
    ...typography.title,
    fontSize: 20,
  },

  stopList: {
    gap: spacing.sm,
  },

  stopRow: {
    flexDirection: 'row',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },

  number: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.gold,
  },

  numberText: {
    ...typography.heading,
    color: colors.background,
  },

  stopCopy: {
    flex: 1,
    gap: 2,
  },

  stopName: {
    ...typography.heading,
    fontSize: 16,
  },

  stopAddress: {
    ...typography.caption,
    color: colors.textMuted,
  },

  optionalText: {
    ...typography.caption,
    color: colors.gold,
    fontWeight: '800',
  },

  prepHeader: {
    gap: 3,
    marginTop: spacing.xs,
  },

  prepTitle: {
    ...typography.title,
    fontSize: 20,
    lineHeight: 25,
  },

  prepText: {
    ...typography.caption,
    color: colors.textMuted,
  },

  addStopsButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radius.md,
    backgroundColor: '#21172B',
    paddingHorizontal: spacing.lg,
  },

  addStopsButtonText: {
    ...typography.body,
    color: colors.gold,
    fontWeight: '900',
  },

  addedStopsNotice: {
    gap: spacing.sm,
    borderWidth: 2,
    borderColor: colors.gold,
    borderRadius: radius.md,
    backgroundColor: '#2A1C38',
    padding: spacing.md,
  },

  addedStopsNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },

  addedStopsNoticeTitle: {
    ...typography.body,
    flex: 1,
    color: colors.background,
    fontWeight: '900',
    textAlign: 'center',
  },

  addedStopsNoticeText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '800',
    textAlign: 'center',
  },

  offlineButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 2,
    borderColor: colors.gold,
    borderRadius: radius.md,
    backgroundColor: '#21172B',
    paddingHorizontal: spacing.lg,
  },

  offlineButtonText: {
    ...typography.body,
    color: colors.gold,
    fontWeight: '900',
  },

  offlineButtonReady: {
    borderColor: colors.success,
    backgroundColor: colors.success,
  },

  offlineButtonTextReady: {
    color: colors.background,
  },

  offlineCoverageText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    fontWeight: '700',
  },

  offlineStatus: {
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },

  offlineStatusText: {
    ...typography.caption,
    color: colors.text,
    textAlign: 'center',
    fontWeight: '700',
  },

  startButton: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.lg,
  },

  startButtonDisabled: {
    opacity: 0.4,
  },

  startButtonText: {
    ...typography.body,
    color: colors.background,
    fontWeight: '900',
  },

  tourSafeNote: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },

  panel: {
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },

  muted: {
    ...typography.body,
    color: colors.textMuted,
  },

  errorCard: {
    borderWidth: 1,
    borderColor: '#8B3D45',
    borderRadius: radius.md,
    backgroundColor: '#2A1519',
    padding: spacing.lg,
  },

  errorText: {
    ...typography.body,
    color: '#FFD8DC',
  },
});
