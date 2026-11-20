import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import MapView, {
  Marker,
  Polyline,
} from 'react-native-maps';
import {
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { AppText as Text } from '@/components/AppText';
import type { TourCoordinate } from '@/services/tourRouteCore';
import {
  colors,
  radius,
  spacing,
  typography,
} from '@/theme/tokens';

type TourMapStop = TourCoordinate & {
  id: string;
  name: string;
};

type TourRouteMapProps = {
  origin: TourCoordinate | null;
  routeCoordinates: TourCoordinate[];
  stops: TourMapStop[];
};

export function TourRouteMap({
  origin,
  routeCoordinates,
  stops,
}: TourRouteMapProps) {
  const mapRef = useRef<MapView | null>(null);
  const [followUser, setFollowUser] = useState(true);

  const allCoordinates = [
    ...(origin ? [origin] : []),
    ...stops,
  ];

  if (allCoordinates.length === 0) {
    return null;
  }

  const latitudes = allCoordinates.map(
    (coordinate) => coordinate.latitude,
  );

  const longitudes = allCoordinates.map(
    (coordinate) => coordinate.longitude,
  );

  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);

  const latitudeDelta = Math.max(
    (maxLatitude - minLatitude) * 1.5,
    0.01,
  );

  const longitudeDelta = Math.max(
    (maxLongitude - minLongitude) * 1.5,
    0.01,
  );

  const initialRegion = origin
    ? {
        latitude: origin.latitude,
        longitude: origin.longitude,
        latitudeDelta: Math.min(latitudeDelta, 0.008),
        longitudeDelta: Math.min(longitudeDelta, 0.008),
      }
    : {
        latitude:
          (minLatitude + maxLatitude) / 2,
        longitude:
          (minLongitude + maxLongitude) / 2,
        latitudeDelta,
        longitudeDelta,
      };

  const recenter = () => {
    if (!origin) return;

    setFollowUser(true);
    mapRef.current?.animateToRegion(
      {
        latitude: origin.latitude,
        longitude: origin.longitude,
        latitudeDelta: 0.006,
        longitudeDelta: 0.006,
      },
      350,
    );
  };

  useEffect(() => {
    if (!origin || !followUser) return;

    mapRef.current?.animateToRegion(
      {
        latitude: origin.latitude,
        longitude: origin.longitude,
        latitudeDelta: 0.006,
        longitudeDelta: 0.006,
      },
      500,
    );
  }, [origin?.latitude, origin?.longitude, followUser]);

  return (
    <View style={styles.shell}>
      <MapView
        initialRegion={initialRegion}
        onPanDrag={() => setFollowUser(false)}
        ref={mapRef}
        showsCompass
        showsUserLocation={false}
        style={StyleSheet.absoluteFill}
      >
        {routeCoordinates.length >= 2 ? (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor={colors.gold}
            strokeWidth={5}
          />
        ) : null}

        {origin ? (
          <Marker
            anchor={{ x: 0.5, y: 0.5 }}
            coordinate={origin}
            title="You are here"
          >
            <View style={styles.userDotOuter}>
              <View style={styles.userDotInner} />
            </View>
          </Marker>
        ) : null}

        {stops.map((stop, index) => (
          <Marker
            coordinate={stop}
            description={stop.name}
            key={stop.id}
            title={`Stop ${index + 1}`}
          >
            <View
              style={[
                styles.stopMarker,
                index === 0 && styles.nextStopMarker,
              ]}
            >
              <Text
                style={[
                  styles.stopMarkerText,
                  index === 0 &&
                    styles.nextStopMarkerText,
                ]}
              >
                {index === 0 ? 'NEXT' : index + 1}
              </Text>
            </View>
          </Marker>
        ))}
      </MapView>

      <View style={styles.legend}>
        <Text style={styles.legendText}>
          {followUser ? 'Following you' : 'Explore map'}
        </Text>
      </View>

      {origin ? (
        <Pressable
          accessibilityLabel="Recenter map on my location"
          accessibilityRole="button"
          onPress={recenter}
          style={[
            styles.recenterButton,
            followUser && styles.recenterButtonActive,
          ]}
        >
          <Ionicons
            name="locate"
            size={22}
            color={
              followUser
                ? colors.background
                : colors.gold
            }
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    height: 300,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },

  userDotOuter: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(62, 150, 255, 0.24)',
  },

  userDotInner: {
    width: 14,
    height: 14,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    borderRadius: 7,
    backgroundColor: '#2F86FF',
  },

  stopMarker: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
    borderRadius: radius.pill,
    backgroundColor: colors.gold,
  },

  stopMarkerText: {
    ...typography.heading,
    color: colors.background,
    fontSize: 14,
    lineHeight: 18,
  },

  nextStopMarker: {
    width: 54,
    borderColor: colors.text,
    backgroundColor: '#6F3DA8',
  },

  nextStopMarkerText: {
    color: colors.text,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '900',
  },

  legend: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(9,7,13,0.9)',
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },

  legendText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '800',
  },

  recenterButton: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(20, 13, 27, 0.94)',
  },

  recenterButtonActive: {
    backgroundColor: colors.gold,
  },
});
