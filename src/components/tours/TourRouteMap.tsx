import MapView, {
  Marker,
  Polyline,
} from 'react-native-maps';
import {
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

  const initialRegion = {
    latitude:
      (minLatitude + maxLatitude) / 2,
    longitude:
      (minLongitude + maxLongitude) / 2,
    latitudeDelta,
    longitudeDelta,
  };

  return (
    <View style={styles.shell}>
      <MapView
        initialRegion={initialRegion}
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
            coordinate={origin}
            title="You are here"
          >
            <View style={styles.originMarker}>
              <Text style={styles.originMarkerText}>
                YOU
              </Text>
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
            <View style={styles.stopMarker}>
              <Text style={styles.stopMarkerText}>
                {index + 1}
              </Text>
            </View>
          </Marker>
        ))}
      </MapView>

      <View style={styles.legend}>
        <Text style={styles.legendText}>
          Route preview
        </Text>
      </View>
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

  originMarker: {
    minWidth: 42,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.text,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
  },

  originMarkerText: {
    ...typography.caption,
    color: colors.text,
    fontSize: 10,
    fontWeight: '900',
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
});
