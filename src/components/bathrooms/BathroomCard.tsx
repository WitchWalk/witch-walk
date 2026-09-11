import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import {
  getBathroomOperatingStatus,
  type BathroomStatusKind,
  type BathroomLocation,
} from '@/data/bathrooms';
import { colors, radius, shadows, spacing, typography } from '@/theme/tokens';

type BathroomCardProps = {
  favorite: boolean;
  location: BathroomLocation;
  onDirections: () => void;
  onFavoritePress: () => void;
  onPress: () => void;
};

export function BathroomCard({ favorite, location, onDirections, onFavoritePress, onPress }: BathroomCardProps) {
  const { width } = useWindowDimensions();
  const narrow = width < 375;
  const operatingStatus = getBathroomOperatingStatus(location);
  const seasonal = location.restroomCategory === 'seasonal_public';

  return (
    <View style={[styles.card, narrow && styles.cardNarrow, seasonal && styles.seasonalCard]}>
      <Pressable
        accessibilityLabel={`View details for ${location.name}`}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.summary, pressed && styles.pressed]}
      >
        <View style={[styles.imageFrame, narrow && styles.imageFrameNarrow]}>
          <Image resizeMode="cover" source={location.image} style={styles.image} />
          <View style={styles.imageShade} />
          <View style={styles.restroomBadge}>
            <MaterialCommunityIcons color="#F4D46C" name="toilet" size={24} />
          </View>
          <Pressable
            accessibilityLabel={favorite ? `Remove ${location.name} from favorites` : `Add ${location.name} to favorites`}
            accessibilityRole="button"
            hitSlop={6}
            onPress={(event) => {
              event.stopPropagation();
              onFavoritePress();
            }}
            style={styles.favoriteButton}
          >
            <Ionicons color={favorite ? '#F18BA3' : colors.text} name={favorite ? 'heart' : 'heart-outline'} size={23} />
          </Pressable>
        </View>

        <View style={styles.info}>
          <View style={styles.titleArea}>
            <Text style={[styles.name, narrow && styles.nameNarrow]}>{location.name}</Text>
          </View>

          <View style={styles.metaRow}>
            <Ionicons color={colors.orange} name="location" size={14} />
            <Text numberOfLines={2} style={styles.metaText}>{location.address}</Text>
          </View>

          <View style={styles.statusRow}>
            <View style={[styles.statusDot, statusDotStyle(operatingStatus.kind)]} />
            <Text style={[styles.statusText, statusTextStyle(operatingStatus.kind)]}>
              {operatingStatus.label}
            </Text>
          </View>
          <Text numberOfLines={2} style={styles.hours}>{location.schedule.summary}</Text>

          <View style={styles.travelRow}>
            <View style={styles.travelItem}>
              <Ionicons color="#8DBDFF" name="navigate" size={14} />
              <Text style={styles.travelText}>
                {location.distanceMiles === undefined ? 'Distance unavailable' : `${location.distanceMiles.toFixed(1)} mi`}
              </Text>
            </View>
            {location.walkingTimeMinutes === undefined ? null : (
              <View style={styles.travelItem}>
                <Ionicons color={colors.gold} name="walk" size={15} />
                <Text style={styles.travelText}>{location.walkingTimeMinutes} min walk</Text>
              </View>
            )}
          </View>

          <View style={styles.accessRow}>
            <Ionicons color="#70AEFF" name="accessibility" size={15} />
            <Text style={styles.accessText}>
              {location.accessible === true ? 'Accessible' : 'Accessibility unverified'}
            </Text>
          </View>
        </View>
      </Pressable>

      <View style={[styles.noteRow, seasonal && styles.seasonalRow]}>
        <Ionicons
          color={seasonal ? colors.orange : colors.gold}
          name={seasonal ? 'calendar' : 'information-circle'}
          size={16}
        />
        <Text numberOfLines={2} style={[styles.noteText, seasonal && styles.seasonalText]}>
          {seasonal ? 'SEASONAL RESTROOM • Approximately May–November' : location.notes}
        </Text>
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          accessibilityLabel={`Get directions to ${location.name}`}
          accessibilityRole="button"
          onPress={onDirections}
          style={({ pressed }) => [styles.directionsButton, pressed && styles.pressed]}
        >
          <Ionicons color={colors.black} name="navigate" size={17} />
          <Text style={styles.directionsText}>Directions</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={`View details for ${location.name}`}
          accessibilityRole="button"
          onPress={onPress}
          style={({ pressed }) => [styles.detailsButton, pressed && styles.pressed]}
        >
          <Text style={styles.detailsText}>View Details</Text>
          <Ionicons color={colors.text} name="chevron-forward" size={16} />
        </Pressable>
      </View>
    </View>
  );
}

