import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText as Text } from '@/components/AppText';
import { useFavorites } from '@/components/favorites/FavoritesProvider';
import {
  getParkingExternalMapUrl,
  getParkingOperatingStatus,
  type ParkingLocation,
} from '@/data/parking';
import { colors, radius, shadows, spacing, typography } from '@/theme/tokens';

type ParkingDetailsViewProps = {
  location: ParkingLocation;
};

export function ParkingDetailsView({ location }: ParkingDetailsViewProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite = isFavorite('parking', location.id);
  const operatingStatus = getParkingOperatingStatus(location);
  const showAccessibility = location.accessible !== null;
  const showEvCharging = location.evCharging !== 'unknown';

  const goBackToParking = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/parking');
  };

  const openUrl = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Unable to open link', 'Please try again from your browser.');
    }
  };

  const openDirections = () => {
    void openUrl(getParkingExternalMapUrl(location, 'directions'));
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Image resizeMode="cover" source={location.image} style={styles.heroPhoto} />
          <View style={styles.heroShade} />
          <View style={styles.topBar}>
            <Pressable
              accessibilityLabel="Back to Parking"
              accessibilityRole="button"
              hitSlop={10}
              onPress={goBackToParking}
              style={styles.backButton}
            >
              <Ionicons color={colors.text} name="chevron-back" size={27} />
              <Text style={styles.backText}>Back</Text>
            </Pressable>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={styles.brand}>
              BROOMSTICK
            </Text>
            <Pressable
              accessibilityLabel={favorite ? `Remove ${location.name} from favorites` : `Add ${location.name} to favorites`}
              accessibilityRole="button"
              onPress={() => toggleFavorite('parking', location.id)}
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            >
              <Ionicons color={favorite ? '#F18BA3' : colors.text} name={favorite ? 'heart' : 'heart-outline'} size={23} />
            </Pressable>
          </View>
        </View>

        <View style={styles.heroCopy}>
          <Text style={styles.type}>{location.type}</Text>
          <Text style={styles.name}>{location.name}</Text>
          <View style={styles.addressRow}>
            <Ionicons color={colors.orange} name="location" size={18} />
            <Text style={styles.address}>{location.address}</Text>
          </View>
          <Text style={styles.description}>{location.fullDescription ?? location.description}</Text>
        </View>

        <View style={styles.infoCard}>
          <InfoRow
            color={operatingStatus.kind === 'open' ? '#78E567' : operatingStatus.kind === 'closed' ? '#F58A96' : colors.gold}
            icon="time-outline"
            label={operatingStatus.label}
            value={location.schedule.summary}
          />
          <View style={styles.rule} />
          <InfoRow color={colors.gold} icon="cash-outline" label="Rates" value={location.rateInformation} />
          {location.accessibilityNotes ? <><View style={styles.rule} /><InfoRow color="#70AEFF" icon="accessibility" label="Accessibility" value={location.accessibilityNotes} /></> : null}
          {location.evChargingNotes ? <><View style={styles.rule} /><InfoRow color="#70AEFF" icon="flash" label="EV charging notes" value={location.evChargingNotes} /></> : null}
          {location.overnightAllowed !== null && location.overnightAllowed !== undefined ? <><View style={styles.rule} /><InfoRow color={colors.gold} icon="moon-outline" label="Overnight parking" value={location.overnightAllowed ? 'Allowed' : 'Not allowed'} /></> : null}
          {location.rvSuitable !== null && location.rvSuitable !== undefined ? <><View style={styles.rule} /><InfoRow color={colors.gold} icon="car-outline" label="RV parking" value={location.rvSuitable ? 'Suitable' : 'Not suitable'} /></> : null}
          {location.motorcycleNotes ? <><View style={styles.rule} /><InfoRow color={colors.gold} icon="bicycle-outline" label="Motorcycle information" value={location.motorcycleNotes} /></> : null}
        </View>

        {showAccessibility || showEvCharging ? <View style={styles.factsGrid}>
          {showAccessibility ? <FactCard
            icon="accessibility"
            label="Accessible"
            value={location.accessible ? 'Yes' : 'No'}
          /> : null}
          {showEvCharging ? <FactCard
            icon="flash"
            label="EV charging"
            value={location.evCharging === 'yes' ? 'Yes' : 'No'}
          /> : null}
        </View> : null}

        <View style={styles.actionsRow}>
          <ActionButton color={colors.gold} icon="navigate" label="Directions" onPress={openDirections} />
          <ActionButton color="#70AEFF" icon="map-outline" label="View on Map" onPress={() => void openUrl(getParkingExternalMapUrl(location, 'map'))} />
        </View>

        {location.websiteUrl ? (
          <Pressable
            accessibilityLabel={`Open official parking information for ${location.name}`}
            accessibilityRole="button"
            onPress={() => void openUrl(location.websiteUrl!)}
            style={({ pressed }) => [styles.websiteButton, pressed && styles.pressed]}
          >
            <Ionicons color={colors.gold} name="information-circle-outline" size={20} />
            <Text style={styles.websiteText}>Official parking information</Text>
            <Ionicons color={colors.textMuted} name="open-outline" size={17} />
          </Pressable>
        ) : null}

        <View style={styles.disclaimerCard}>
          <Ionicons color={colors.gold} name="warning-outline" size={21} />
          <Text style={styles.disclaimerText}>
            Rates, access, and restrictions may change during events, October, and snow emergencies. Always follow posted signs.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type InfoRowProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  label: string;
  value: string;
};

