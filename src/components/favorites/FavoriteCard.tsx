import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppText as Text } from '@/components/AppText';
import type { FavoriteLocation } from '@/data/favoriteLocations';
import { colors, radius, shadows, typography } from '@/theme/tokens';

type FavoriteCardProps = {
  location: FavoriteLocation;
  onRemove: () => void;
  onViewDetails: () => void;
};

export function FavoriteCard({ location, onRemove, onViewDetails }: FavoriteCardProps) {
  const { width } = useWindowDimensions();
  const narrow = width <= 390;

  return (
    <View style={[styles.card, narrow && styles.cardNarrow]}>
      <Image resizeMode="cover" source={location.image} style={styles.image} />
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={[styles.name, narrow && styles.nameNarrow]}>{location.name}</Text>
          <Pressable
            accessibilityLabel={`Remove ${location.name} from favorites`}
            accessibilityRole="button"
            hitSlop={7}
            onPress={onRemove}
            style={({ pressed }) => [styles.heartButton, pressed && styles.pressed]}
          >
            <Ionicons color="#FF5C68" name="heart" size={24} />
          </Pressable>
        </View>

        <View style={styles.metaRow}>
          <CategoryIcon category={location.category} />
          <Text style={styles.category}>{location.categoryLabel}</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons color={colors.gold} name="location" size={15} />
          <Text numberOfLines={2} style={styles.address}>{location.address}</Text>
        </View>
        {location.category !== 'bathrooms' ? (
          <Text ellipsizeMode="tail" numberOfLines={2} style={styles.description}>{location.description}</Text>
        ) : null}

        <Pressable
          accessibilityLabel={`View details for ${location.name}`}
          accessibilityRole="button"
          onPress={onViewDetails}
          style={({ pressed }) => [styles.detailsButton, pressed && styles.pressed]}
        >
          <Text style={styles.detailsText}>View Details</Text>
          <Ionicons color={colors.text} name="chevron-forward" size={16} />
        </Pressable>
      </View>
    </View>
  );
}

function CategoryIcon({ category }: Pick<FavoriteLocation, 'category'>) {
  if (category === 'bathrooms') {
    return <MaterialCommunityIcons color="#F4D46C" name="toilet" size={17} />;
  }
  const icon = category === 'attractions' ? 'location' : category === 'restaurants' ? 'restaurant' : 'car-sport';
  const color = category === 'attractions' ? '#D27AF2' : category === 'restaurants' ? colors.orange : '#70AEFF';
  return <Ionicons color={color} name={icon} size={17} />;
}

const styles = StyleSheet.create({
  card: {
    ...shadows.card,
    height: 184,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#4C415B',
    borderRadius: radius.md,
    backgroundColor: '#0B0D13',
  },
  cardNarrow: { height: 194 },
  image: { width: '38%', height: '100%', flexShrink: 0, backgroundColor: colors.surface },
  content: { minWidth: 0, flex: 1, paddingHorizontal: 10, paddingVertical: 9 },
  titleRow: { minWidth: 0, maxHeight: 70, flexDirection: 'row', alignItems: 'flex-start', gap: 3, overflow: 'hidden' },
  name: { ...typography.title, minWidth: 0, flex: 1, fontSize: 16, lineHeight: 18 },
  nameNarrow: { fontSize: 12.5, lineHeight: 14 },
  heartButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  metaRow: { minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  category: { color: '#E8CBAA', fontSize: 10, fontWeight: '800' },
  address: { minWidth: 0, flex: 1, color: colors.textMuted, fontSize: 10, lineHeight: 12 },
  description: { height: 28, overflow: 'hidden', color: '#E8E0E8', fontSize: 10, lineHeight: 14, marginTop: 4 },
  detailsButton: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    gap: 3,
    marginTop: 'auto',
    borderWidth: 1,
    borderColor: '#786477',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
  },
  detailsText: { color: colors.text, fontSize: 10, fontWeight: '900' },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});