function statusDotStyle(kind: BathroomStatusKind) {
  if (kind === 'open') return styles.openDot;
  if (kind === 'closed') return styles.closedDot;
  if (kind === 'seasonal') return styles.seasonalDot;
  return styles.unknownDot;
}

function statusTextStyle(kind: BathroomStatusKind) {
  if (kind === 'open') return styles.openText;
  if (kind === 'closed') return styles.closedText;
  if (kind === 'seasonal') return styles.seasonalStatusText;
  return styles.unknownText;
}

const styles = StyleSheet.create({
  card: {
    ...shadows.card,
    height: 326,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#43516B',
    borderRadius: radius.md,
    backgroundColor: '#0C1018',
    paddingBottom: spacing.sm,
  },
  cardNarrow: { height: 340 },
  seasonalCard: { borderColor: '#8B5A34' },
  summary: { flex: 1, minHeight: 0, flexDirection: 'row' },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  imageFrame: { width: '35%', height: '100%', overflow: 'hidden' },
  imageFrameNarrow: { width: '32%' },
  image: { width: '100%', height: '100%' },
  imageShade: { position: 'absolute', inset: 0, backgroundColor: 'rgba(5, 5, 10, 0.18)' },
  restroomBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#7C6330',
    borderRadius: radius.pill,
    backgroundColor: 'rgba(9, 7, 13, 0.84)',
  },
  favoriteButton: { position: 'absolute', right: spacing.sm, bottom: spacing.sm, width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, backgroundColor: 'rgba(9,7,13,0.84)' },
  info: { flex: 1, minWidth: 0, padding: spacing.md, paddingLeft: 10 },
  titleArea: { height: 82, justifyContent: 'flex-start', overflow: 'hidden' },
  name: { ...typography.title, fontSize: 18, lineHeight: 21 },
  nameNarrow: { fontSize: 15.5, lineHeight: 18.5 },
  metaRow: { minWidth: 0, flexDirection: 'row', alignItems: 'flex-start', gap: 3 },
  metaText: { ...typography.caption, flex: 1, minWidth: 0, fontSize: 10.5, lineHeight: 14 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  statusDot: { width: 8, height: 8, borderRadius: radius.pill },
  openDot: { backgroundColor: '#75E55E' },
  closedDot: { backgroundColor: '#FF7968' },
  seasonalDot: { backgroundColor: colors.orange },
  unknownDot: { backgroundColor: colors.gold },
  statusText: { fontSize: 11, fontWeight: '900' },
  openText: { color: '#8CEB72' },
  closedText: { color: '#FF8D7D' },
  seasonalStatusText: { color: '#F0A35C' },
  unknownText: { color: colors.gold },
  hours: { color: colors.textMuted, fontSize: 9.5, lineHeight: 13, marginTop: 2 },
  travelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: 6 },
  travelItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  travelText: { color: '#D4D9E7', fontSize: 10, fontWeight: '800' },
  accessRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  accessText: { color: '#9EC7FF', fontSize: 10, fontWeight: '800' },
  noteRow: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginHorizontal: spacing.sm,
    marginTop: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: '#171621',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  seasonalRow: { backgroundColor: '#291C13' },
  noteText: { flex: 1, color: colors.textMuted, fontSize: 10.5, fontWeight: '800' },
  seasonalText: { color: '#F0A35C', letterSpacing: 0.2 },
  actionsRow: { flexDirection: 'row', gap: spacing.sm, marginHorizontal: spacing.sm, marginTop: spacing.sm },
  directionsButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: radius.sm,
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.sm,
  },
  directionsText: { color: colors.black, fontSize: 11.5, fontWeight: '900' },
  detailsButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: '#65547A',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
  },
  detailsText: { color: colors.text, fontSize: 10.5, fontWeight: '900' },
});
