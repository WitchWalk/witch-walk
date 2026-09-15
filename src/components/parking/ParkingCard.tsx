import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import {
  getParkingOperatingStatus,
  type ParkingLocation,
} from '@/data/parking';
import { colors, radius, shadows, spacing, typography } from '@/theme/tokens';

type ParkingCardProps = {
  location: ParkingLocation;
  featured?: boolean;
  favorite: boolean;
  onPress: () => void;
  onDirections: () => void;
  onFavoritePress: () => void;
  onViewMap: () => void;
};

export function ParkingCard({
  location,
  featured = false,
  favorite,
  onPress,
  onDirections,
  onFavoritePress,
  onViewMap,
}: ParkingCardProps) {
  const { width } = useWindowDimensions();
  const narrow = width < 370;
  const operatingStatus = getParkingOperatingStatus(location);

  return (
    <View style={[styles.card, featured && styles.featuredCard, narrow && styles.cardNarrow]}>
      <Pressable
        accessibilityLabel={`View details for ${location.name}`}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.summaryButton, pressed && styles.pressed]}
      >
        <View style={[styles.imageFrame, narrow && styles.imageFrameNarrow]}>
          <Image resizeMode="cover" source={location.image} style={styles.image} />
          <View style={styles.imageShade} />
          {featured ? (
            <View style={styles.featuredBadge}>
              <Ionicons color={colors.text} name="star" size={12} />
              <Text style={styles.featuredBadgeText}>Featured Parking</Text>
            </View>
          ) : null}
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
          <View style={styles.titleRow}>
            <Text style={[styles.name, narrow && styles.nameNarrow]}>{location.name}</Text>
            <Ionicons color={colors.textMuted} name="chevron-forward" size={21} />
          </View>
          <Text numberOfLines={1} style={styles.typeLabel}>{location.type === 'Unknown' ? 'Parking type unavailable' : location.type}</Text>
          <View style={styles.metaRow}>
            <Ionicons color={colors.orange} name="location" size={14} />
            <Text numberOfLines={1} style={styles.metaText}>{location.address}</Text>
          </View>
          <View style={styles.travelRow}>
            <View style={styles.travelItem}>
              <Ionicons color="#70AEFF" name="navigate" size={13} />
              <Text style={styles.travelText}>{location.distance}</Text>
            </View>
            <View style={styles.travelItem}>
              <Ionicons color={colors.gold} name="walk" size={14} />
              <Text style={styles.travelText}>{location.walkingTime} to {location.walkingDestination}</Text>
            </View>
          </View>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, operatingStatus.kind === 'open' ? styles.openDot : operatingStatus.kind === 'closed' ? styles.closedDot : styles.unknownDot]} />
            <Text style={[styles.statusText, operatingStatus.kind === 'open' && styles.openText, operatingStatus.kind === 'closed' && styles.closedText]}>{operatingStatus.label}</Text>
          </View>
          <Text numberOfLines={2} style={styles.hours}>{location.schedule.summary}</Text>
          <Text numberOfLines={2} style={styles.rate}>{location.rateInformation}</Text>
          <View style={styles.featuresRow}>
            {location.accessible === true ? <Feature icon="accessibility" label="Accessible" /> : null}
            {location.evCharging === 'yes' ? <Feature icon="flash" label="EV Charging" /> : null}
            {location.capacity !== null ? <Feature icon="car" label={location.capacityLabel ?? `Capacity: ${location.capacity}`} /> : null}
          </View>
        </View>
      </Pressable>

      <View style={styles.availabilityBanner}>
        <Ionicons color="#70AEFF" name="cloud-offline-outline" size={15} />
        <Text numberOfLines={1} style={styles.availabilityText}>{location.availability.label}</Text>
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          accessibilityLabel={`Get directions to ${location.name}`}
          accessibilityRole="button"
          onPress={onDirections}
          style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}
        >
          <Ionicons color={colors.black} name="navigate" size={17} />
          <Text style={styles.primaryActionText}>Directions</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={`View ${location.name} on map`}
          accessibilityRole="button"
          onPress={onViewMap}
          style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}
        >
          <Ionicons color="#A8B5D6" name="map-outline" size={17} />
          <Text style={styles.secondaryActionText}>View on Map</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Feature({ icon, label }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string }) {
  return (
    <View style={styles.feature}>
      <Ionicons color="#77AFFF" name={icon} size={14} />
      <Text numberOfLines={1} style={styles.featureText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...shadows.card,
    height: 306,
    overflow: 'hidden',
    backgroundColor: '#0C1018',
    borderWidth: 1,
    borderColor: '#41516D',
    borderRadius: radius.md,
    paddingBottom: spacing.sm,
  },
  featuredCard: { borderColor: '#8052A1' },
  cardNarrow: { height: 320 },
  summaryButton: { flex: 1, minHeight: 0, flexDirection: 'row' },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  imageFrame: { width: '39%', height: '100%', overflow: 'hidden' },
  imageFrameNarrow: { width: '36%' },
  image: { width: '100%', height: '100%' },
  imageShade: { position: 'absolute', inset: 0, backgroundColor: 'rgba(4, 5, 10, 0.08)' },
  featuredBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.pill,
    backgroundColor: '#6F278E',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  featuredBadgeText: { color: colors.text, fontSize: 8.5, fontWeight: '900', textTransform: 'uppercase' },
  favoriteButton: { position: 'absolute', right: spacing.sm, bottom: spacing.sm, width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, backgroundColor: 'rgba(7,5,11,0.82)' },
  info: { flex: 1, minWidth: 0, padding: spacing.md, paddingLeft: 10 },
  titleRow: { height: 48, overflow: 'hidden', flexDirection: 'row', alignItems: 'flex-start', gap: 2 },
  name: { ...typography.title, flex: 1, fontSize: 19, lineHeight: 23 },
  nameNarrow: { fontSize: 16.5, lineHeight: 19 },
  typeLabel: { color: '#8FAFE1', fontSize: 9.5, fontWeight: '800', marginTop: 1 },
  metaRow: { minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  metaText: { ...typography.caption, flex: 1, minWidth: 0, fontSize: 10.5, lineHeight: 15 },
  travelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: 5 },
  travelItem: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  travelText: { color: colors.textMuted, fontSize: 9.5, fontWeight: '700' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  openDot: { backgroundColor: '#75E55E' },
  closedDot: { backgroundColor: '#F26B7A' },
  unknownDot: { backgroundColor: colors.gold },
  statusText: { color: colors.gold, fontSize: 10.5, fontWeight: '900' },
  openText: { color: '#8CEB72' },
  closedText: { color: '#F58A96' },
  hours: { color: colors.textMuted, fontSize: 9.5, lineHeight: 13, marginTop: 2 },
  rate: { color: colors.text, fontSize: 10, lineHeight: 14, fontWeight: '700', marginTop: 4 },
  featuresRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  featureText: { color: '#A8B5D6', fontSize: 8.5, fontWeight: '700' },
  availabilityBanner: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginHorizontal: spacing.sm,
    marginTop: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: '#111A29',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  availabilityText: { flex: 1, color: '#A8B5D6', fontSize: 10.5, fontWeight: '800' },
  actionsRow: { flexDirection: 'row', gap: spacing.sm, marginHorizontal: spacing.sm, marginTop: spacing.sm },
  primaryAction: {
    flex: 1,
    minWidth: 0,
    minHeight: 39,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: radius.sm,
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.sm,
  },
  primaryActionText: { color: colors.black, fontSize: 11, fontWeight: '900' },
  secondaryAction: {
    flex: 1,
    minWidth: 0,
    minHeight: 39,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#64708A',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
  },
  secondaryActionText: { color: '#C5CDE2', fontSize: 10.5, fontWeight: '800' },
});
