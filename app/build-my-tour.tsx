import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
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
  buildTravelTimeTourRoute,
  getTourLegEstimate,
  type TourRouteSource,
} from '@/services/tourTravelTimeRoute';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export default function BuildMyTourScreen() {
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

  const selectable = useMemo(
    () =>
      attractions.filter(
        (attraction) =>
          attraction.latitude !== null &&
          attraction.longitude !== null,
      ),
    [attractions],
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
      return;
    }

    const origin = await getCurrentOrigin();
    setRouteOrigin(origin);

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

    const nextSelectedIds = selectedIds.includes(id)
      ? selectedIds.filter((item) => item !== id)
      : [...selectedIds, id];

    setSelectedIds(nextSelectedIds);

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

  const playNarration = () => {
    if (!ordered[0]) {
      return;
    }

    setNarrationPlayerVisible(true);
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
    setTourStarted(false);
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

      <View style={styles.section}>
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>
            Choose your stops
          </Text>

          <Text style={styles.counter}>
            {selectedIds.length} selected
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
            {selectable.map((attraction) => {
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
          </View>
        )}
      </View>

      {!tourStarted ? (
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
      ) : (
        <View style={styles.activeControls}>
          <Pressable
            accessibilityRole="button"
            disabled={building}
            onPress={() =>
              void recalculate()
            }
            style={styles.secondaryButton}
          >
            <Ionicons
              name="refresh"
              size={18}
              color={colors.gold}
            />

            <Text style={styles.secondaryButtonText}>
              Recalculate
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
              End Tour
            </Text>
          </Pressable>
        </View>
      )}

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
                    onPress={playNarration}
                    style={styles.narrationButton}
                  >
                    <Ionicons
                      name="play-circle"
                      size={20}
                      color={colors.background}
                    />
                    <Text style={styles.primaryNextButtonText}>
                      Play Narration
                    </Text>
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
                  onPress={playNarration}
                  style={styles.manualNarrationLink}
                >
                  <Ionicons
                    name="play-circle-outline"
                    size={18}
                    color={colors.textMuted}
                  />
                  <Text style={styles.manualNarrationText}>
                    Play Narration Manually
                  </Text>
                </Pressable>
              ) : null}

              {narrationPlayerVisible ? (
                <NarrationPlayer
                  title={ordered[0].name}
                  state="unavailable"
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

  section: {
    gap: spacing.sm,
  },

  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },

  sectionTitle: {
    ...typography.title,
    fontSize: 20,
    lineHeight: 26,
  },

  counter: {
    ...typography.caption,
    color: colors.gold,
    fontWeight: '800',
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
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.gold,
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
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },

  manualNarrationText: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '800',
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
