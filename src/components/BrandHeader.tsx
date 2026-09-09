import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadows, spacing, typography } from '@/theme/tokens';

const heroArtwork = require('../../Screen Designs/Style design.png');

type BrandHeaderProps = {
  onSettingsPress: () => void;
};

export function BrandHeader({ onSettingsPress }: BrandHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.artworkWindow}>
        <Image source={heroArtwork} style={styles.artwork} resizeMode="cover" accessibilityIgnoresInvertColors />
      </View>
      <View style={styles.artworkShade} />

      <Text style={styles.kicker}>Explore{`\n`}Discover{`\n`}Wander{`\n`}Salem</Text>

      <View style={styles.brandLockup}>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82} style={styles.title}>
          Witch <Text style={styles.star}>✦</Text> Walk
        </Text>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.76} style={styles.tagline}>
          Real times • Real places • A better visit
        </Text>
      </View>

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
    top: 0,
    right: 0,
    width: '78%',
    height: 164,
    overflow: 'hidden',
  },
  artwork: {
    position: 'absolute',
    top: -12,
    right: -5,
    width: 290,
    height: 290,
    transform: [{ scale: 1.12 }],
  },
  artworkShade: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(7, 4, 13, 0.18)',
  },
  kicker: {
    ...typography.title,
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    zIndex: 1,
    color: '#F0C5B7',
    fontSize: 16,
    lineHeight: 20,
    fontStyle: 'italic',
    fontWeight: '500',
    textShadowColor: colors.black,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  brandLockup: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    left: spacing.md,
    zIndex: 1,
    alignItems: 'center',
    paddingTop: 3,
    backgroundColor: 'rgba(4, 3, 8, 0.64)',
    borderRadius: radius.sm,
  },
  title: {
    ...typography.display,
    width: '100%',
    color: colors.text,
    fontSize: 35,
    lineHeight: 41,
    textAlign: 'center',
    textTransform: 'uppercase',
    textShadowColor: colors.black,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 5,
  },
  star: {
    color: colors.gold,
    fontSize: 25,
  },
  tagline: {
    ...typography.eyebrow,
    width: '100%',
    color: colors.text,
    fontSize: 8.5,
    lineHeight: 15,
    letterSpacing: 1.35,
    textAlign: 'center',
    marginBottom: 3,
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