function InfoRow({ icon, color, label, value }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <Ionicons color={color} name={icon} size={22} />
      <View style={styles.infoCopy}>
        <Text style={[styles.infoLabel, { color }]}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function FactCard({ icon, label, value }: Omit<InfoRowProps, 'color'>) {
  return (
    <View style={styles.factCard}>
      <Ionicons color="#70AEFF" name={icon} size={23} />
      <Text numberOfLines={2} style={styles.factLabel}>{label}</Text>
      <Text numberOfLines={2} style={styles.factValue}>{value}</Text>
    </View>
  );
}

type ActionButtonProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  label: string;
  onPress: () => void;
};

function ActionButton({ icon, color, label, onPress }: ActionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.actionButton, { borderColor: color }, pressed && styles.pressed]}
    >
      <Ionicons color={color} name={icon} size={25} />
      <Text adjustsFontSizeToFit minimumFontScale={0.8} numberOfLines={1} style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xxxl, gap: spacing.md },
  hero: { height: 292, overflow: 'hidden', padding: spacing.lg },
  heroPhoto: { position: 'absolute', inset: 0, width: '100%', height: '100%' },
  heroShade: { position: 'absolute', inset: 0, backgroundColor: 'rgba(4, 3, 8, 0.18)' },
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
    backgroundColor: '#0D1018',
    borderWidth: 1,
    borderColor: '#41516D',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  type: { ...typography.eyebrow, color: '#70AEFF', fontSize: 10, letterSpacing: 1.6 },
  name: { ...typography.display, fontSize: 30, lineHeight: 36, marginTop: spacing.xs },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, marginTop: spacing.sm },
  address: { ...typography.body, flex: 1, fontSize: 14, lineHeight: 19 },
  description: { ...typography.caption, color: '#DED5E1', fontSize: 13, lineHeight: 19, marginTop: spacing.sm },
  infoCard: {
    ...shadows.card,
    marginHorizontal: spacing.lg,
    backgroundColor: '#0D111A',
    borderWidth: 1,
    borderColor: '#41516D',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  infoCopy: { flex: 1 },
  infoLabel: { fontSize: 12, fontWeight: '900' },
  infoValue: { ...typography.caption, fontSize: 12, lineHeight: 17, marginTop: 2 },
  rule: { height: 1, backgroundColor: colors.borderSoft, marginVertical: spacing.md },
  factsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginHorizontal: spacing.lg },
  factCard: {
    flexGrow: 1,
    flexBasis: '48%',
    minHeight: 103,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#11131D',
    borderWidth: 1,
    borderColor: '#3D4962',
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  factLabel: { color: colors.textMuted, fontSize: 9.5, fontWeight: '800', textAlign: 'center', textTransform: 'uppercase', marginTop: 4 },
  factValue: { color: colors.text, fontSize: 12, lineHeight: 16, fontWeight: '800', textAlign: 'center', marginTop: 2 },
  actionsRow: { flexDirection: 'row', gap: spacing.sm, marginHorizontal: spacing.lg },
  actionButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#11101A',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
  },
  actionText: { color: colors.text, fontSize: 13, fontWeight: '900' },
  pressed: { opacity: 0.76, transform: [{ scale: 0.98 }] },
  websiteButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    backgroundColor: '#17131D',
    borderWidth: 1,
    borderColor: '#5E4A32',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  websiteText: { flex: 1, color: colors.text, fontSize: 13, fontWeight: '800' },
  disclaimerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    backgroundColor: '#211B12',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  disclaimerText: { ...typography.caption, flex: 1, fontSize: 11.5, lineHeight: 16 },
});
