import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppText as Text } from '@/components/AppText';
import type { BathroomLocation } from '@/data/bathrooms';
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
  const distance = typeof location.distanceMiles === 'number' && Number.isFinite(location.distanceMiles) && location.distanceMiles >= 0
    ? location.distanceMiles < 0.1
      ? `${Math.round(location.distanceMiles * 5280)} ft`
      : `${location.distanceMiles.toFixed(1)} mi`
    : null;
  const seasonalNote = location.seasonal
    ? location.seasonalNotes || 'This restroom is available seasonally.'
    : '';
  const accessNote = location.publicAccess === 'Limited / Conditional'
    ? location.accessNotes || 'Limited / Conditional access'
    : '';
  const essentialNote = seasonalNote || accessNote;

  return (
    <View style={[styles.card, location.seasonal && styles.seasonalCard]}>
      <Pressable
        accessibilityLabel={`View details for ${location.name}`}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.summary, narrow && styles.summaryNarrow, pressed && styles.pressed]}
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
          <Text style={[styles.name, narrow && styles.nameNarrow]}>{location.name}</Text>
          {location.restroomType && location.restroomType !== 'Unknown' ? (
            <Text numberOfLines={1} style={styles.typeLabel}>{location.restroomType}</Text>
          ) : null}
          <View style={styles.metaRow}>
            <Ionicons color={colors.orange} name="location" size={14} />
            <Text numberOfLines={3} style={styles.metaText}>{location.address}</Text>
          </View>
          {distance ? <View style={styles.distanceRow}>
            <Ionicons color="#8DBDFF" name="navigate" size={14} />
            <Text style={styles.distanceText}>{distance}</Text>
          </View> : null}
        </View>
      </Pressable>

      {essentialNote ? (
        <View style={[styles.noteRow, location.seasonal && styles.seasonalRow]}>
          <Ionicons color={location.seasonal ? colors.orange : colors.gold} name={location.seasonal ? 'calendar' : 'information-circle'} size={16} />
          <Text numberOfLines={2} style={[styles.noteText, location.seasonal && styles.seasonalText]}>{essentialNote}</Text>
        </View>
      ) : null}

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

const styles = StyleSheet.create({
  card: {
    ...shadows.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#43516B',
    borderRadius: radius.md,
    backgroundColor: '#0C1018',
    paddingBottom: spacing.sm,
  },
  seasonalCard: { borderColor: '#8B5A34' },
  summary: { minHeight: 174, flexDirection: 'row' },
  summaryNarrow: { minHeight: 184 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  imageFrame: { width: '38%', alignSelf: 'stretch', overflow: 'hidden' },
  imageFrameNarrow: { width: '35%' },
  image: { position: 'absolute', inset: 0, width: '100%', height: '100%' },
  imageShade: { position: 'absolute', inset: 0, backgroundColor: 'rgba(5, 5, 10, 0.12)' },
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
  info: { flex: 1, minWidth: 0, justifyContent: 'center', padding: spacing.md, paddingLeft: 10 },
  name: { ...typography.title, fontSize: 18, lineHeight: 21 },
  nameNarrow: { fontSize: 15.5, lineHeight: 18.5 },
  typeLabel: { color: '#A9B8DC', fontSize: 9.5, fontWeight: '900', marginTop: spacing.xs, textTransform: 'uppercase' },
  metaRow: { minWidth: 0, flexDirection: 'row', alignItems: 'flex-start', gap: 3, marginTop: spacing.sm },
  metaText: { ...typography.caption, flex: 1, minWidth: 0, fontSize: 10.5, lineHeight: 14 },
  distanceRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: spacing.sm },
  distanceText: { color: '#D4D9E7', fontSize: 10, fontWeight: '800' },
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
