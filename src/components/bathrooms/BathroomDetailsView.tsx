import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useFavorites } from '@/components/favorites/FavoritesProvider';
import {
  getBathroomMapDestination,
  getBathroomOperatingStatus,
  type BathroomStatusKind,
  type BathroomLocation,
} from '@/data/bathrooms';
import { colors, radius, shadows, spacing, typography } from '@/theme/tokens';

type BathroomDetailsViewProps = {
  location: BathroomLocation;
};

export function BathroomDetailsView({ location }: BathroomDetailsViewProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite = isFavorite('bathrooms', location.id);
  const operatingStatus = getBathroomOperatingStatus(location);

  const goBackToBathrooms = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/bathrooms');
  };

  const openDirections = async () => {
    const query = encodeURIComponent(getBathroomMapDestination(location));
    try {
      await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
    } catch {
      Alert.alert('Unable to open map', 'Please try again from your maps app.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Image resizeMode="cover" source={location.image} style={styles.heroPhoto} />
          <View style={styles.heroShade} />
          <View style={styles.topBar}>
            <Pressable
              accessibilityLabel="Back to Bathrooms"
              accessibilityRole="button"
              hitSlop={10}
              onPress={goBackToBathrooms}
              style={styles.backButton}
            >
              <Ionicons color={colors.text} name="chevron-back" size={27} />
              <Text style={styles.backText}>Back</Text>
            </Pressable>
            <Text style={styles.brand}>
              Witch <Text style={styles.brandStar}>✦</Text> Walk
            </Text>
            <Pressable
              accessibilityLabel={favorite ? `Remove ${location.name} from favorites` : `Add ${location.name} to favorites`}
              accessibilityRole="button"
              onPress={() => toggleFavorite('bathrooms', location.id)}
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            >
              <Ionicons color={favorite ? '#F18BA3' : colors.text} name={favorite ? 'heart' : 'heart-outline'} size={23} />
            </Pressable>
          </View>
        </View>

        <View style={styles.heroCopy}>
          <Text style={styles.type}>{location.restroomType}</Text>
          <Text style={styles.name}>{location.name}</Text>
          <View style={styles.addressRow}>
            <Ionicons color={colors.orange} name="location" size={18} />
            <Text style={styles.address}>{location.address}</Text>
          </View>
          <Text style={styles.description}>{location.description}</Text>
        </View>

        {location.restroomCategory === 'seasonal_public' ? (
          <View style={styles.seasonalCard}>
            <Ionicons color={colors.orange} name="calendar" size={27} />
            <View style={styles.warningCopy}>
              <Text style={styles.seasonalLabel}>SEASONAL RESTROOM</Text>
              <Text style={styles.seasonalText}>
                {location.schedule.kind === 'seasonal' ? location.schedule.seasonLabel : 'Seasonal access'}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.statusCard}>
          <View style={[styles.statusIcon, statusIconStyle(operatingStatus.kind)]}>
            <Ionicons color={statusColor(operatingStatus.kind)} name="time-outline" size={25} />
          </View>
          <View style={styles.statusCopy}>
            <Text style={[styles.statusLabel, { color: statusColor(operatingStatus.kind) }]}>
              {operatingStatus.label}
            </Text>
            <Text style={styles.hours}>{location.schedule.summary}</Text>
          </View>
        </View>

        <View style={styles.factsGrid}>
          <FactCard
            icon="accessibility"
            label="Accessibility"
            value={location.accessible === true ? 'Accessible restroom confirmed' : 'Accessibility not verified'}
          />
          <FactCard
            icon="walk"
            label="Walking time"
            value={
              location.distanceMiles === undefined
                ? 'Available when location is enabled'
                : `${location.distanceMiles.toFixed(1)} mi • ${location.walkingTimeMinutes ?? '—'} min`
            }
          />
          <FactCard
            icon="business-outline"
            label="Public access"
            value={location.restroomType}
          />
          <FactCard icon="information-circle-outline" label="Helpful note" value={location.notes} />
        </View>

        <View style={styles.actionsRow}>
          <ActionButton icon="navigate" label="Directions" onPress={openDirections} primary />
          <ActionButton icon="map-outline" label="View on Map" onPress={openDirections} />
        </View>

        <View style={styles.disclaimerCard}>
          <Ionicons color={colors.gold} name="information-circle-outline" size={21} />
          <View style={styles.disclaimerCopy}>
            <Text style={styles.disclaimerText}>
              Restroom hours and access may change seasonally or during events. Check posted signs when you arrive.
            </Text>
            <Text style={styles.verifiedText}>Last verified: {location.lastVerifiedDate}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function statusColor(kind: BathroomStatusKind) {
  if (kind === 'open') return '#78E567';
  if (kind === 'closed') return '#FF7968';
  if (kind === 'seasonal') return colors.orange;
  return colors.gold;
}

function statusIconStyle(kind: BathroomStatusKind) {
  if (kind === 'open') return styles.openStatusIcon;
  if (kind === 'closed') return styles.closedStatusIcon;
  if (kind === 'seasonal') return styles.seasonalStatusIcon;
  return styles.unknownStatusIcon;
}

type FactCardProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
};

function FactCard({ icon, label, value }: FactCardProps) {
  return (
    <View style={styles.factCard}>
      <Ionicons color="#70AEFF" name={icon} size={23} />
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

type ActionButtonProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  primary?: boolean;
};

function ActionButton({ icon, label, onPress, primary = false }: ActionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        primary && styles.primaryAction,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons color={primary ? colors.black : colors.gold} name={icon} size={23} />
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        numberOfLines={1}
        style={[styles.actionText, primary && styles.primaryActionText]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xxxl, gap: spacing.md },
  hero: { height: 278, overflow: 'hidden', padding: spacing.lg },
  heroPhoto: { position: 'absolute', inset: 0, width: '100%', height: '100%' },
  heroShade: { position: 'absolute', inset: 0, backgroundColor: 'rgba(4, 3, 8, 0.32)' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: {
    minWidth: 78,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    backgroundColor: 'rgba(4, 3, 8, 0.74)',
    paddingRight: spacing.md,
  },
  backText: { color: colors.text, fontSize: 15, fontWeight: '800' },
  brand: {
    ...typography.title,
    fontSize: 21,
    lineHeight: 27,
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
    backgroundColor: 'rgba(4, 3, 8, 0.74)',
  },
  heroCopy: {
    marginHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: '#41516D',
    borderRadius: radius.md,
    backgroundColor: '#0D1018',
    padding: spacing.md,
  },
  type: { ...typography.eyebrow, color: '#F4D46C', fontSize: 10, letterSpacing: 1.5 },
  name: { ...typography.display, fontSize: 29, lineHeight: 35, marginTop: spacing.xs },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, marginTop: spacing.sm },
  address: { ...typography.body, flex: 1, fontSize: 14, lineHeight: 19 },
  description: { ...typography.caption, color: '#DED5E1', fontSize: 13, lineHeight: 19, marginTop: spacing.sm },
  seasonalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: '#8B5A34',
    borderRadius: radius.md,
    backgroundColor: '#291C13',
    padding: spacing.md,
  },
  warningCopy: { flex: 1 },
  seasonalLabel: { color: colors.orange, fontSize: 11, fontWeight: '900', letterSpacing: 0.45 },
  seasonalText: { color: colors.text, fontSize: 15, lineHeight: 20, fontWeight: '900', marginTop: 3 },
  statusCard: {
    ...shadows.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: '#41516D',
    borderRadius: radius.md,
    backgroundColor: '#0D111A',
    padding: spacing.md,
  },
  statusIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  openStatusIcon: { backgroundColor: '#102A1B' },
  closedStatusIcon: { backgroundColor: '#2A1515' },
  seasonalStatusIcon: { backgroundColor: '#291C13' },
  unknownStatusIcon: { backgroundColor: '#2D2416' },
  statusCopy: { flex: 1 },
  statusLabel: { fontSize: 14, fontWeight: '900' },
  hours: { ...typography.caption, fontSize: 12, lineHeight: 17, marginTop: 2 },
  factsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginHorizontal: spacing.lg },
  factCard: {
    width: '48.8%',
    minHeight: 112,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3D4962',
    borderRadius: radius.md,
    backgroundColor: '#11131D',
    padding: spacing.sm,
  },
  factLabel: {
    color: colors.textMuted,
    fontSize: 9.5,
    fontWeight: '800',
    textAlign: 'center',
    textTransform: 'uppercase',
    marginTop: 4,
  },
  factValue: { color: colors.text, fontSize: 12, lineHeight: 16, fontWeight: '800', textAlign: 'center', marginTop: 3 },
  actionsRow: { flexDirection: 'row', gap: spacing.sm, marginHorizontal: spacing.lg },
  actionButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radius.md,
    backgroundColor: '#11101A',
    paddingHorizontal: spacing.sm,
  },
  primaryAction: { backgroundColor: colors.gold },
  actionText: { color: colors.text, fontSize: 13, fontWeight: '900' },
  primaryActionText: { color: colors.black },
  pressed: { opacity: 0.76, transform: [{ scale: 0.98 }] },
  disclaimerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: '#211B12',
    padding: spacing.md,
  },
  disclaimerText: { ...typography.caption, flex: 1, fontSize: 11.5, lineHeight: 16 },
  disclaimerCopy: { flex: 1 },
  verifiedText: { color: colors.gold, fontSize: 9.5, fontWeight: '800', marginTop: spacing.xs },
});
