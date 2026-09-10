import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import type { MapCategory, MapLocation } from '@/data/mapLocations';
import type { LocationFix } from '@/services/location';

export type WitchWalkMapProps = {
  locations: MapLocation[];
  userLocation: LocationFix | null;
  focusRequestKey: number;
  onSelectLocation: (location: MapLocation) => void;
  style?: StyleProp<ViewStyle>;
};

export const downtownSalemRegion = {
  latitude: 42.5215,
  longitude: -70.894,
  latitudeDelta: 0.018,
  longitudeDelta: 0.022,
};

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#171422' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#D5CBD8' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#09070D' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#43374E' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1B1522' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#57435A' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#10243C' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1E342B' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
];

export function WitchWalkMap({
  locations,
  userLocation,
  focusRequestKey,
  onSelectLocation,
  style,
}: WitchWalkMapProps) {
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (!userLocation || focusRequestKey === 0) return;
    mapRef.current?.animateToRegion(
      {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.008,
        longitudeDelta: 0.01,
      },
      450,
    );
  }, [focusRequestKey, userLocation]);

  return (
    <MapView
      customMapStyle={darkMapStyle}
      initialRegion={downtownSalemRegion}
      pitchEnabled={false}
      ref={mapRef}
      rotateEnabled={false}
      showsCompass
      showsUserLocation={Boolean(userLocation)}
      style={style}
    >
      {locations.map((location) => (
        <Marker
          accessibilityLabel={`${location.name} ${location.categoryLabel} map pin`}
          coordinate={{ latitude: location.latitude, longitude: location.longitude }}
          key={location.mapId}
          onPress={() => onSelectLocation(location)}
        >
          <View style={[styles.pin, { backgroundColor: pinColor(location) }]}>
            <MaterialCommunityIcons
              color="#09070D"
              name={categoryIcon(location.category)}
              size={19}
            />
            {location.crowdLevel ? (
              <View style={[styles.crowdDot, { backgroundColor: crowdColor(location.crowdLevel) }]} />
            ) : null}
          </View>
        </Marker>
      ))}
    </MapView>
  );
}

function categoryIcon(category: MapCategory) {
  if (category === 'attractions') return 'map-marker-star' as const;
  if (category === 'restaurants') return 'silverware-fork-knife' as const;
  if (category === 'parking') return 'car' as const;
  return 'toilet' as const;
}

function categoryColor(category: MapCategory) {
  if (category === 'attractions') return '#C86AF0';
  if (category === 'restaurants') return '#FF9D4D';
  if (category === 'parking') return '#65B7FF';
  return '#F4D46C';
}

function pinColor(location: MapLocation) {
  if (location.category === 'attractions' && location.crowdLevel) return crowdColor(location.crowdLevel);
  return categoryColor(location.category);
}

function crowdColor(level: 'light' | 'moderate' | 'busy') {
  if (level === 'light') return '#62D890';
  if (level === 'moderate') return '#F5B544';
  return '#FF6673';
}

const styles = StyleSheet.create({
  pin: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF8E8',
    borderRadius: 21,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.38,
    shadowRadius: 6,
    elevation: 8,
  },
  crowdDot: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 12,
    height: 12,
    borderWidth: 2,
    borderColor: '#09070D',
    borderRadius: 6,
  },
});
