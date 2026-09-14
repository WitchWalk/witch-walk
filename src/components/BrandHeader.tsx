import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, shadows, spacing } from '@/theme/tokens';

const heroArtwork = require('../../Photos/Broomstick Header.png');

type BrandHeaderProps = {
  onSettingsPress: () => void;
};

export function BrandHeader({ onSettingsPress }: BrandHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.artworkWindow}>
        <Image
          source={heroArtwork}
          style={styles.artwork}
          resizeMode="cover"
          accessibilityLabel="BROOMSTICK — The Salem Guidebook"
          accessibilityIgnoresInvertColors
        />
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
    inset: 0,
    overflow: 'hidden',
  },
  artwork: {
    width: '100%',
    height: '100%',
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
