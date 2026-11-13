import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { AppText as Text } from '@/components/AppText';
import { useAttractions } from '@/components/attractions/AttractionsProvider';
import { Screen } from '@/components/Screen';
import {
  NarrationPlayer,
} from '@/components/tours/NarrationPlayer';
import { TourRouteMap } from '@/components/tours/TourRouteMap';
import {
  distanceMeters,
  type TourRouteStrategy,
  type TourTravelMode,
} from '@/services/tourRouteCore';
import {
  clearSavedTourProgress,
  loadSavedTourProgress,
  saveTourProgress,
} from '@/services/tourProgress';
import {
  buildTravelTimeTourRoute,
  getTourLegEstimate,
  type TourRouteSource,
} from '@/services/tourTravelTimeRoute';
import {
  cacheTourNarration,
  resolveTourNarration,
  type TourNarrationSource,
} from '@/services/tourNarration';
import { getPublishedCuratedTour } from '@/services/curatedTours';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export default function BuildMyTourScreen() {
  const { tourId, autoStart, customize } =
    useLocalSearchParams<{
      tourId?: string;
      autoStart?: string;
      customize?: string;
    }>();
  const { attractions, ready } = useAttractions();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [orderedIds, setOrderedIds] = useState<string[]>([]);

  const [travelMode, setTravelMode] =
    useState<TourTravelMode>('walking');

  const [strategy, setStrategy] =
    useState<TourRouteStrategy>('optimize');

  const [building, setBuilding] = useState(false);
  const [tourStarted, setTourStarted] = useState(false);
  const [routeSource, setRouteSource] =
    useState<TourRouteSource | null>(null);
  const [routeDurationSeconds, setRouteDurationSeconds] =
    useState<number | null>(null);
  const [routeDistanceMeters, setRouteDistanceMeters] =
    useState<number | null>(null);
  const [routeCoordinates, setRouteCoordinates] =
    useState<Array<{ latitude: number; longitude: number }>>([]);
  const [routeOrigin, setRouteOrigin] =
    useState<{ latitude: number; longitude: number } | null>(null);
  const [nextStopState, setNextStopState] =
    useState<'ready' | 'navigating' | 'arrived'>('ready');
  const [nextStopDurationSeconds, setNextStopDurationSeconds] =
    useState<number | null>(null);
  const [nextStopDistanceMeters, setNextStopDistanceMeters] =
    useState<number | null>(null);
  const [narrationPlayerVisible, setNarrationPlayerVisible] =
    useState(false);
  const [narrationLoading, setNarrationLoading] =
    useState(false);
  const [narrationSource, setNarrationSource] =
    useState<TourNarrationSource | null>(null);
  const [stopSearch, setStopSearch] =
    useState('');
  const [curatedTourName, setCuratedTourName] =
    useState<string | null>(null);
  const [curatedBaseIds, setCuratedBaseIds] =
    useState<string[]>([]);
  const [curatedTourLoaded, setCuratedTourLoaded] =
    useState(false);
  const [resumeChecked, setResumeChecked] =
    useState(false);
  const [curatedAutoStartHandled, setCuratedAutoStartHandled] =
    useState(false);

  const selectable = useMemo(
    () =>
      attractions.filter(
        (attraction) =>
          attraction.latitude !== null &&
          attraction.longitude !== null,
      ),
    [attractions],
  );

  const filteredSelectable = useMemo(() => {
    const query = stopSearch.trim().toLowerCase();

    if (!query) {
      return selectable;
    }

    return selectable.filter((attraction) => {
      const name = attraction.name.toLowerCase();
      const address =
        attraction.address?.toLowerCase() ?? '';

      return (
        name.includes(query) ||
        address.includes(query)
      );
    });
  }, [selectable, stopSearch]);

  useEffect(() => {
    let active = true;

    if (!tourId || !ready || curatedTourLoaded) {
      return () => {
        active = false;
      };
    }

    void getPublishedCuratedTour(tourId)
      .then((tour) => {
        if (!active || !tour) {
          return;
        }

        const ids = tour.stops
          .map((stop) => stop.attractionId)
          .filter((id) =>
            selectable.some((item) => item.id === id),
          );

        setSelectedIds(ids);
        setOrderedIds(ids);
        setCuratedBaseIds(ids);
        setCuratedTourName(tour.name);
        setStrategy('keep-order');

        if (tour.tourMode === 'driving') {
          setTravelMode('driving');
        } else {
          setTravelMode('walking');
        }
      })
      .finally(() => {
        if (active) {
          setCuratedTourLoaded(true);
        }
      });

    return () => {
      active = false;
    };
  }, [
    curatedTourLoaded,
    ready,
    selectable,
    tourId,
  ]);

  useEffect(() => {
    let active = true;

    if (tourId || !ready || resumeChecked) {
      return () => {
        active = false;
      };
    }

    void loadSavedTourProgress()
      .then((progress) => {
        if (!active || !progress) {
          return;
        }

        const selected = progress.selectedIds.filter((id) =>
          selectable.some((item) => item.id === id),
        );

        const completed = progress.completedIds.filter((id) =>
          selected.includes(id),
        );

        if (!selected.length) {
          return;
        }

        setSelectedIds(selected);
        setCompletedIds(completed);
        setOrderedIds(
          selected.filter((id) => !completed.includes(id)),
        );
        setTravelMode(progress.travelMode);
        setStrategy(progress.strategy);
        setCuratedTourName(progress.curatedTourName);
        setTourStarted(true);
      })
      .finally(() => {
        if (active) {
          setResumeChecked(true);
        }
      });

    return () => {
      active = false;
    };
  }, [
    ready,
    resumeChecked,
    selectable,
    tourId,
  ]);

  useEffect(() => {
    if (!tourStarted) {
      return;
    }

    void saveTourProgress({
      tourId: tourId ?? null,
      curatedTourName,
      selectedIds,
      completedIds,
      travelMode,
      strategy,
      tourStarted,
    });
  }, [
    completedIds,
    curatedTourName,
    selectedIds,
    strategy,
    tourId,
    tourStarted,
    travelMode,
  ]);

  const extraSelectable = useMemo(
    () =>
      customize === '1'
        ? filteredSelectable.filter(
            (item) => !curatedBaseIds.includes(item.id),
          )
        : filteredSelectable,
    [
      curatedBaseIds,
      customize,
      filteredSelectable,
    ],
  );

  const addedStopCount = useMemo(
    () =>
      selectedIds.filter(
        (id) => !curatedBaseIds.includes(id),
      ).length,
    [curatedBaseIds, selectedIds],
  );

  const selected = useMemo(
    () =>
      selectedIds
        .map((id) =>
          selectable.find((item) => item.id === id),
        )
        .filter(
          (item): item is NonNullable<typeof item> =>
            Boolean(item),
        ),
    [selectable, selectedIds],
  );

  const ordered = useMemo(
    () =>
      orderedIds
        .map((id) =>
          selectable.find((item) => item.id === id),
        )
        .filter(
          (item): item is NonNullable<typeof item> =>
            Boolean(item),
        ),
    [orderedIds, selectable],
  );

  const completed = useMemo(
    () =>
      completedIds
        .map((id) =>
          selectable.find((item) => item.id === id),
        )
        .filter(
          (item): item is NonNullable<typeof item> =>
            Boolean(item),
        ),
    [completedIds, selectable],
  );

  const getCurrentOrigin = async () => {
    let permission =
      await Location.getForegroundPermissionsAsync();

    if (permission.status !== 'granted') {
      permission =
        await Location.requestForegroundPermissionsAsync();
    }

    if (permission.status !== 'granted') {
      throw new Error('location-permission');
    }

    const position =
      await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  };

  const calculateRoute = async (
    nextSelectedIds: string[],
    nextCompletedIds: string[],
  ) => {
    const remainingIds = nextSelectedIds.filter(
      (id) => !nextCompletedIds.includes(id),
    );

    if (remainingIds.length === 0) {
      setOrderedIds([]);
      setRouteSource(null);
      setRouteDurationSeconds(null);
      setRouteDistanceMeters(null);
      setRouteCoordinates([]);
      setRouteOrigin(null);
      setNextStopDurationSeconds(null);
      setNextStopDistanceMeters(null);
      setNextStopState('ready');
      setNarrationPlayerVisible(false);
      setNarrationSource(null);
      setNarrationLoading(false);
      return;
    }

    const origin = await getCurrentOrigin();
    setRouteOrigin(origin);
    setNarrationPlayerVisible(false);
    setNarrationSource(null);
    setNarrationLoading(false);

    const nextStops = remainingIds
      .map((id) =>
        selectable.find((item) => item.id === id),
      )
      .filter(
        (item): item is NonNullable<typeof item> =>
          Boolean(item),
      );

    const plan = await buildTravelTimeTourRoute({
      origin,
      stops: nextStops.map((attraction) => ({
        id: attraction.id,
        name: attraction.name,
        latitude: attraction.latitude as number,
        longitude: attraction.longitude as number,
      })),
      completedStopIds: nextCompletedIds,
      strategy,
      travelMode,
    });

    setOrderedIds(plan.remainingStopIds);
    setRouteSource(plan.source);
    setRouteDurationSeconds(plan.routeDurationSeconds);
    setRouteDistanceMeters(plan.routeDistanceMeters);
    setRouteCoordinates(plan.routeCoordinates);

    const nextStop = plan.orderedStops[0];

    if (nextStop) {
      const leg = await getTourLegEstimate({
        origin,
        destination: nextStop,
        travelMode,
      });

      setNextStopDurationSeconds(
        leg.durationSeconds > 0
          ? leg.durationSeconds
          : null,
      );
      setNextStopDistanceMeters(leg.distanceMeters);

      setNextStopState(
        distanceMeters(origin, nextStop) <= 75
          ? 'arrived'
          : 'ready',
      );
    } else {
      setNextStopDurationSeconds(null);
      setNextStopDistanceMeters(null);
      setNextStopState('ready');
    }
  };

  const buildRoute = async () => {
    if (selected.length < 2) {
      Alert.alert(
        'Choose more stops',
        'Select at least two attractions to build a tour.',
      );
      return;
    }

    setBuilding(true);

    try {
      setCompletedIds([]);
      await calculateRoute(selectedIds, []);
      setTourStarted(true);
    } catch (error) {
      Alert.alert(
        'Could not build route',
        error instanceof Error &&
          error.message === 'location-permission'
          ? 'BROOMSTICK needs your location to determine the best starting stop.'
          : 'BROOMSTICK could not read your location. Try again.',
      );
    } finally {
      setBuilding(false);
    }
  };

  useEffect(() => {
    if (
      autoStart !== '1' ||
      !curatedTourName ||
      !curatedTourLoaded ||
      curatedAutoStartHandled ||
      tourStarted ||
      selected.length < 2
    ) {
      return;
    }

    setCuratedAutoStartHandled(true);
    void buildRoute();
  }, [
    autoStart,
    curatedAutoStartHandled,
    curatedTourLoaded,
    curatedTourName,
    selected.length,
    tourStarted,
  ]);

  const recalculate = async (
    nextSelectedIds = selectedIds,
    nextCompletedIds = completedIds,
  ) => {
    setBuilding(true);

    try {
      await calculateRoute(
        nextSelectedIds,
        nextCompletedIds,
      );
    } catch {
      Alert.alert(
        'Could not recalculate',
        'BROOMSTICK could not refresh your route from your current location.',
      );
    } finally {
      setBuilding(false);
    }
  };

  const toggleStop = async (id: string) => {
    if (completedIds.includes(id)) {
      return;
    }

    const wasSelected = selectedIds.includes(id);

    const nextSelectedIds = wasSelected
      ? selectedIds.filter((item) => item !== id)
      : [...selectedIds, id];

    setSelectedIds(nextSelectedIds);

    if (!wasSelected && stopSearch.trim()) {
      setStopSearch('');
    }

    if (tourStarted) {
      await recalculate(
        nextSelectedIds,
        completedIds,
      );
    } else {
      setOrderedIds([]);
    }
  };

  const startNextStopNavigation = async () => {
    const nextStop = ordered[0];

    if (!nextStop) {
      return;
    }

    setNextStopState('navigating');

    const latitude = nextStop.latitude as number;
    const longitude = nextStop.longitude as number;
    const label = encodeURIComponent(nextStop.name);

    const url = Platform.select({
      ios:
        `maps://?daddr=${latitude},${longitude}&dirflg=${travelMode === 'walking' ? 'w' : 'd'}&q=${label}`,
      default:
        `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=${travelMode}`,
    });

    if (!url) {
      return;
    }

    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        'Unable to open navigation',
        'You can still use the BROOMSTICK route preview and mark the stop as arrived manually.',
      );
    }
  };

  const markArrived = () => {
    setNextStopState('arrived');
  };

  const playNarration = async () => {
    const nextStop = ordered[0];

    if (!nextStop) {
      return;
    }

    setNarrationPlayerVisible(true);
    setNarrationLoading(true);

    try {
      const resolved =
        await resolveTourNarration(nextStop.id);

      if (resolved.kind === 'remote') {
        try {
          const cached =
            await cacheTourNarration(resolved);
          setNarrationSource(cached);
        } catch {
          setNarrationSource(resolved);
        }
      } else {
        setNarrationSource(resolved);
      }
    } catch {
      setNarrationSource({
        kind: 'unavailable',
        attractionId: nextStop.id,
        reason: 'service-unavailable',
      });
    } finally {
      setNarrationLoading(false);
    }
  };

  const markComplete = async (id: string) => {
    if (completedIds.includes(id)) {
      return;
    }

    const nextCompletedIds = [
      ...completedIds,
      id,
    ];

    setCompletedIds(nextCompletedIds);

    await recalculate(
      selectedIds,
      nextCompletedIds,
    );
  };

  const removeRemainingStop = async (id: string) => {
    if (completedIds.includes(id)) {
      return;
    }

    const nextSelectedIds =
      selectedIds.filter((item) => item !== id);

    setSelectedIds(nextSelectedIds);

    await recalculate(
      nextSelectedIds,
      completedIds,
    );
  };

  const resetTour = () => {
    setSelectedIds([]);
    setCompletedIds([]);
    setOrderedIds([]);
    setRouteSource(null);
    setRouteDurationSeconds(null);
    setRouteDistanceMeters(null);
    setRouteCoordinates([]);
    setRouteOrigin(null);
    setNextStopDurationSeconds(null);
    setNextStopDistanceMeters(null);
    setNextStopState('ready');
    setNarrationPlayerVisible(false);
    setNarrationSource(null);
    setNarrationLoading(false);
    setTourStarted(false);
    setCuratedTourName(null);
    void clearSavedTourProgress();
  };

  const tourComplete =
    tourStarted &&
    completedIds.length > 0 &&
    selectedIds.length === completedIds.length;

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={10}
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons
            name="chevron-back"
            size={26}
            color={colors.text}
          />
        </Pressable>

        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>
            BROOMSTICK PLUS • DEVELOPMENT
          </Text>

          <Text style={styles.title}>
            Build My Tour
          </Text>
        </View>
      </View>

      {curatedTourName ? (
        <View style={styles.curatedNotice}>
          <Ionicons
            name="sparkles"
            size={20}
            color={colors.gold}
          />
          <View style={styles.curatedNoticeCopy}>
            <Text style={styles.curatedNoticeTitle}>
              Curated tour loaded
            </Text>
            <Text style={styles.curatedNoticeText}>
              {curatedTourName}
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.notice}>
        <Ionicons
          name="construct-outline"
          size={20}
          color={colors.gold}
        />

        <Text style={styles.noticeText}>
          Prototype mode uses normal Attractions.
          Paid narrated Tour Stops will replace these
          when Plus entitlement is connected.
        </Text>
      </View>

      {!tourStarted &&
      curatedTourName &&
      autoStart !== '1' &&
      customize !== '1' ? (
        <Pressable
          accessibilityRole="button"
          disabled={building || selected.length < 2}
          onPress={() => void buildRoute()}
          style={({ pressed }) => [
            styles.curatedStartButton,
            (building || selected.length < 2) &&
              styles.buildButtonDisabled,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name="navigate"
            size={23}
            color={colors.background}
          />

          <View style={styles.curatedStartCopy}>
            <Text style={styles.curatedStartTitle}>
              {building
                ? 'Starting Tour…'
                : 'START TOUR'}
            </Text>
            <Text style={styles.curatedStartText}>
              {curatedTourName}
            </Text>
          </View>
        </Pressable>
      ) : null}

      {!tourStarted && !curatedTourName ? (
        <View style={styles.buildGuide}>
          <View style={styles.buildGuideIcon}>
            <Ionicons
              name="arrow-down"
              size={22}
              color={colors.background}
            />
          </View>

          <View style={styles.buildGuideCopy}>
            <Text style={styles.buildGuideTitle}>
              Build My Route is at the bottom
            </Text>
            <Text style={styles.buildGuideText}>
              Choose your travel mode and stops, then scroll to the bottom and tap the gold Build My Route button.
            </Text>
          </View>
        </View>
      ) : null}

      {!curatedTourName ? (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              How are you exploring?
            </Text>

            <View style={styles.buttonRow}>
              <ChoiceButton
                icon="walk"
                label="Walking"
                selected={travelMode === 'walking'}
                onPress={() =>
                  setTravelMode('walking')
                }
              />

              <ChoiceButton
                icon="car"
                label="Driving"
                selected={travelMode === 'driving'}
                onPress={() =>
                  setTravelMode('driving')
                }
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Route preference
            </Text>

            <View style={styles.buttonRow}>
              <ChoiceButton
                icon="flash"
                label="Optimize"
                selected={strategy === 'optimize'}
                onPress={() => {
                  setStrategy('optimize');

                  if (tourStarted) {
                    void recalculate();
                  } else {
                    setOrderedIds([]);
                  }
                }}
              />

              <ChoiceButton
                icon="reorder-three"
                label="Keep My Order"
                selected={strategy === 'keep-order'}
                onPress={() => {
                  setStrategy('keep-order');

                  if (tourStarted) {
                    void recalculate();
                  } else {
                    setOrderedIds([]);
                  }
                }}
              />
            </View>
          </View>
        </>
      ) : null}

      {(!curatedTourName || customize === '1') ? (
      <View style={styles.section}>
        {curatedTourName ? (
          <View style={styles.curatedStopsHeading}>
            <Text style={styles.curatedStopsTitle}>
              ADD MORE STOPS TO THIS TOUR
            </Text>

            <Text style={styles.counter}>
              {addedStopCount} new stop{addedStopCount === 1 ? '' : 's'} selected
            </Text>

            <Pressable
              accessibilityRole="button"
              disabled={addedStopCount === 0 || building}
              onPress={() => void buildRoute()}
              style={({ pressed }) => [
                styles.applyStopsButton,
                (addedStopCount === 0 || building) &&
                  styles.buildButtonDisabled,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name="add-circle"
                size={20}
                color={colors.background}
              />
              <Text style={styles.applyStopsButtonText}>
                {building
                  ? 'Updating Tour…'
                  : addedStopCount > 0
                    ? `ADD ${addedStopCount} SELECTED STOP${addedStopCount === 1 ? '' : 'S'}`
                    : 'SELECT EXTRA STOPS BELOW'}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>
              Choose your stops
            </Text>

            <Text style={styles.counter}>
              {selectedIds.length} selected
            </Text>
          </View>
        )}

        {!tourStarted && !curatedTourName ? (
          <View style={styles.bottomReminder}>
            <Ionicons
              name="arrow-down-circle-outline"
              size={20}
              color={colors.gold}
            />
            <Text style={styles.bottomReminderText}>
              After choosing your locations, keep scrolling. The Build My Route button is below the location list.
            </Text>
          </View>
        ) : null}

        <View style={styles.searchArea}>
          <Text style={styles.searchLabel}>
            SEARCH TOUR STOPS
          </Text>

          <View style={styles.searchShell}>
            <View style={styles.searchIconShell}>
              <Ionicons
                name="search"
                size={20}
                color={colors.background}
              />
            </View>

            <TextInput
              accessibilityLabel="Search tour stops"
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
              onChangeText={setStopSearch}
              placeholder="Type Witch House, Essex Street…"
              placeholderTextColor="#A69DAE"
              returnKeyType="done"
              style={styles.searchInput}
              value={stopSearch}
            />
          </View>

          <Text style={styles.searchHelp}>
            Results update as you type. Tap a result even while the keyboard is open.
          </Text>
        </View>

        {!ready ? (
          <View style={styles.emptyCard}>
            <Text style={styles.muted}>
              Loading attractions…
            </Text>
          </View>
        ) : (
          <View style={styles.stopList}>
            {extraSelectable.map((attraction) => {
              const isSelected =
                selectedIds.includes(attraction.id);

              const isCompleted =
                completedIds.includes(attraction.id);

              return (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{
                    checked: isSelected,
                    disabled: isCompleted,
                  }}
                  key={attraction.id}
                  disabled={isCompleted}
                  onPress={() =>
                    void toggleStop(attraction.id)
                  }
                  style={[
                    styles.stopCard,
                    isSelected &&
                      styles.stopCardSelected,
                    isCompleted &&
                      styles.stopCardCompleted,
                  ]}
                >
                  <View style={styles.stopCopy}>
                    <Text style={styles.stopName}>
                      {attraction.name}
                    </Text>

                    <Text style={styles.stopAddress}>
                      {attraction.address}
                    </Text>

                    {isCompleted ? (
                      <Text style={styles.completedLabel}>
                        Completed
                      </Text>
                    ) : null}
                  </View>

                  <Ionicons
                    name={
                      isCompleted
                        ? 'checkmark-done-circle'
                        : isSelected
                          ? 'checkmark-circle'
                          : 'ellipse-outline'
                    }
                    size={26}
                    color={
                      isCompleted
                        ? colors.success
                        : isSelected
                          ? colors.gold
                          : colors.textMuted
                    }
                  />
                </Pressable>
              );
            })}
            {extraSelectable.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.muted}>
                  No attractions match “{stopSearch}”.
                </Text>
              </View>
            ) : null}
          </View>
        )}
      </View>
      ) : null}

      {!tourStarted && !curatedTourName ? (
        <Pressable
          accessibilityRole="button"
          disabled={
            building ||
            selected.length < 2
          }
          onPress={() => void buildRoute()}
          style={({ pressed }) => [
            styles.buildButton,
            (building ||
              selected.length < 2) &&
              styles.buildButtonDisabled,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name="navigate"
            size={21}
            color={colors.background}
          />

          <Text style={styles.buildButtonText}>
            {building
              ? 'Building Route…'
              : 'Build My Route'}
          </Text>
        </Pressable>
      ) : null}

      {tourComplete ? (
        <View style={styles.completeCard}>
          <Ionicons
            name="checkmark-circle"
            size={34}
            color={colors.success}
          />

          <Text style={styles.completeTitle}>
            Tour complete
          </Text>

          <Text style={styles.muted}>
            You completed every selected stop.
          </Text>
        </View>
      ) : null}

      {tourStarted && completed.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Completed
          </Text>

          <View style={styles.completedList}>
            {completed.map((attraction) => (
              <View
                key={attraction.id}
                style={styles.completedRow}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={colors.success}
                />

                <Text style={styles.completedName}>
                  {attraction.name}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {tourStarted && ordered.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.resultHeader}>
            <View>
              <Text style={styles.eyebrow}>
                ACTIVE TOUR
              </Text>

              <Text style={styles.sectionTitle}>
                Remaining stops
              </Text>
            </View>

            <View style={styles.modePill}>
              <Ionicons
                name={
                  travelMode === 'walking'
                    ? 'walk'
                    : 'car'
                }
                size={16}
                color={colors.gold}
              />

              <Text style={styles.modeText}>
                {travelMode === 'walking'
                  ? 'Walking'
                  : 'Driving'}
              </Text>
            </View>
          </View>

          <View style={styles.activeControls}>
            <Pressable
              accessibilityRole="button"
              disabled={building}
              onPress={() => void recalculate()}
              style={styles.updateRouteButton}
            >
              <Ionicons
                name="refresh"
                size={18}
                color={colors.background}
              />

              <Text style={styles.updateRouteButtonText}>
                {building ? 'Updating…' : 'UPDATE ROUTE'}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={resetTour}
              style={styles.secondaryButton}
            >
              <Ionicons
                name="close"
                size={18}
                color={colors.textMuted}
              />

              <Text style={styles.secondaryButtonText}>
                END TOUR
              </Text>
            </Pressable>
          </View>

          {ordered[0] ? (
            <View
              style={[
                styles.nextStopCard,
                nextStopState === 'arrived' &&
                  styles.nextStopCardArrived,
              ]}
            >
              <View style={styles.nextStopTopRow}>
                <View style={styles.nextStopBadge}>
                  <Ionicons
                    name={
                      nextStopState === 'arrived'
                        ? 'location'
                        : 'navigate'
                    }
                    size={16}
                    color={colors.background}
                  />
                  <Text style={styles.nextStopBadgeText}>
                    {nextStopState === 'arrived'
                      ? 'ARRIVED'
                      : 'NEXT STOP'}
                  </Text>
                </View>

                <Text style={styles.nextStopProgress}>
                  {completedIds.length + 1} of {selectedIds.length}
                </Text>
              </View>

              <Text style={styles.nextStopName}>
                {ordered[0].name}
              </Text>

              <Text style={styles.stopAddress}>
                {ordered[0].address}
              </Text>

              <View style={styles.nextStopStats}>
                {nextStopDurationSeconds !== null ? (
                  <View style={styles.routeStat}>
                    <Ionicons
                      name="time-outline"
                      size={18}
                      color={colors.gold}
                    />
                    <Text style={styles.routeStatText}>
                      {formatDuration(nextStopDurationSeconds)}
                    </Text>
                  </View>
                ) : null}

                {nextStopDistanceMeters !== null ? (
                  <View style={styles.routeStat}>
                    <Ionicons
                      name="navigate-outline"
                      size={18}
                      color={colors.gold}
                    />
                    <Text style={styles.routeStatText}>
                      {formatDistance(nextStopDistanceMeters)}
                    </Text>
                  </View>
                ) : null}
              </View>

              {nextStopState !== 'arrived' ? (
                <View style={styles.nextStopActions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() =>
                      void startNextStopNavigation()
                    }
                    style={styles.primaryNextButton}
                  >
                    <Ionicons
                      name="navigate"
                      size={18}
                      color={colors.background}
                    />
                    <Text style={styles.primaryNextButtonText}>
                      {nextStopState === 'navigating'
                        ? 'Navigation Opened'
                        : 'Start Navigation'}
                    </Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    onPress={markArrived}
                    style={styles.arrivedButton}
                  >
                    <Ionicons
                      name="location-outline"
                      size={18}
                      color={colors.gold}
                    />
                    <Text style={styles.arrivedButtonText}>
                      I’m Here
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.arrivedPanel}>
                  <Text style={styles.arrivedTitle}>
                    You’re at the stop
                  </Text>

                  <Text style={styles.routeStatusText}>
                    Narration can be started manually here even if GPS or cellular service is unavailable.
                  </Text>

                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void playNarration()}
                    style={({ pressed }) => [
                      styles.narrationButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.narrationIconShell}>
                      <Ionicons
                        name="play"
                        size={22}
                        color={colors.background}
                      />
                    </View>

                    <View style={styles.narrationButtonCopy}>
                      <Text style={styles.narrationButtonTitle}>
                        Play Narration
                      </Text>
                      <Text style={styles.narrationButtonSubtitle}>
                        Hear the story for this stop
                      </Text>
                    </View>

                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={colors.background}
                    />
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    onPress={() =>
                      void markComplete(ordered[0].id)
                    }
                    style={styles.completeStopButton}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={colors.background}
                    />
                    <Text style={styles.primaryNextButtonText}>
                      Complete Stop
                    </Text>
                  </Pressable>
                </View>
              )}

              {nextStopState !== 'arrived' ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void playNarration()}
                  style={({ pressed }) => [
                    styles.manualNarrationLink,
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons
                    name="headset"
                    size={20}
                    color={colors.gold}
                  />
                  <View style={styles.manualNarrationCopy}>
                    <Text style={styles.manualNarrationTitle}>
                      Play Narration
                    </Text>
                    <Text style={styles.manualNarrationText}>
                      Manual playback is always available
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={colors.gold}
                  />
                </Pressable>
              ) : null}

              {narrationPlayerVisible ? (
                <NarrationPlayer
                  title={ordered[0].name}
                  loading={narrationLoading}
                  sourceUri={
                    narrationSource?.kind === 'cached'
                      ? narrationSource.localUri
                      : narrationSource?.kind === 'remote'
                        ? narrationSource.audioUrl
                        : null
                  }
                  durationHintSeconds={
                    narrationSource?.kind === 'cached' ||
                    narrationSource?.kind === 'remote'
                      ? narrationSource.durationSeconds
                      : null
                  }
                  offlineAvailable={
                    narrationSource?.kind === 'cached'
                  }
                  unavailableReason={
                    narrationSource?.kind === 'unavailable'
                      ? narrationSource.reason
                      : null
                  }
                  autoPlay
                />
              ) : null}
            </View>
          ) : null}

          {routeSource ? (
            <View
              style={[
                styles.routeStatusCard,
                routeSource === 'mapbox'
                  ? styles.routeStatusCardLive
                  : styles.routeStatusCardFallback,
              ]}
            >
              <View style={styles.routeStatusHeading}>
                <Ionicons
                  name={
                    routeSource === 'mapbox'
                      ? 'git-network-outline'
                      : 'warning-outline'
                  }
                  size={20}
                  color={
                    routeSource === 'mapbox'
                      ? colors.success
                      : colors.gold
                  }
                />

                <Text style={styles.routeStatusTitle}>
                  {routeSource === 'mapbox'
                    ? 'Real travel routing active'
                    : 'Straight-line fallback active'}
                </Text>
              </View>

              <Text style={styles.routeStatusText}>
                {routeSource === 'mapbox'
                  ? `${travelMode === 'walking' ? 'Walking' : 'Driving'} travel times are being used to optimize the remaining stops.`
                  : 'Mapbox routing is not active yet, so BROOMSTICK is temporarily ordering stops by geographic distance.'}
              </Text>

              {routeSource === 'mapbox' &&
              routeDurationSeconds !== null &&
              routeDistanceMeters !== null ? (
                <View style={styles.routeStats}>
                  <View style={styles.routeStat}>
                    <Ionicons
                      name="time-outline"
                      size={18}
                      color={colors.gold}
                    />
                    <Text style={styles.routeStatText}>
                      {formatDuration(routeDurationSeconds)}
                    </Text>
                  </View>

                  <View style={styles.routeStat}>
                    <Ionicons
                      name="navigate-outline"
                      size={18}
                      color={colors.gold}
                    />
                    <Text style={styles.routeStatText}>
                      {formatDistance(routeDistanceMeters)}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}

          <TourRouteMap
            origin={routeOrigin}
            routeCoordinates={routeCoordinates}
            stops={ordered.map((attraction) => ({
              id: attraction.id,
              name: attraction.name,
              latitude: attraction.latitude as number,
              longitude: attraction.longitude as number,
            }))}
          />

          <View style={styles.routeList}>
            {ordered.map((attraction, index) => (
              <View
                key={attraction.id}
                style={styles.routeStop}
              >
                <View style={styles.number}>
                  <Text style={styles.numberText}>
                    {index + 1}
                  </Text>
                </View>

                <View style={styles.routeCopy}>
                  <Text style={styles.stopName}>
                    {attraction.name}
                  </Text>

                  <Text style={styles.stopAddress}>
                    {attraction.address}
                  </Text>

                  <View style={styles.stopActions}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() =>
                        void markComplete(
                          attraction.id,
                        )
                      }
                      style={styles.completeButton}
                    >
                      <Ionicons
                        name="checkmark"
                        size={16}
                        color={colors.background}
                      />

                      <Text style={styles.completeButtonText}>
                        Complete
                      </Text>
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      onPress={() =>
                        void removeRemainingStop(
                          attraction.id,
                        )
                      }
                      style={styles.removeButton}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={16}
                        color={colors.textMuted}
                      />

                      <Text style={styles.removeButtonText}>
                        Remove
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
          </View>

          <Text style={styles.routeFootnote}>
            Adding, removing, completing, or manually
            recalculating a stop rebuilds the remaining
            route from your current GPS position.
          </Text>
        </View>
      ) : null}
    </Screen>
  );
}

function formatDuration(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0
    ? `${hours} hr ${remainingMinutes} min`
    : `${hours} hr`;
}

function formatDistance(meters: number) {
  const miles = meters / 1609.344;

  return miles < 0.1
    ? `${Math.round(meters * 3.28084)} ft`
    : `${miles.toFixed(miles < 10 ? 1 : 0)} mi`;
}

function ChoiceButton({
  icon,
  label,
  selected,
  onPress,
}: {
  icon:
    | 'walk'
    | 'car'
    | 'flash'
    | 'reorder-three';

  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.choiceButton,
        selected &&
          styles.choiceButtonSelected,
      ]}
    >
      <Ionicons
        name={icon}
        size={21}
        color={
          selected
            ? colors.gold
            : colors.textMuted
        }
      />

      <Text
        style={[
          styles.choiceText,
          selected &&
            styles.choiceTextSelected,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
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
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },

  headerCopy: {
    flex: 1,
  },

  eyebrow: {
    ...typography.eyebrow,
  },

  title: {
    ...typography.display,
    fontSize: 32,
    lineHeight: 38,
  },

  curatedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 2,
    borderColor: colors.gold,
    borderRadius: radius.md,
    backgroundColor: '#21172B',
    padding: spacing.md,
  },

  curatedNoticeCopy: {
    flex: 1,
    gap: 2,
  },

  curatedNoticeTitle: {
    ...typography.heading,
    color: colors.gold,
  },

  curatedNoticeText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '700',
  },

  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#6B4D27',
    borderRadius: radius.md,
    backgroundColor: '#211710',
  },

  noticeText: {
    ...typography.caption,
    flex: 1,
    color: '#EED8AC',
  },

  curatedStartButton: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },

  curatedStartCopy: {
    alignItems: 'center',
    gap: 2,
  },

  curatedStartTitle: {
    ...typography.heading,
    color: colors.background,
    fontSize: 21,
    lineHeight: 25,
    fontWeight: '900',
  },

  curatedStartText: {
    ...typography.caption,
    color: colors.background,
    fontWeight: '800',
    opacity: 0.8,
  },

  buildGuide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 2,
    borderColor: colors.gold,
    borderRadius: radius.lg,
    backgroundColor: '#2A1C38',
    padding: spacing.md,
  },

  buildGuideIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.gold,
  },

  buildGuideCopy: {
    flex: 1,
    gap: 2,
  },

  buildGuideTitle: {
    ...typography.heading,
    color: colors.gold,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '900',
  },

  buildGuideText: {
    ...typography.caption,
    color: colors.text,
  },

  bottomReminder: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: '#21172B',
    padding: spacing.md,
  },

  bottomReminderText: {
    ...typography.caption,
    flex: 1,
    color: colors.textMuted,
    fontWeight: '700',
  },

  section: {
    gap: spacing.sm,
  },

  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },

  curatedStopsHeading: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
  },

  sectionTitle: {
    ...typography.title,
    fontSize: 20,
    lineHeight: 26,
  },

  curatedStopsTitle: {
    ...typography.title,
    maxWidth: 330,
    fontSize: 20,
    lineHeight: 26,
    textAlign: 'center',
  },

  counter: {
    ...typography.caption,
    color: colors.gold,
    fontWeight: '800',
    textAlign: 'center',
  },

  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  choiceButton: {
    flex: 1,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },

  choiceButtonSelected: {
    borderColor: colors.gold,
    backgroundColor: '#2A1C1B',
  },

  choiceText: {
    ...typography.body,
    color: colors.textMuted,
    fontWeight: '700',
  },

  choiceTextSelected: {
    color: colors.gold,
  },

  stopList: {
    gap: spacing.sm,
  },

  applyStopsButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.md,
  },

  applyStopsButtonText: {
    ...typography.caption,
    color: colors.background,
    fontWeight: '900',
    textAlign: 'center',
  },

  searchArea: {
    gap: 7,
    borderWidth: 1,
    borderColor: '#6C5327',
    borderRadius: radius.lg,
    backgroundColor: '#1D1525',
    padding: spacing.md,
  },

  searchLabel: {
    ...typography.eyebrow,
    color: colors.gold,
    fontWeight: '900',
  },

  searchShell: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 2,
    borderColor: colors.gold,
    borderRadius: radius.md,
    backgroundColor: '#100C15',
    paddingHorizontal: spacing.sm,
  },

  searchIconShell: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.gold,
  },

  searchInput: {
    flex: 1,
    minHeight: 54,
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },

  searchHelp: {
    ...typography.caption,
    color: colors.textMuted,
  },

  stopCard: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },

  stopCardSelected: {
    borderColor: colors.gold,
    backgroundColor: '#241A25',
  },

  stopCardCompleted: {
    borderColor: colors.success,
    opacity: 0.72,
  },

  stopCopy: {
    flex: 1,
    gap: 2,
  },

  stopName: {
    ...typography.heading,
    fontSize: 16,
    lineHeight: 21,
  },

  stopAddress: {
    ...typography.caption,
  },

  completedLabel: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '800',
  },

  emptyCard: {
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },

  muted: {
    ...typography.caption,
  },

  buildButton: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.lg,
  },

  buildButtonDisabled: {
    opacity: 0.4,
  },

  buildButtonText: {
    ...typography.body,
    color: colors.background,
    fontWeight: '900',
  },

  pressed: {
    opacity: 0.82,
  },

  activeControls: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  updateRouteButton: {
    flex: 1,
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.md,
  },

  updateRouteButtonText: {
    ...typography.caption,
    color: colors.background,
    fontWeight: '900',
  },

  secondaryButton: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },

  secondaryButtonText: {
    ...typography.caption,
    fontWeight: '800',
  },

  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },

  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },

  modeText: {
    ...typography.caption,
    color: colors.gold,
    fontWeight: '800',
  },

  nextStopCard: {
    gap: spacing.sm,
    borderWidth: 2,
    borderColor: colors.gold,
    borderRadius: radius.lg,
    backgroundColor: '#21172B',
    padding: spacing.lg,
  },

  nextStopCardArrived: {
    borderColor: colors.success,
    backgroundColor: '#10251E',
  },

  nextStopTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },

  nextStopBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },

  nextStopBadgeText: {
    ...typography.caption,
    color: colors.background,
    fontWeight: '900',
  },

  nextStopProgress: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '800',
  },

  nextStopName: {
    ...typography.title,
    fontSize: 24,
    lineHeight: 29,
  },

  nextStopStats: {
    flexDirection: 'row',
    gap: spacing.lg,
    paddingVertical: spacing.xs,
  },

  nextStopActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  primaryNextButton: {
    flex: 1,
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.md,
  },

  primaryNextButtonText: {
    ...typography.body,
    color: colors.background,
    fontWeight: '900',
  },

  arrivedButton: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },

  arrivedButtonText: {
    ...typography.body,
    color: colors.gold,
    fontWeight: '900',
  },

  arrivedPanel: {
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },

  arrivedTitle: {
    ...typography.heading,
    color: colors.success,
    fontSize: 17,
  },

  narrationButton: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 2,
    borderColor: '#FFE7A3',
    borderRadius: radius.lg,
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },

  narrationIconShell: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: 'rgba(15, 8, 20, 0.16)',
  },

  narrationButtonCopy: {
    flex: 1,
    gap: 1,
  },

  narrationButtonTitle: {
    ...typography.heading,
    color: colors.background,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
  },

  narrationButtonSubtitle: {
    ...typography.caption,
    color: colors.background,
    fontWeight: '700',
    opacity: 0.78,
  },

  completeStopButton: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.success,
  },

  manualNarrationLink: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radius.md,
    backgroundColor: '#2A1C38',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },

  manualNarrationCopy: {
    flex: 1,
    gap: 1,
  },

  manualNarrationTitle: {
    ...typography.heading,
    color: colors.gold,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '900',
  },

  manualNarrationText: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '700',
  },

  routeStatusCard: {
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },

  routeStatusCardLive: {
    borderColor: colors.success,
    backgroundColor: '#10251E',
  },

  routeStatusCardFallback: {
    borderColor: '#6B4D27',
    backgroundColor: '#211710',
  },

  routeStatusHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  routeStatusTitle: {
    ...typography.heading,
    fontSize: 15,
    lineHeight: 20,
  },

  routeStatusText: {
    ...typography.caption,
  },

  routeStats: {
    flexDirection: 'row',
    gap: spacing.lg,
  },

  routeStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  routeStatText: {
    ...typography.body,
    color: colors.gold,
    fontWeight: '800',
  },

  routeList: {
    gap: spacing.sm,
  },

  routeStop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
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

  routeCopy: {
    flex: 1,
    gap: spacing.sm,
  },

  stopActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.success,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },

  completeButtonText: {
    ...typography.caption,
    color: colors.background,
    fontWeight: '900',
  },

  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },

  removeButtonText: {
    ...typography.caption,
    fontWeight: '800',
  },

  routeFootnote: {
    ...typography.caption,
    fontStyle: 'italic',
  },

  completedList: {
    gap: spacing.sm,
  },

  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },

  completedName: {
    ...typography.body,
    fontWeight: '700',
  },

  completeCard: {
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: radius.lg,
    backgroundColor: '#10251E',
    padding: spacing.xl,
  },

  completeTitle: {
    ...typography.title,
    color: colors.success,
  },
});
