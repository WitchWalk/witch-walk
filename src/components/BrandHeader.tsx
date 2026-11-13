import { Ionicons } from '@expo/vector-icons';
import { ImageBackground, Pressable, StyleSheet, View } from 'react-native';

import { AppText as Text } from '@/components/AppText';
import { colors, radius, shadows, spacing, typography } from '@/theme/tokens';

const heroArtwork = require('../../assets/images/home/live-map.png');

type BrandHeaderProps = {
  onSettingsPress: () => void;
};

export function BrandHeader({ onSettingsPress }: BrandHeaderProps) {
  return (
    <View style={styles.container}>
      <ImageBackground
        source={heroArtwork}
        style={styles.artworkWindow}
        imageStyle={styles.artwork}
        resizeMode="cover"
        accessibilityLabel="BROOMSTICK — The Salem Guidebook"
        accessibilityIgnoresInvertColors
      >
        <View style={styles.artworkShade} />
        <View style={styles.heroCopy}>
          <Text style={styles.kicker}>THE SALEM GUIDEBOOK</Text>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
            style={styles.title}
          >
            BROOMSTICK
          </Text>
          <Text style={styles.subtitle}>Explore Salem your way</Text>
        </View>
      </ImageBackground>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open settings"
        hitSlop={10}
        onPress={onSettingsPress}
        style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}
      >
        <Ionicons name="settings-outline" size={19} color={colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...shadows.card,
    minHeight: 206,
    overflow: 'hidden',
    backgroundColor: colors.backgroundRaised,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
  },
  artworkWindow: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
  },
  artwork: {
    borderRadius: radius.lg - 1,
  },
  artworkShade: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(7, 4, 12, 0.34)',
  },
  heroCopy: {
    position: 'absolute',
    left: spacing.lg,
    right: 58,
    bottom: spacing.lg,
  },
  kicker: {
    ...typography.eyebrow,
    color: colors.gold,
    letterSpacing: 1.2,
  },
  title: {
    ...typography.display,
    color: colors.text,
    width: '100%',
    fontSize: 30,
    lineHeight: 34,
    marginTop: 2,
    textShadowColor: colors.black,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 5,
  },
  subtitle: {
    color: '#F0E7DA',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
    textShadowColor: colors.black,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  settingsButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    zIndex: 2,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 248, 232, 0.35)',
    backgroundColor: 'rgba(8, 6, 12, 0.76)',
  },
  pressed: {
    opacity: 0.68,
  },
});
