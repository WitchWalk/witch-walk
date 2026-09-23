import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppText as Text } from '@/components/AppText';
import type { Restaurant } from '@/data/restaurants';
import { validDistanceLabel } from '@/services/displayValues';
import { colors, radius, shadows, spacing, typography } from '@/theme/tokens';

type RestaurantCardProps = {
  restaurant: Restaurant;
  favorite: boolean;
  onFavoritePress: () => void;
  onPress: () => void;
};

export function RestaurantCard({
  restaurant,
  favorite,
  onFavoritePress,
  onPress,
}: RestaurantCardProps) {
  const { width } = useWindowDimensions();
  const narrow = width < 370;
  const veryNarrow = width < 340;
  const distance = validDistanceLabel(restaurant.distance);

  return (
    <View style={[styles.card, narrow && styles.cardNarrow]}>
      <Pressable
        accessibilityLabel={`View details for ${restaurant.name}`}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.cardBody, pressed && styles.pressed]}
      >
        <View style={[styles.imageFrame, narrow && styles.imageFrameNarrow]}>
          <Image source={restaurant.image} resizeMode="cover" style={styles.image} />
          <View style={styles.imageShade} />
        </View>

        <View style={styles.content}>
          <Text
            style={[
              styles.name,
              narrow && styles.nameNarrow,
              veryNarrow && styles.nameVeryNarrow,
            ]}
          >
            {restaurant.name}
          </Text>

          <View style={styles.addressRow}>
            <Ionicons name="location" size={14} color={colors.orange} />
            <Text numberOfLines={1} style={styles.address}>
              {restaurant.address}
            </Text>
          </View>

          <View style={styles.travelRow}>
            {distance ? <View style={styles.travelItem}>
              <Ionicons name="walk" size={14} color={colors.gold} />
              <Text style={styles.travelText}>{distance}</Text>
            </View> : null}
            <View style={styles.travelItem}>
              <Ionicons name="walk-outline" size={14} color={colors.gold} />
              <Text style={styles.travelText}>{restaurant.walkingTime}</Text>
            </View>
          </View>

          <Text numberOfLines={2} style={styles.description}>
            {restaurant.description}
          </Text>

          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                restaurant.status === 'open'
                  ? styles.openDot
                  : restaurant.status === 'closed'
                    ? styles.closedDot
                    : styles.neutralDot,
              ]}
            />
            <Text
              numberOfLines={1}
              style={[
                styles.status,
                restaurant.status === 'open' && styles.openText,
                restaurant.status === 'closed' && styles.closedText,
              ]}
            >
              {restaurant.statusLabel}
            </Text>
            <Text numberOfLines={1} style={styles.hours}>
              • {restaurant.hours}
            </Text>
          </View>

          <View style={styles.bottomRow}>
            <View style={[styles.detailsButton, narrow && styles.detailsButtonNarrow]}>
              <Text numberOfLines={1} style={[styles.detailsText, narrow && styles.detailsTextNarrow]}>
                View Details
              </Text>
              <Ionicons name="chevron-forward" size={14} color={colors.black} />
            </View>
          </View>
        </View>
      </Pressable>

      <Pressable
        accessibilityLabel={
          favorite
            ? `Remove ${restaurant.name} from favorites`
            : `Add ${restaurant.name} to favorites`
        }
        accessibilityRole="button"
        hitSlop={8}
        onPress={onFavoritePress}
        style={styles.favoriteButton}
      >
        <Ionicons
          name={favorite ? 'heart' : 'heart-outline'}
          size={25}
          color={favorite ? '#F26B7A' : colors.text}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...shadows.card,
    height: 250,
    overflow: 'hidden',
    backgroundColor: '#0D0B12',
    borderWidth: 1,
    borderColor: '#5B4028',
    borderRadius: radius.md,
  },
  cardNarrow: { height: 264 },
  cardBody: { height: '100%', flexDirection: 'row' },
  pressed: { opacity: 0.82, transform: [{ scale: 0.995 }] },
  imageFrame: { width: '42%', height: '100%', overflow: 'hidden' },
  imageFrameNarrow: { width: '39%' },
  image: { width: '100%', height: '100%' },
  imageShade: { position: 'absolute', inset: 0, backgroundColor: 'rgba(6, 3, 8, 0.08)' },
  content: { flex: 1, minWidth: 0, padding: spacing.md, paddingRight: spacing.sm },
  name: {
    ...typography.title,
    height: 70,
    overflow: 'hidden',
    paddingRight: 40,
    fontSize: 20,
    lineHeight: 22,
  },
  nameNarrow: { fontSize: 17.5, lineHeight: 20 },
  nameVeryNarrow: { fontSize: 16.5, lineHeight: 19 },
  favoriteButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 2,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: 'rgba(4, 3, 8, 0.68)',
  },
  addressRow: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  address: { ...typography.caption, flex: 1, minWidth: 0, fontSize: 11.5, lineHeight: 16 },
  travelRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  travelItem: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  travelText: { color: colors.textMuted, fontSize: 10.5, fontWeight: '700' },
  description: {
    ...typography.caption,
    height: 38,
    marginTop: spacing.sm,
    color: '#DED5E1',
    fontSize: 12,
    lineHeight: 18,
  },
  statusRow: {
    minWidth: 0,
    height: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
    overflow: 'hidden',
  },
  statusDot: { width: 7, height: 7, flexShrink: 0, borderRadius: 4 },
  openDot: { backgroundColor: '#75E55E' },
  closedDot: { backgroundColor: '#F26B7A' },
  neutralDot: { backgroundColor: colors.gold },
  status: { maxWidth: '42%', flexShrink: 1, color: colors.gold, fontSize: 10, fontWeight: '900' },
  openText: { color: '#8CEB72' },
  closedText: { color: '#F58A96' },
  hours: { flex: 1, minWidth: 0, color: colors.textMuted, fontSize: 9.5 },
  bottomRow: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 'auto',
  },
  detailsButton: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    borderRadius: 9,
    backgroundColor: '#FFD58D',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  detailsButtonNarrow: { paddingHorizontal: 6 },
  detailsText: { color: colors.black, fontSize: 10.5, fontWeight: '900' },
  detailsTextNarrow: { fontSize: 9.5 },
});
