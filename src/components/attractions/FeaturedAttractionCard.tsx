import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Attraction } from '@/data/attractions';
import { colors, radius, shadows, spacing, typography } from '@/theme/tokens';

type FeaturedAttractionCardProps = {
  attraction: Attraction;
  favorite: boolean;
  onFavoritePress: () => void;
  onPress: () => void;
};

export function FeaturedAttractionCard({ attraction, favorite, onFavoritePress, onPress }: FeaturedAttractionCardProps) {
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
          <View style={styles.mustSeeBadge}>
            <Ionicons name="star" size={13} color={colors.text} />
            <Text style={styles.mustSeeText}>Must See</Text>
          </View>
        </View>

        <View style={styles.content}>
          <Text numberOfLines={2} style={styles.name}>{attraction.name}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="location" size={14} color={colors.orange} />
            <Text numberOfLines={1} style={styles.meta}>{attraction.address}</Text>
          </View>
          <Text numberOfLines={2} style={styles.description}>{attraction.description}</Text>
          <View style={styles.hoursRow}>
            <View style={styles.statusDot} />
            <Text style={styles.status}>{attraction.statusLabel}</Text>
            <Text style={styles.hours}>• {attraction.hours}</Text>
          </View>
          <View style={styles.footer}>
            <View style={styles.tagsRow}>
              {attraction.tags.slice(0, 2).map((tag) => (
                <View key={tag} style={styles.tag}><Text style={styles.tagText}>{tag}</Text></View>
              ))}
            </View>
            <View style={styles.detailsButton}>
              <Text style={styles.detailsText}>View Details</Text>
              <Ionicons name="chevron-forward" size={15} color={colors.gold} />
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
        <Ionicons name={favorite ? 'heart' : 'heart-outline'} size={27} color={favorite ? '#F18BA3' : colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...shadows.card,
    minHeight: 252,
    overflow: 'hidden',
    backgroundColor: '#0C0911',
    borderWidth: 1,
    borderColor: '#80602C',
    borderRadius: radius.md,
  },
  cardBody: { width: '100%', flex: 1, flexDirection: 'row' },
  pressed: { opacity: 0.86, transform: [{ scale: 0.995 }] },
  image: { width: '53%', minWidth: 166, maxWidth: '55%', minHeight: 252, flexBasis: '53%', flexShrink: 0, overflow: 'hidden', padding: spacing.sm },
  imagePhoto: { position: 'absolute', inset: 0, width: '100%', height: '100%' },
  imageShade: { position: 'absolute', inset: 0, backgroundColor: 'rgba(5, 3, 9, 0.1)' },
  mustSeeBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#54206E', borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 5 },
  mustSeeText: { color: colors.text, fontSize: 10, fontWeight: '900' },
  content: { flex: 1, justifyContent: 'center', padding: 10 },
  favoriteButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 2,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: 'rgba(4, 3, 8, 0.72)',
  },
  name: { ...typography.title, paddingRight: 31, fontSize: 19, lineHeight: 23 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: spacing.xs },
  meta: { ...typography.caption, flex: 1, fontSize: 11, lineHeight: 15 },
  description: { ...typography.caption, marginTop: spacing.sm, fontSize: 11, lineHeight: 16 },
  hoursRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginTop: spacing.sm },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#75E55E' },
  status: { color: '#8CEB72', fontSize: 11, fontWeight: '800' },
  hours: { color: colors.textMuted, fontSize: 10.5 },
  footer: { gap: spacing.xs, marginTop: spacing.sm },
  tagsRow: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  tag: { backgroundColor: '#251C2D', borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 3 },
  tagText: { color: colors.textMuted, fontSize: 9, fontWeight: '700' },
  detailsButton: { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.gold, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 7 },
  detailsText: { color: colors.gold, fontSize: 10, fontWeight: '900' },
});
