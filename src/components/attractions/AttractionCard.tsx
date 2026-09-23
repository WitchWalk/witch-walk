import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppText as Text } from '@/components/AppText';
import type { Attraction } from '@/data/attractions';
import { validDistanceLabel } from '@/services/displayValues';
import { colors, radius, shadows, spacing, typography } from '@/theme/tokens';

type AttractionCardProps = {
  attraction: Attraction;
  favorite: boolean;
  onFavoritePress: () => void;
  onPress: () => void;
};

export function AttractionCard({ attraction, favorite, onFavoritePress, onPress }: AttractionCardProps) {
  const { width } = useWindowDimensions();
  const compactTitle = width <= 375;
  const distance = validDistanceLabel(attraction.distance);

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View details for ${attraction.name}`}
        onPress={onPress}
        style={({ pressed }) => [styles.cardBody, pressed && styles.pressed]}
      >
        <View style={styles.image}>
          <Image source={attraction.image} resizeMode="cover" style={styles.imagePhoto} />
          <View style={styles.imageShade} />
        </View>

        <View style={styles.content}>
          <Text
            adjustsFontSizeToFit
            ellipsizeMode="clip"
            minimumFontScale={0.9}
            numberOfLines={4}
            style={[styles.name, compactTitle ? styles.nameCompact : styles.nameRegular]}
          >
            {attraction.name}
          </Text>
          <View style={styles.metaRow}>
            <Ionicons name="location" size={13} color={colors.orange} />
            <Text ellipsizeMode="tail" numberOfLines={1} style={styles.address}>{attraction.address}</Text>
          </View>
          <Text ellipsizeMode="tail" numberOfLines={3} style={styles.description}>{attraction.description}</Text>

          <View style={styles.hoursRow}>
            <View style={[styles.statusDot, attraction.status === 'open' ? styles.openDot : styles.neutralDot]} />
            <Text ellipsizeMode="tail" numberOfLines={1} style={[styles.status, attraction.status === 'open' && styles.openText]}>{attraction.statusLabel}</Text>
            <Text ellipsizeMode="tail" numberOfLines={1} style={styles.hours}>• {attraction.hours}</Text>
          </View>

          <View style={styles.tagsRow}>
            {attraction.tags.slice(0, 2).map((tag) => (
              <View key={tag} style={styles.tag}><Text ellipsizeMode="tail" numberOfLines={1} style={styles.tagText}>{tag}</Text></View>
            ))}
          </View>

          <View style={styles.footer}>
            {distance ? <View style={styles.distanceRow}>
              <Ionicons name="walk" size={13} color={colors.gold} />
              <Text ellipsizeMode="tail" numberOfLines={1} style={styles.distance}>{distance}</Text>
            </View> : null}
            <View style={styles.detailsButton}>
              <Text adjustsFontSizeToFit minimumFontScale={0.75} numberOfLines={1} style={styles.detailsText}>View Details</Text>
              <Ionicons name="chevron-forward" size={12} color={colors.gold} />
            </View>
          </View>
        </View>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={favorite ? `Remove ${attraction.name} from favorites` : `Add ${attraction.name} to favorites`}
        hitSlop={8}
        onPress={onFavoritePress}
        style={styles.favoriteButton}
      >
        <Ionicons name={favorite ? 'heart' : 'heart-outline'} size={24} color={favorite ? '#F18BA3' : colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...shadows.card,
    height: 398,
    overflow: 'hidden',
    backgroundColor: '#0E0B14',
    borderWidth: 1,
    borderColor: '#51415F',
    borderRadius: radius.md,
  },
  cardBody: { height: '100%', flex: 1 },
  pressed: { opacity: 0.84, transform: [{ scale: 0.99 }] },
  image: { width: '100%', height: 136, overflow: 'hidden' },
  imagePhoto: { position: 'absolute', inset: 0, width: '100%', height: '100%' },
  imageShade: { position: 'absolute', inset: 0, backgroundColor: 'rgba(7, 4, 12, 0.14)' },
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
    backgroundColor: 'rgba(4, 3, 8, 0.72)',
  },
  content: { flex: 1, minHeight: 0, padding: 10 },
  name: { ...typography.title, height: 72, flexShrink: 0, overflow: 'hidden' },
  nameCompact: { fontSize: 13.5, lineHeight: 17 },
  nameRegular: { fontSize: 14.5, lineHeight: 18 },
  metaRow: { height: 15, flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: spacing.xs, overflow: 'hidden' },
  address: { ...typography.caption, flex: 1, fontSize: 11, lineHeight: 15 },
  description: { ...typography.caption, height: 51, overflow: 'hidden', marginTop: 6, fontSize: 12, lineHeight: 17 },
  hoursRow: { height: 18, flexDirection: 'row', alignItems: 'center', gap: 3, overflow: 'hidden', marginTop: 6 },
  statusDot: { width: 7, height: 7, flexShrink: 0, borderRadius: 4 },
  openDot: { backgroundColor: '#75E55E' },
  neutralDot: { backgroundColor: colors.gold },
  status: { maxWidth: '47%', flexShrink: 1, color: colors.gold, fontSize: 10, lineHeight: 15, fontWeight: '800' },
  openText: { color: '#8CEB72' },
  hours: { flex: 1, minWidth: 0, color: colors.textMuted, fontSize: 9.5, lineHeight: 15 },
  tagsRow: { height: 22, flexDirection: 'row', flexWrap: 'nowrap', gap: 4, overflow: 'hidden', marginTop: 6 },
  tag: { maxWidth: '49%', flexShrink: 1, justifyContent: 'center', backgroundColor: '#251C2D', borderRadius: radius.pill, paddingHorizontal: 6, paddingVertical: 3 },
  tagText: { color: colors.textMuted, fontSize: 9, fontWeight: '700' },
  footer: { height: 34, flexDirection: 'row', alignItems: 'center', gap: 3, overflow: 'hidden', marginTop: 'auto' },
  distanceRow: { minWidth: 0, flex: 1, flexDirection: 'row', alignItems: 'center', gap: 1 },
  distance: { minWidth: 0, flexShrink: 1, color: colors.textMuted, fontSize: 10, fontWeight: '700' },
  detailsButton: { maxWidth: '68%', flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 1, marginLeft: 'auto', borderWidth: 1, borderColor: colors.gold, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 6 },
  detailsText: { flexShrink: 1, color: colors.gold, fontSize: 8.5, fontWeight: '900' },
});
