import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Restaurant } from '@/data/restaurants';
import { colors, radius, shadows, spacing, typography } from '@/theme/tokens';

type RestaurantDetailsViewProps = {
  restaurant: Restaurant;
};

export function RestaurantDetailsView({ restaurant }: RestaurantDetailsViewProps) {
  const [favorite, setFavorite] = useState(false);

  const goBackToRestaurants = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/restaurants');
  };

  const openUrl = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Unable to open link', 'Please try again from your browser.');
    }
  };

  const openDirections = () => {
    const query = encodeURIComponent(restaurant.address);
    void openUrl(`https://www.google.com/maps/search/?api=1&query=${query}`);
  };

  const menuOrWebsiteUrl = restaurant.menuUrl ?? restaurant.websiteUrl;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Image source={restaurant.image} resizeMode="cover" style={styles.heroPhoto} />
          <View style={styles.heroShade} />
          <View style={styles.topBar}>
            <Pressable
              accessibilityLabel="Back to Restaurants"
              accessibilityRole="button"
              hitSlop={10}
              onPress={goBackToRestaurants}
              style={styles.backButton}
            >
              <Ionicons name="chevron-back" size={27} color={colors.text} />
              <Text style={styles.backText}>Back</Text>
            </Pressable>
            <Text style={styles.brand}>
              Witch <Text style={styles.brandStar}>✦</Text> Walk
            </Text>
            <Pressable
              accessibilityLabel="Open live map"
              accessibilityRole="button"
              hitSlop={10}
              onPress={() => router.push('/map')}
              style={styles.iconButton}
            >
              <Ionicons name="map-outline" size={20} color={colors.gold} />
            </Pressable>
          </View>
        </View>

        <View style={styles.heroCopy}>
          <Text style={styles.cuisine}>{restaurant.cuisine}</Text>
          <Text style={styles.name}>{restaurant.name}</Text>
          <Text style={styles.description}>{restaurant.description}</Text>
        </View>

        <View style={styles.primaryInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="location" size={20} color={colors.orange} />
            <Text style={styles.infoText}>{restaurant.address}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color={colors.text} />
            <Text
              style={[
                styles.statusText,
                restaurant.status === 'open' && styles.openText,
                restaurant.status === 'closed' && styles.closedText,
              ]}
            >
              {restaurant.statusLabel}
            </Text>
            <Text style={styles.hours}>{restaurant.hours}</Text>
          </View>
          <View style={styles.quickFacts}>
            <QuickFact icon="restaurant" label="Cuisine" value={restaurant.cuisine} />
            <QuickFact icon="cash" label="Price" value={restaurant.priceRange} />
            <QuickFact icon="walk" label="Walk" value={`${restaurant.distance} • ${restaurant.walkingTime}`} />
          </View>
        </View>

        <View style={styles.actionsGrid}>
          <ActionButton
            color={colors.purple}
            icon="navigate"
            onPress={openDirections}
            subtitle="Get there"
            title="Directions"
          />
          <ActionButton
            color={colors.orange}
            icon="book-outline"
            onPress={() => {
              if (menuOrWebsiteUrl) void openUrl(menuOrWebsiteUrl);
              else Alert.alert('Menu / Website', 'A link can be added to this restaurant record when available.');
            }}
            subtitle={menuOrWebsiteUrl ? 'View online' : 'Not available'}
            title="Menu / Site"
          />
          <ActionButton
            color="#F18BA3"
            icon={favorite ? 'heart' : 'heart-outline'}
            onPress={() => setFavorite((current) => !current)}
            subtitle={favorite ? 'Added to favorites' : 'Save this place'}
            title={favorite ? 'Saved' : 'Favorite'}
          />
        </View>

        <View style={styles.aboutCard}>
          <View style={styles.cardHeading}>
            <Ionicons name="restaurant" size={21} color={colors.gold} />
            <Text style={styles.cardTitle}>About</Text>
          </View>
          <View style={styles.rule} />
          <Text style={styles.bodyText}>{restaurant.longDescription}</Text>
          <View style={styles.tagsRow}>
            {restaurant.tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type ActionButtonProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  title: string;
  subtitle: string;
  onPress: () => void;
};

function ActionButton({ icon, color, title, subtitle, onPress }: ActionButtonProps) {
  return (
    <Pressable
      accessibilityLabel={`${title}. ${subtitle}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={29} color={color} />
      <Text adjustsFontSizeToFit minimumFontScale={0.75} numberOfLines={1} style={styles.actionTitle}>
        {title}
      </Text>
      <Text adjustsFontSizeToFit minimumFontScale={0.75} numberOfLines={1} style={styles.actionSubtitle}>
        {subtitle}
      </Text>
    </Pressable>
  );
}

type QuickFactProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
};

function QuickFact({ icon, label, value }: QuickFactProps) {
  return (
    <View style={styles.quickFact}>
      <Ionicons name={icon} size={19} color={colors.gold} />
      <Text style={styles.quickFactLabel}>{label}</Text>
      <Text numberOfLines={2} style={styles.quickFactValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xxxl, gap: spacing.md },
  hero: { height: 300, overflow: 'hidden', padding: spacing.lg },
  heroPhoto: { position: 'absolute', inset: 0, width: '100%', height: '100%' },
  heroShade: { position: 'absolute', inset: 0, backgroundColor: 'rgba(4, 3, 8, 0.22)' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: {
    minWidth: 78,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    backgroundColor: 'rgba(4, 3, 8, 0.72)',
    paddingRight: spacing.md,
  },
  backText: { color: colors.text, fontSize: 15, fontWeight: '800' },
  brand: {
    ...typography.title,
    fontSize: 22,
    lineHeight: 28,
    textTransform: 'uppercase',
    textShadowColor: colors.black,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  brandStar: { color: colors.gold, fontSize: 16 },
  iconButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: 'rgba(4, 3, 8, 0.72)',
  },
  heroCopy: {
    marginHorizontal: spacing.lg,
    backgroundColor: '#0E0B14',
    borderWidth: 1,
    borderColor: '#4A3547',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  cuisine: { ...typography.eyebrow, color: colors.gold, fontSize: 10, letterSpacing: 1.6 },
  name: { ...typography.display, fontSize: 31, lineHeight: 37, marginTop: spacing.xs },
  description: {
    ...typography.body,
    color: '#EFE7DE',
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  primaryInfo: { marginHorizontal: spacing.lg, gap: spacing.sm },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  infoText: { ...typography.body, flex: 1, fontSize: 14, lineHeight: 20 },
  statusText: { color: colors.gold, fontSize: 14, fontWeight: '900' },
  openText: { color: '#78E567' },
  closedText: { color: '#F58A96' },
  hours: { flex: 1, color: colors.textMuted, fontSize: 14 },
  quickFacts: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  quickFact: {
    flex: 1,
    minHeight: 90,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#17111D',
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  quickFactLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 3,
  },
  quickFactValue: {
    color: colors.text,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 2,
  },
  actionsGrid: { flexDirection: 'row', gap: spacing.sm, marginHorizontal: spacing.lg },
  actionButton: {
    ...shadows.card,
    flex: 1,
    minWidth: 0,
    minHeight: 106,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10101A',
    borderWidth: 1,
    borderColor: '#51415F',
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  pressed: { opacity: 0.76, transform: [{ scale: 0.98 }] },
  actionTitle: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginTop: spacing.xs,
  },
  actionSubtitle: { color: colors.textMuted, fontSize: 9.5, lineHeight: 14 },
  aboutCard: {
    ...shadows.card,
    marginHorizontal: spacing.lg,
    backgroundColor: '#0D111A',
    borderWidth: 1,
    borderColor: '#5B4028',
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  cardHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardTitle: { ...typography.title, fontSize: 20, lineHeight: 25 },
  rule: { height: 1, backgroundColor: colors.borderSoft, marginVertical: spacing.sm },
  bodyText: { ...typography.body, color: colors.textMuted, fontSize: 14, lineHeight: 21 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.md },
  tag: {
    backgroundColor: '#251C2D',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  tagText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
});
