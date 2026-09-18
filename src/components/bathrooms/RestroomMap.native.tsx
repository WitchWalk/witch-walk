import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import type { BathroomLocation } from '@/data/bathrooms';
import { getMappableBathrooms } from '@/services/bathroomContentCore';
import { colors, radius, shadows, spacing, typography } from '@/theme/tokens';

export type RestroomMapProps = {
  locations: BathroomLocation[];
  height?: number;
  onDirections: (location: BathroomLocation) => void;
  onViewDetails: (location: BathroomLocation) => void;
};

const salemRegion = {
  latitude: 42.5215,
  longitude: -70.8945,
  latitudeDelta: 0.012,
  longitudeDelta: 0.018,
};

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#17121E' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#CFC2D2' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0B0810' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#3B3048' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#17121E' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#111F35' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
];

export function RestroomMap({ locations, height = 500, onDirections, onViewDetails }: RestroomMapProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const mappable = getMappableBathrooms(locations);
  const selected = mappable.find((location) => location.id === selectedId);

  return (
    <View style={[styles.container, { height }]}>
      <MapView
        customMapStyle={darkMapStyle}
        initialRegion={salemRegion}
        pitchEnabled={false}
        rotateEnabled={false}
        style={StyleSheet.absoluteFill}
      >
        {mappable.map((location) => (
          <Marker
            accessibilityLabel={`${location.mapLabel} restroom map pin`}
            coordinate={{ latitude: location.latitude, longitude: location.longitude }}
            key={location.id}
            onPress={() => setSelectedId(location.id)}
            tracksViewChanges={false}
          >
            <View style={styles.pin}>
              <MaterialCommunityIcons color={colors.black} name="toilet" size={18} />
            </View>
          </Marker>
        ))}
      </MapView>

      {selected ? (
        <MapPreview
          location={selected}
          onClose={() => setSelectedId(null)}
          onDirections={() => onDirections(selected)}
          onViewDetails={() => onViewDetails(selected)}
        />
      ) : (
        <View style={styles.mapHint}>
          <MaterialCommunityIcons color={colors.gold} name="toilet" size={18} />
          <Text style={styles.mapHintText}>Tap a restroom pin for details</Text>
        </View>
      )}
    </View>
  );
}

type MapPreviewProps = {
  location: BathroomLocation;
  onClose: () => void;
  onDirections: () => void;
  onViewDetails: () => void;
};

function MapPreview({ location, onClose, onDirections, onViewDetails }: MapPreviewProps) {
  return (
    <View style={styles.preview}>
      <Pressable accessibilityLabel="Close restroom preview" hitSlop={8} onPress={onClose} style={styles.closeButton}>
        <Ionicons color={colors.textMuted} name="close" size={19} />
      </Pressable>
      <Text numberOfLines={2} style={styles.previewName}>{location.mapLabel}</Text>
      <Text numberOfLines={2} style={styles.previewAddress}>{location.address}</Text>
      <View style={styles.previewMetaRow}>
        <Text style={styles.previewDistance}>
          {location.distanceMiles === undefined ? 'Distance unavailable' : `${location.distanceMiles.toFixed(1)} mi`}
        </Text>
      </View>
      <View style={styles.previewActions}>
        <Pressable accessibilityRole="button" onPress={onDirections} style={styles.primaryButton}>
          <Ionicons color={colors.black} name="navigate" size={15} />
          <Text style={styles.primaryButtonText}>Directions</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onViewDetails} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>View Details</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...shadows.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#55406B',
    borderRadius: radius.lg,
    backgroundColor: '#17121E',
  },
  pin: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.text,
    borderRadius: radius.pill,
    backgroundColor: colors.gold,
  },
  mapHint: {
    position: 'absolute',
    top: spacing.md,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(9, 7, 13, 0.92)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  mapHintText: { color: colors.text, fontSize: 11, fontWeight: '800' },
  preview: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    left: spacing.md,
    borderWidth: 1,
    borderColor: '#69517E',
    borderRadius: radius.md,
    backgroundColor: 'rgba(9, 7, 13, 0.96)',
    padding: spacing.md,
  },
  closeButton: { position: 'absolute', top: spacing.sm, right: spacing.sm, zIndex: 1 },
  previewName: { ...typography.title, fontSize: 18, lineHeight: 22, paddingRight: spacing.xl },
  previewAddress: { ...typography.caption, fontSize: 10.5, lineHeight: 15, marginTop: 3 },
  previewMetaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.xs },
  previewDistance: { color: colors.textMuted, fontSize: 10.5, fontWeight: '800' },
  previewActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  primaryButton: {
    flex: 1,
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: radius.sm,
    backgroundColor: colors.gold,
  },
  primaryButtonText: { color: colors.black, fontSize: 11, fontWeight: '900' },
  secondaryButton: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#665177',
    borderRadius: radius.sm,
  },
  secondaryButtonText: { color: colors.text, fontSize: 10.5, fontWeight: '900' },
});
