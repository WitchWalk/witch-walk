import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { ImageBackground, Pressable, StyleSheet, View } from 'react-native';

import { AppText as Text } from '@/components/AppText';
import type { BathroomLocation } from '@/data/bathrooms';
import { getMappableBathrooms } from '@/services/bathroomContentCore';
import { distanceMilesLabel } from '@/services/displayValues';
import { colors, radius, shadows, spacing, typography } from '@/theme/tokens';

export type RestroomMapProps = {
  locations: BathroomLocation[];
  height?: number;
  onDirections: (location: BathroomLocation) => void;
  onViewDetails: (location: BathroomLocation) => void;
};

const mapArtwork = require('../../../assets/images/home/live-map.png');
const bounds = { minLatitude: 42.5188, maxLatitude: 42.5255, minLongitude: -70.904, maxLongitude: -70.887 };

export function RestroomMap({ locations, height = 500, onDirections, onViewDetails }: RestroomMapProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const mappable = getMappableBathrooms(locations);
  const selected = mappable.find((location) => location.id === selectedId);

  return (
    <ImageBackground resizeMode="cover" source={mapArtwork} style={[styles.container, { height }]}>
      <View style={styles.mapShade} />
      <View style={styles.streetLineOne} />
      <View style={styles.streetLineTwo} />
      {mappable.map((location) => {
        const point = mapPoint(location);
        return (
          <Pressable
            accessibilityLabel={`${location.mapLabel} restroom map pin`}
            accessibilityRole="button"
            key={location.id}
            onPress={() => setSelectedId(location.id)}
            style={[styles.pin, { left: `${point.x}%`, top: `${point.y}%` }]}
          >
            <MaterialCommunityIcons color={colors.black} name="toilet" size={16} />
          </Pressable>
        );
      })}

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
    </ImageBackground>
  );
}

function mapPoint(location: BathroomLocation & { latitude: number; longitude: number }) {
  const x = 8 + ((location.longitude - bounds.minLongitude) / (bounds.maxLongitude - bounds.minLongitude)) * 80;
  const y = 8 + ((bounds.maxLatitude - location.latitude) / (bounds.maxLatitude - bounds.minLatitude)) * 70;
  return { x, y };
}

type MapPreviewProps = {
  location: BathroomLocation;
  onClose: () => void;
  onDirections: () => void;
  onViewDetails: () => void;
};

function MapPreview({ location, onClose, onDirections, onViewDetails }: MapPreviewProps) {
  const distance = distanceMilesLabel(location.distanceMiles);
  return (
    <View style={styles.preview}>
      <Pressable accessibilityLabel="Close restroom preview" hitSlop={8} onPress={onClose} style={styles.closeButton}>
        <Ionicons color={colors.textMuted} name="close" size={19} />
      </Pressable>
      <Text numberOfLines={2} style={styles.previewName}>{location.mapLabel}</Text>
      <Text numberOfLines={2} style={styles.previewAddress}>{location.address}</Text>
      {distance ? <View style={styles.previewMetaRow}><Text style={styles.previewDistance}>{distance}</Text></View> : null}
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
  mapShade: { position: 'absolute', inset: 0, backgroundColor: 'rgba(11, 8, 17, 0.46)' },
  streetLineOne: {
    position: 'absolute',
    top: '42%',
    left: '-10%',
    width: '120%',
    height: 3,
    backgroundColor: 'rgba(245, 181, 68, 0.22)',
    transform: [{ rotate: '-12deg' }],
  },
  streetLineTwo: {
    position: 'absolute',
    top: '20%',
    left: '46%',
    width: 3,
    height: '68%',
    backgroundColor: 'rgba(112, 174, 255, 0.2)',
    transform: [{ rotate: '18deg' }],
  },
  pin: {
    position: 'absolute',
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.text,
    borderRadius: radius.pill,
    backgroundColor: colors.gold,
    transform: [{ translateX: -17 }, { translateY: -17 }],
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
    backgroundColor: 'rgba(9, 7, 13, 0.97)',
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
