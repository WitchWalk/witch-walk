import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ImageBackground, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { MapCategory, MapLocation } from '@/data/mapLocations';
import type { LocationFix } from '@/services/location';

const mapArtwork = require('../../../assets/images/home/live-map.png');

export type WitchWalkMapProps = {
  locations: MapLocation[];
  userLocation: LocationFix | null;
  focusRequestKey: number;
  onSelectLocation: (location: MapLocation) => void;
  style?: StyleProp<ViewStyle>;
};

const bounds = {
  north: 42.5265,
  south: 42.5175,
  west: -70.905,
  east: -70.879,
};

export function WitchWalkMap({ locations, userLocation, onSelectLocation, style }: WitchWalkMapProps) {
  return (
    <ImageBackground resizeMode="cover" source={mapArtwork} style={[styles.map, style]}>
      <View style={styles.shade} />
      <View style={styles.streetOne} />
      <View style={styles.streetTwo} />
      {locations.map((location) => {
        const position = mapPosition(location.latitude, location.longitude);
        return (
          <Pressable
            accessibilityLabel={`${location.name} ${location.categoryLabel} map pin`}
            accessibilityRole="button"
            key={location.mapId}
            onPress={() => onSelectLocation(location)}
            style={[
              styles.pin,
              position,
              { backgroundColor: categoryColor(location.category) },
            ]}
          >
            <MaterialCommunityIcons color="#09070D" name={categoryIcon(location.category)} size={16} />
            {location.crowdLevel ? (
              <View style={[styles.crowdDot, { backgroundColor: crowdColor(location.crowdLevel) }]} />
            ) : null}
          </Pressable>
        );
      })}
      {userLocation ? (
        <View style={[styles.userPin, mapPosition(userLocation.latitude, userLocation.longitude)]} />
      ) : null}
    </ImageBackground>
  );
}

function mapPosition(latitude: number, longitude: number) {
  const rawLeft = ((longitude - bounds.west) / (bounds.east - bounds.west)) * 100;
  const rawTop = ((bounds.north - latitude) / (bounds.north - bounds.south)) * 100;
  return {
    left: `${Math.min(96, Math.max(4, rawLeft))}%` as `${number}%`,
    top: `${Math.min(94, Math.max(7, rawTop))}%` as `${number}%`,
  };
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

function crowdColor(level: 'light' | 'moderate' | 'busy') {
  if (level === 'light') return '#62D890';
  if (level === 'moderate') return '#F5B544';
  return '#FF6673';
}

const styles = StyleSheet.create({
  map: { overflow: 'hidden', backgroundColor: '#111B2A' },
  shade: { position: 'absolute', inset: 0, backgroundColor: 'rgba(8, 7, 14, 0.38)' },
  streetOne: {
    position: 'absolute',
    top: '47%',
    left: '-8%',
    width: '118%',
    height: 4,
    backgroundColor: 'rgba(255, 248, 232, 0.17)',
    transform: [{ rotate: '-10deg' }],
  },
  streetTwo: {
    position: 'absolute',
    top: '4%',
    left: '48%',
    width: 4,
    height: '94%',
    backgroundColor: 'rgba(101, 183, 255, 0.15)',
    transform: [{ rotate: '17deg' }],
  },
  pin: {
    position: 'absolute',
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF8E8',
    borderRadius: 18,
    transform: [{ translateX: -18 }, { translateY: -18 }],
  },
  crowdDot: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 11,
    height: 11,
    borderWidth: 2,
    borderColor: '#09070D',
    borderRadius: 6,
  },
  userPin: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderWidth: 4,
    borderColor: '#FFF',
    borderRadius: 10,
    backgroundColor: '#3478F6',
    transform: [{ translateX: -10 }, { translateY: -10 }],
  },
});
