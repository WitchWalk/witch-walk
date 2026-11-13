import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText as Text } from '@/components/AppText';
import { useFavorites } from '@/components/favorites/FavoritesProvider';
import {
  getBathroomHours,
  getBathroomOperatingStatus,
  type BathroomLocation,
} from '@/data/bathrooms';
import { getBathroomExternalMapUrl } from '@/services/bathroomContentCore';
import { colors, radius, spacing, typography } from '@/theme/tokens';

type BathroomDetailsViewProps = { location: BathroomLocation };

export function BathroomDetailsView({ location }: BathroomDetailsViewProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite = isFavorite('bathrooms', location.id);
  const operatingStatus = getBathroomOperatingStatus(location);
  const hours = getBathroomHours(location);
  const seasonalNote = location.seasonal
    ? location.seasonalNotes || 'This restroom is available seasonally.'
    : null;
  const accessNote = location.publicAccess === 'Limited / Conditional'
    ? location.accessNotes || 'Access to this restroom is limited or conditional.'
    : null;

  const goBackToBathrooms = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/bathrooms');
  };

  const openDirections = async () => {
    try {
      const url = getBathroomExternalMapUrl(location);
      if (!url) throw Error('No destination');
      await Linking.openURL(url);
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
            <Pressable accessibilityLabel="Back to Bathrooms" accessibilityRole="button" hitSlop={10} onPress={goBackToBathrooms} style={styles.backButton}>
              <Ionicons color={colors.text} name="chevron-back" size={27} />
              <Text style={styles.backText}>Back</Text>
            </Pressable>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={styles.brand}>BROOMSTICK</Text>
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
          {location.facilityName && location.facilityName !== location.name ? <Text style={styles.facilityName}>{location.facilityName}</Text> : null}
          <View style={styles.addressRow}>
            <Ionicons color={colors.orange} name="location" size={18} />
            <Text style={styles.address}>{location.address}</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <InfoRow
            color={
              operatingStatus.kind === 'open'
                ? '#78E567'
                : operatingStatus.kind === 'closed'
                  ? '#F58A96'
                  : colors.gold
            }
            icon="time-outline"
            label={operatingStatus.label}
            value={hours}
          />
          {location.accessible !== null ? (
            <>
              <View style={styles.rule} />
              <InfoRow
                color="#70AEFF"
                icon="accessibility-outline"
                label="Accessibility"
                value={location.accessible ? 'Accessible restroom' : 'Accessibility not confirmed'}
              />
            </>
          ) : null}
          {location.publicAccess ? (
            <>
              <View style={styles.rule} />
              <InfoRow
                color={colors.gold}
                icon="people-outline"
                label="Public access"
                value={location.publicAccess}
              />
            </>
          ) : null}
        </View>

        {location.advisoryText ? (
          <View style={[
            styles.advisoryCard,
            location.advisoryLevel === 'Warning' && styles.warningCard,
          ]}>
            <Ionicons
              color={location.advisoryLevel === 'Warning' ? '#FF8A8A' : colors.gold}
              name="warning-outline"
              size={22}
            />
            <View style={styles.advisoryCopy}>
              <Text style={styles.advisoryTitle}>
                {location.advisoryLevel === 'Warning' ? 'Important restroom note' : 'Restroom advisory'}
              </Text>
              <Text style={styles.advisoryText}>{location.advisoryText}</Text>
            </View>
          </View>
        ) : null}

        {seasonalNote || accessNote ? (
          <View style={styles.notesCard}>
            {seasonalNote ? <NoteRow icon="calendar-outline" text={seasonalNote} /> : null}
            {accessNote ? <NoteRow icon="information-circle-outline" text={accessNote} /> : null}
          </View>
        ) : null}

        <View style={styles.actionsRow}>
          <ActionButton icon="navigate" label="Directions" onPress={openDirections} primary />
          <ActionButton icon="map-outline" label="View on Map" onPress={openDirections} />
        </View>

        {location.officialUrl ? (
          <Pressable
            accessibilityLabel={`Open official restroom information for ${location.name}`}
            accessibilityRole="button"
            onPress={() => void Linking.openURL(location.officialUrl!)}
            style={({ pressed }) => [styles.officialButton, pressed && styles.pressed]}
          >
            <Ionicons color={colors.gold} name="information-circle-outline" size={20} />
            <Text style={styles.officialText}>Official restroom information</Text>
            <Ionicons color={colors.textMuted} name="open-outline" size={17} />
          </Pressable>
        ) : null}
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
      <Ionicons color={color} name={icon} size={21} />
      <View style={styles.infoCopy}>
        <Text style={[styles.infoLabel, { color }]}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

type NoteRowProps = { icon: React.ComponentProps<typeof Ionicons>['name']; text: string };

function NoteRow({ icon, text }: NoteRowProps) {
  return (
    <View style={styles.noteRow}>
      <Ionicons color={colors.gold} name={icon} size={21} />
      <Text style={styles.noteText}>{text}</Text>
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
      style={({ pressed }) => [styles.actionButton, primary && styles.primaryAction, pressed && styles.pressed]}
    >
      <Ionicons color={primary ? colors.black : colors.gold} name={icon} size={23} />
      <Text adjustsFontSizeToFit minimumFontScale={0.8} numberOfLines={1} style={[styles.actionText, primary && styles.primaryActionText]}>{label}</Text>
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
  backButton: { minWidth: 78, minHeight: 42, flexDirection: 'row', alignItems: 'center', borderRadius: radius.pill, backgroundColor: 'rgba(4, 3, 8, 0.74)', paddingRight: spacing.md },
  backText: { color: colors.text, fontSize: 15, fontWeight: '800' },
  brand: { ...typography.title, fontSize: 21, lineHeight: 27, textTransform: 'uppercase', textShadowColor: colors.black, textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  iconButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21, backgroundColor: 'rgba(4, 3, 8, 0.76)' },
  heroCopy: { paddingHorizontal: spacing.lg, gap: spacing.xs },
  type: { color: colors.gold, fontSize: 13, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
  name: { ...typography.display, color: colors.text, fontSize: 31, lineHeight: 37 },
  facilityName: { color: colors.textMuted, fontSize: 15, lineHeight: 21 },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, marginTop: spacing.xs },
  address: { color: colors.text, fontSize: 16, lineHeight: 22, flex: 1 },
  infoCard: { marginHorizontal: spacing.lg, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: '#43516B', backgroundColor: '#0D111A' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  infoCopy: { flex: 1 },
  infoLabel: { fontSize: 12, fontWeight: '900' },
  infoValue: { color: colors.text, fontSize: 13, lineHeight: 18, marginTop: 2 },
  rule: { height: 1, backgroundColor: colors.borderSoft, marginVertical: spacing.md },
  advisoryCard: { marginHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, borderWidth: 1, borderColor: '#7C6330', borderRadius: radius.lg, backgroundColor: '#221C12', padding: spacing.md },
  warningCard: { borderColor: '#8B3D45', backgroundColor: '#2A1519' },
  advisoryCopy: { flex: 1 },
  advisoryTitle: { color: colors.gold, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  advisoryText: { color: colors.text, fontSize: 13, lineHeight: 19, marginTop: 2 },
  notesCard: { marginHorizontal: spacing.lg, padding: spacing.md, gap: spacing.sm, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  noteText: { color: colors.textMuted, fontSize: 14, lineHeight: 20, flex: 1 },
  actionsRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, marginTop: spacing.xs },
  officialButton: { minHeight: 48, marginHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface, paddingHorizontal: spacing.md },
  officialText: { flex: 1, color: colors.text, fontSize: 13, fontWeight: '800' },
  actionButton: { minWidth: 0, minHeight: 52, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderRadius: radius.md, borderWidth: 1, borderColor: colors.gold, backgroundColor: colors.surface },
  primaryAction: { backgroundColor: colors.gold },
  actionText: { color: colors.gold, fontSize: 15, fontWeight: '900' },
  primaryActionText: { color: colors.black },
  pressed: { opacity: 0.78 },
});
