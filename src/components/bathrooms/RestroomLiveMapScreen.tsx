import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, Linking, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RestroomMap } from '@/components/bathrooms/RestroomMap';
import {
  getBathroomMapDestination,
  getVisibleBathroomLocations,
  type BathroomLocation,
} from '@/data/bathrooms';
import { colors, radius, spacing, typography } from '@/theme/tokens';

type RestroomLiveMapScreenProps = {
  showBackButton?: boolean;
};

export function RestroomLiveMapScreen({ showBackButton = false }: RestroomLiveMapScreenProps) {
  const { height } = useWindowDimensions();
  const locations = getVisibleBathroomLocations();

  const openDetails = (location: BathroomLocation) => {
    router.push({ pathname: '/bathrooms/[id]', params: { id: location.id } });
  };

  const openDirections = async (location: BathroomLocation) => {
    const query = encodeURIComponent(getBathroomMapDestination(location));
    try {
      await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
    } catch {
      Alert.alert('Unable to open map', 'Please try again from your maps app.');
    }
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.content}>
        <View style={styles.header}>
          {showBackButton ? (
            <Pressable accessibilityLabel="Back to Home" hitSlop={10} onPress={goBack} style={styles.circleButton}>
              <Ionicons color={colors.text} name="chevron-back" size={25} />
            </Pressable>
          ) : (
            <View style={styles.circleSpacer} />
          )}
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>BROOMSTICK Salem</Text>
            <Text style={styles.title}>Live Map</Text>
          </View>
          <View style={styles.circleButton}>
            <MaterialCommunityIcons color="#F4D46C" name="toilet" size={22} />
          </View>
        </View>

        <View style={styles.layerCard}>
          <View style={styles.layerIcon}>
            <MaterialCommunityIcons color={colors.black} name="toilet" size={20} />
          </View>
          <View style={styles.layerCopy}>
            <Text style={styles.layerTitle}>Public restrooms</Text>
            <Text style={styles.layerText}>{locations.length} verified locations shown</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={() => router.push('/bathrooms')} style={styles.listButton}>
            <Ionicons color={colors.gold} name="list" size={17} />
            <Text style={styles.listButtonText}>List</Text>
          </Pressable>
        </View>

        <RestroomMap
          height={Math.max(460, height - 245)}
          locations={locations}
          onDirections={(location) => void openDirections(location)}
          onViewDetails={openDetails}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  header: { minHeight: 76, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerCopy: { alignItems: 'center' },
  eyebrow: { ...typography.eyebrow, fontSize: 9, letterSpacing: 1.35 },
  title: { ...typography.display, fontSize: 31, lineHeight: 36 },
  circleButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#6D553D',
    borderRadius: radius.pill,
    backgroundColor: '#17131D',
  },
  circleSpacer: { width: 42, height: 42 },
  layerCard: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: '#55406B',
    borderRadius: radius.md,
    backgroundColor: '#11131D',
    paddingHorizontal: spacing.md,
  },
  layerIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.gold,
  },
  layerCopy: { flex: 1 },
  layerTitle: { color: colors.text, fontSize: 13, fontWeight: '900' },
  layerText: { color: colors.textMuted, fontSize: 10.5, marginTop: 2 },
  listButton: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#72572F',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
  },
  listButtonText: { color: colors.gold, fontSize: 11, fontWeight: '900' },
});
