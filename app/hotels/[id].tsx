import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText as Text } from '@/components/AppText';
import {
  loadPublishedHotel,
  type Hotel,
} from '@/services/hotelContentRepository';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export default function HotelDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    void loadPublishedHotel(id).then((result) => {
      if (!active) return;
      setHotel(result);
      setReady(true);
    });

    return () => {
      active = false;
    };
  }, [id]);

  const openUrl = async (url: string | null) => {
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch {
      // The button is only shown for configured URLs.
    }
  };

  const openMap = async () => {
    if (!hotel) return;

    const destination =
      hotel.latitude != null && hotel.longitude != null
        ? hotel.latitude + ',' + hotel.longitude
        : hotel.address;

    if (!destination) return;

    const url =
      'https://maps.apple.com/?daddr=' +
      encodeURIComponent(destination);

    await openUrl(url);
  };

  if (!hotel) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.unavailable}>
          <Ionicons
            name={ready ? 'bed-outline' : 'hourglass-outline'}
            size={38}
            color={colors.gold}
          />
          <Text style={styles.unavailableTitle}>
            {ready ? 'Hotel unavailable' : 'Loading hotel…'}
          </Text>
          <Text style={styles.unavailableText}>
            {ready
              ? 'This hotel is not currently published.'
              : 'Checking the latest Salem hotel information.'}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/hotels')}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>
              BACK TO HOTELS
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <Pressable
            accessibilityLabel="Back to Hotels"
            accessibilityRole="button"
            onPress={() => router.back()}
            style={styles.circleButton}
          >
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </Pressable>

          <Text style={styles.brand}>BROOMSTICK</Text>

          <Pressable
            accessibilityLabel="Open live map"
            accessibilityRole="button"
            onPress={() => router.push('/map')}
            style={styles.circleButton}
          >
            <Ionicons name="map-outline" size={22} color={colors.gold} />
          </Pressable>
        </View>

        {hotel.imageUrl ? (
          <Image
            source={{ uri: hotel.imageUrl }}
            resizeMode="cover"
            style={styles.heroImage}
          />
        ) : (
          <View style={styles.heroPlaceholder}>
            <Ionicons name="bed" size={58} color={colors.gold} />
          </View>
        )}

        <View style={styles.heading}>
          <Text style={styles.eyebrow}>
            {hotel.featured ? 'FEATURED STAY' : 'SALEM STAY'}
          </Text>
          <Text style={styles.title}>{hotel.name}</Text>
          {hotel.address ? (
            <Text style={styles.address}>{hotel.address}</Text>
          ) : null}
        </View>

        <View style={styles.quickActions}>
          {(hotel.address ||
            (hotel.latitude != null && hotel.longitude != null)) ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void openMap()}
              style={styles.primaryButton}
            >
              <Ionicons
                name="navigate"
                size={19}
                color={colors.background}
              />
              <Text style={styles.primaryButtonText}>
                DIRECTIONS
              </Text>
            </Pressable>
          ) : null}

          {hotel.phone ? (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                void openUrl(
                  'tel:' + hotel.phone!.replace(/[^+\d]/g, ''),
                )
              }
              style={styles.secondaryButton}
            >
              <Ionicons name="call-outline" size={19} color={colors.gold} />
              <Text style={styles.secondaryButtonText}>CALL</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.flags}>
          {hotel.parkingAvailable ? (
            <View style={styles.flag}>
              <Ionicons name="car-outline" size={18} color={colors.gold} />
              <Text style={styles.flagText}>Parking available</Text>
            </View>
          ) : null}
          {hotel.petFriendly ? (
            <View style={styles.flag}>
              <Ionicons name="paw-outline" size={18} color={colors.gold} />
              <Text style={styles.flagText}>Pet friendly</Text>
            </View>
          ) : null}
          {hotel.familyFriendly ? (
            <View style={styles.flag}>
              <Ionicons name="people-outline" size={18} color={colors.gold} />
              <Text style={styles.flagText}>Family friendly</Text>
            </View>
          ) : null}
        </View>

        {hotel.fullDescription || hotel.shortDescription ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About this stay</Text>
            <Text style={styles.body}>
              {hotel.fullDescription || hotel.shortDescription}
            </Text>
          </View>
        ) : null}

        {hotel.amenities.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Amenities</Text>
            <View style={styles.amenities}>
              {hotel.amenities.map((amenity) => (
                <View key={amenity} style={styles.amenity}>
                  <Ionicons
                    name="checkmark-circle"
                    size={17}
                    color={colors.gold}
                  />
                  <Text style={styles.amenityText}>{amenity}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {hotel.websiteUrl || hotel.bookingUrl ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hotel links</Text>

            {hotel.websiteUrl ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => void openUrl(hotel.websiteUrl)}
                style={styles.linkButton}
              >
                <Ionicons name="globe-outline" size={20} color={colors.gold} />
                <Text style={styles.linkButtonText}>OFFICIAL WEBSITE</Text>
                <Ionicons
                  name="open-outline"
                  size={18}
                  color={colors.textMuted}
                />
              </Pressable>
            ) : null}

            {hotel.bookingUrl ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => void openUrl(hotel.bookingUrl)}
                style={styles.linkButton}
              >
                <Ionicons name="calendar-outline" size={20} color={colors.gold} />
                <Text style={styles.linkButtonText}>BOOKING INFORMATION</Text>
                <Ionicons
                  name="open-outline"
                  size={18}
                  color={colors.textMuted}
                />
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <Text style={styles.note}>
          BROOMSTICK provides hotel information and links. Room rates and availability are handled by the hotel or booking provider.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  circleButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  brand: {
    ...typography.title,
    fontSize: 22,
    lineHeight: 28,
  },
  heroImage: {
    width: '100%',
    height: 220,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  heroPlaceholder: {
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: '#21172B',
  },
  heading: {
    gap: 4,
  },
  eyebrow: {
    ...typography.eyebrow,
    color: colors.gold,
  },
  title: {
    ...typography.display,
    fontSize: 32,
    lineHeight: 38,
  },
  address: {
    ...typography.body,
    color: colors.textMuted,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  primaryButton: {
    flex: 1,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.md,
  },
  primaryButtonText: {
    ...typography.caption,
    color: colors.background,
    fontWeight: '900',
  },
  secondaryButton: {
    flex: 0.72,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radius.md,
    backgroundColor: '#21172B',
    paddingHorizontal: spacing.md,
  },
  secondaryButtonText: {
    ...typography.caption,
    color: colors.gold,
    fontWeight: '900',
  },
  flags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  flag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.pill,
    backgroundColor: '#21172B',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  flagText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '700',
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.title,
    fontSize: 20,
    lineHeight: 26,
  },
  body: {
    ...typography.body,
    color: colors.text,
  },
  amenities: {
    gap: spacing.sm,
  },
  amenity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  amenityText: {
    ...typography.body,
    flex: 1,
  },
  linkButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  linkButtonText: {
    ...typography.caption,
    flex: 1,
    color: colors.gold,
    fontWeight: '900',
  },
  note: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  unavailable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  unavailableTitle: {
    ...typography.title,
    marginTop: spacing.md,
  },
  unavailableText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
});
