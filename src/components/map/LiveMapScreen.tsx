import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  ImageBackground,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WitchWalkMap } from '@/components/map/WitchWalkMap';
import {
  filterMapLocations,
  getMapLocations,
  mapFilters,
  type CrowdLevel,
  type MapCategory,
  type MapFilter,
  type MapLocation,
} from '@/data/mapLocations';
import {
  distanceLabel,
  requestCurrentForegroundLocation,
  type LocationFix,
} from '@/services/location';
import { colors, radius, shadows, spacing, typography } from '@/theme/tokens';

const heroArtwork = require('../../../assets/images/home/live-map.png');

export function LiveMapScreen() {
  const { height, width } = useWindowDimensions();
  const [filter, setFilter] = useState<MapFilter>('all');
  const [selected, setSelected] = useState<MapLocation | null>(null);
  const [userLocation, setUserLocation] = useState<LocationFix | null>(null);
  const [focusRequestKey, setFocusRequestKey] = useState(0);
  const [locating, setLocating] = useState(false);

  const allLocations = useMemo(() => getMapLocations(), []);
  const visibleLocations = useMemo(
    () => filterMapLocations(allLocations, filter),
    [allLocations, filter],
  );
  const compact = height < 760 || width < 375;

  const locateUser = async () => {
    if (locating) return;
    setLocating(true);
    const result = await requestCurrentForegroundLocation();
    setLocating(false);

    if (result.kind === 'granted') {
      setUserLocation(result.location);
      setFocusRequestKey((value) => value + 1);
      return;
    }

    if (result.kind === 'denied') {
      Alert.alert(
        'Location not enabled',
        'You can keep exploring every Salem location. Tap Locate Me again if you later choose to grant foreground location access.',
      );
      return;
    }

    if (result.kind === 'imprecise') {
      Alert.alert('Precise location unavailable', 'Turn on Precise Location in your phone settings and try again.');
      return;
    }

    Alert.alert('Location unavailable', result.message);
  };

  const openDirections = async (location: MapLocation) => {
    const destination = encodeURIComponent(location.directionsDestination);
    const url = Platform.select({
      ios: `maps://?q=${destination}&ll=${location.latitude},${location.longitude}`,
      default: `https://www.google.com/maps/search/?api=1&query=${destination}`,
    });

    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Unable to open maps', 'Please try again from your maps app.');
    }
  };

  const openDetails = (location: MapLocation) => {
    if (location.category === 'attractions') {
      router.push({ pathname: '/attractions/[id]', params: { id: location.sourceId } });
    } else if (location.category === 'restaurants') {
      router.push({ pathname: '/restaurants/[id]', params: { id: location.sourceId } });
    } else if (location.category === 'parking') {
      router.push({ pathname: '/parking/[id]', params: { id: location.sourceId } });
    } else {
      router.push({ pathname: '/bathrooms/[id]', params: { id: location.sourceId } });
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.content}>
        <ImageBackground
          imageStyle={styles.heroImage}
          resizeMode="cover"
          source={heroArtwork}
          style={[styles.hero, compact && styles.heroCompact]}
        >
          <View style={styles.heroShade} />
          <View style={styles.heroTopRow}>
            <Pressable
              accessibilityLabel="Back to Home"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => router.push('/')}
              style={[styles.backButton, compact && styles.backButtonCompact]}
            >
              <Ionicons color={colors.text} name="chevron-back" size={22} />
              {compact ? null : <Text style={styles.backButtonText}>Back</Text>}
            </Pressable>
            <Text adjustsFontSizeToFit minimumFontScale={0.82} numberOfLines={1} style={styles.brand}>
              Witch <Text style={styles.brandStar}>✦</Text> Walk
            </Text>
            <Pressable
              accessibilityLabel="Open settings"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => router.push('/more')}
              style={styles.headerButton}
            >
              <Ionicons color={colors.text} name="settings-outline" size={21} />
            </Pressable>
          </View>
          <View style={styles.heroCopy}>
            <Text style={[styles.title, compact && styles.titleCompact]}>Live Map</Text>
            <Text style={styles.eyebrow}>Explore Salem</Text>
            <Text style={styles.tagline}>Real places. A better visit.</Text>
          </View>
        </ImageBackground>

        <ScrollView
          contentContainerStyle={styles.filters}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroller}
        >
          {mapFilters.map((item) => {
            const active = filter === item.id;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                key={item.id}
                onPress={() => {
                  if (selected && item.id !== 'all' && selected.category !== item.id) setSelected(null);
                  setFilter(item.id);
                }}
                style={[styles.filterButton, active && styles.filterButtonActive]}
              >
                <MapCategoryIcon category={item.id} active={active} />
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.mapShell}>
          <WitchWalkMap
            focusRequestKey={focusRequestKey}
            locations={visibleLocations}
            onSelectLocation={setSelected}
            style={StyleSheet.absoluteFill}
            userLocation={userLocation}
          />

          <View style={styles.mapCountBadge}>
            <Text style={styles.mapCountText}>{visibleLocations.length} places</Text>
          </View>

          <Pressable
            accessibilityLabel="Locate Me"
            accessibilityRole="button"
            disabled={locating}
            onPress={() => void locateUser()}
            style={[styles.locateButton, selected && styles.locateButtonRaised]}
          >
            <Ionicons color={colors.text} name={locating ? 'hourglass-outline' : 'locate'} size={24} />
          </Pressable>

          {selected ? (
            <LocationPreview
              location={selected}
              onClose={() => setSelected(null)}
              onDirections={() => void openDirections(selected)}
              onViewDetails={() => openDetails(selected)}
              userLocation={userLocation}
            />
          ) : (
            <View style={styles.mapHint}>
              <Ionicons color={colors.gold} name="hand-left-outline" size={17} />
              <Text style={styles.mapHintText}>Tap a pin for details</Text>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

function MapCategoryIcon({ category, active }: { category: MapFilter; active: boolean }) {
  const color = active ? colors.black : categoryColor(category);
  if (category === 'restaurants') {
    return <Ionicons color={color} name="restaurant" size={19} />;
  }
  if (category === 'parking') return <Ionicons color={color} name="car-sport" size={20} />;
  if (category === 'bathrooms') {
    return <MaterialCommunityIcons color={color} name="toilet" size={20} />;
  }
  return <Ionicons color={color} name={category === 'all' ? 'grid' : 'location'} size={19} />;
}

function LocationPreview({
  location,
  userLocation,
  onClose,
  onDirections,
  onViewDetails,
}: {
  location: MapLocation;
  userLocation: LocationFix | null;
  onClose: () => void;
  onDirections: () => void;
  onViewDetails: () => void;
}) {
  return (
    <View style={styles.previewCard}>
      <Pressable accessibilityLabel="Close location preview" hitSlop={8} onPress={onClose} style={styles.closeButton}>
        <Ionicons color={colors.textMuted} name="close" size={18} />
      </Pressable>
      <Image resizeMode="cover" source={location.image} style={styles.previewImage} />
      <View style={styles.previewCopy}>
        <Text numberOfLines={2} style={styles.previewName}>{location.name}</Text>
        <View style={styles.previewMetaRow}>
          <Text style={[styles.categoryText, { color: categoryColor(location.category) }]}>
            {location.categoryLabel}
          </Text>
          <Text style={styles.distanceText}>
            {distanceLabel(userLocation, location)}
          </Text>
        </View>
        {location.crowdLevel ? <CrowdLabel level={location.crowdLevel} /> : null}
        <View style={styles.previewActions}>
          <Pressable accessibilityRole="button" onPress={onViewDetails} style={styles.detailsButton}>
            <Text style={styles.detailsButtonText}>View Details</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onDirections} style={styles.directionsButton}>
            <Ionicons color={colors.black} name="navigate" size={15} />
            <Text style={styles.directionsButtonText}>Directions</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function CrowdLabel({ level }: { level: CrowdLevel }) {
  const label = level === 'light' ? 'Light crowd' : level === 'moderate' ? 'Moderate crowd' : 'Busy crowd';
  return (
    <View style={styles.crowdRow}>
      <Ionicons color={crowdColor(level)} name="people" size={16} />
      <Text style={[styles.crowdText, { color: crowdColor(level) }]}>{label}</Text>
    </View>
  );
}

function categoryColor(category: MapFilter | MapCategory) {
  if (category === 'attractions') return '#D27AF2';
  if (category === 'restaurants') return '#FF9D4D';
  if (category === 'parking') return '#70AEFF';
  if (category === 'bathrooms') return '#F4D46C';
  return colors.gold;
}

function crowdColor(level: CrowdLevel) {
  if (level === 'light') return '#62D890';
  if (level === 'moderate') return '#F5B544';
  return '#FF6673';
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  hero: {
    height: 176,
    overflow: 'hidden',
    justifyContent: 'space-between',
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  heroCompact: { height: 145 },
  heroImage: { borderRadius: radius.lg },
  heroShade: { position: 'absolute', inset: 0, backgroundColor: 'rgba(14, 6, 25, 0.38)' },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 66, minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 1 },
  backButtonCompact: { width: 40 },
  backButtonText: { color: colors.text, fontSize: 12, fontWeight: '800' },
  brand: {
    color: colors.text,
    fontFamily: 'Georgia',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.6,
    textTransform: 'uppercase',
    textAlign: 'center',
    flexShrink: 1,
  },
  brandStar: { color: colors.gold },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,248,232,0.45)',
    borderRadius: radius.pill,
    backgroundColor: 'rgba(8,5,12,0.46)',
  },
  heroCopy: { gap: 1 },
  title: { ...typography.display, fontSize: 49, lineHeight: 51 },
  titleCompact: { fontSize: 42, lineHeight: 44 },
  eyebrow: { ...typography.eyebrow, color: colors.text, fontSize: 12, letterSpacing: 3.3 },
  tagline: { color: '#E8D9E8', fontFamily: 'Georgia', fontSize: 13, fontStyle: 'italic', marginTop: 2 },
  filters: { gap: spacing.sm, paddingVertical: 2, paddingRight: spacing.md },
  filterScroller: { flexGrow: 0, maxHeight: 52 },
  filterButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: '#564668',
    borderRadius: radius.md,
    backgroundColor: '#11101A',
    paddingHorizontal: 15,
  },
  filterButtonActive: { borderColor: '#FFD278', backgroundColor: colors.gold },
  filterText: { color: colors.text, fontSize: 13, fontWeight: '800' },
  filterTextActive: { color: colors.black },
  mapShell: {
    ...shadows.card,
    flex: 1,
    minHeight: 350,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#58426E',
    borderRadius: radius.lg,
    backgroundColor: '#101624',
  },
  mapCountBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(245,181,68,0.55)',
    borderRadius: radius.pill,
    backgroundColor: 'rgba(9,7,13,0.9)',
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  mapCountText: { color: colors.text, fontSize: 10.5, fontWeight: '900' },
  locateButton: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#8772A0',
    borderRadius: radius.pill,
    backgroundColor: 'rgba(9,7,13,0.94)',
  },
  locateButtonRaised: { bottom: 170 },
  mapHint: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(9,7,13,0.9)',
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
  },
  mapHintText: { color: colors.text, fontSize: 11, fontWeight: '800' },
  previewCard: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    left: spacing.sm,
    height: 150,
    flexDirection: 'row',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: '#76618D',
    borderRadius: radius.md,
    backgroundColor: 'rgba(8,7,12,0.97)',
    padding: spacing.sm,
  },
  closeButton: { position: 'absolute', top: 6, right: 6, zIndex: 2, padding: 4 },
  previewImage: { width: 112, height: 132, borderRadius: radius.sm, backgroundColor: colors.surface },
  previewCopy: { flex: 1, minWidth: 0, justifyContent: 'center', paddingRight: spacing.sm },
  previewName: { ...typography.title, fontSize: 18, lineHeight: 21, paddingRight: spacing.md },
  previewMetaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 3 },
  categoryText: { flexShrink: 1, fontSize: 10.5, fontWeight: '900', textTransform: 'uppercase' },
  distanceText: { color: colors.textMuted, fontSize: 10.5, fontWeight: '700' },
  crowdRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  crowdText: { fontSize: 11, fontWeight: '900' },
  previewActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  detailsButton: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#9C5DC8',
    borderRadius: radius.sm,
    backgroundColor: '#2A153C',
  },
  detailsButtonText: { color: colors.text, fontSize: 11, fontWeight: '900' },
  directionsButton: {
    flex: 1,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: radius.sm,
    backgroundColor: colors.gold,
  },
  directionsButtonText: { color: colors.black, fontSize: 11, fontWeight: '900' },
});
