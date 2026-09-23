import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { ImageBackground, Pressable, StyleSheet, View, type ImageSourcePropType } from 'react-native';

import { AppText as Text } from '@/components/AppText';
import { colors, radius, shadows, spacing } from '@/theme/tokens';

type IconName = ComponentProps<typeof Ionicons>['name'];
type MaterialIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type HomeShortcutCardProps = {
  title: string;
  subtitle: string;
  icon: IconName | MaterialIconName;
  iconFamily?: 'ionicons' | 'material-community';
  accent: string;
  image: ImageSourcePropType;
  wide?: boolean;
  onPress: () => void;
};

export function HomeShortcutCard({
  title,
  subtitle,
  icon,
  iconFamily = 'ionicons',
  accent,
  image,
  wide = false,
  onPress,
}: HomeShortcutCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, wide && styles.wideCard, pressed && styles.pressed]}
    >
      <ImageBackground
        source={image}
        resizeMode="cover"
        style={[styles.image, wide && styles.wideImage]}
        imageStyle={styles.imageRadius}
      >
        <View style={styles.imageShade} />
        <View style={styles.bottomShade} />
        <View style={[styles.content, wide && styles.wideContent]}>
          {iconFamily === 'material-community' ? (
            <MaterialCommunityIcons name={icon as MaterialIconName} size={38} color={accent} style={styles.icon} />
          ) : (
            <Ionicons name={icon as IconName} size={38} color={accent} style={styles.icon} />
          )}
          <Text
            numberOfLines={wide ? 2 : 1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            style={[styles.title, wide && styles.wideTitle]}
          >
            {title}
          </Text>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.76} style={styles.subtitle}>
            {subtitle}
          </Text>
        </View>
      </ImageBackground>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    ...shadows.card,
    flex: 1,
    minHeight: 136,
    overflow: 'hidden',
    backgroundColor: colors.backgroundRaised,
    borderWidth: 1,
    borderColor: '#504461',
    borderRadius: radius.md,
  },
  wideCard: {
    minHeight: 112,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.97 }],
  },
  image: {
    flex: 1,
    minHeight: 134,
    justifyContent: 'flex-end',
  },
  wideImage: {
    minHeight: 110,
  },
  imageRadius: {
    borderRadius: radius.md - 1,
  },
  imageShade: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(5, 4, 10, 0.22)',
  },
  bottomShade: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    height: '68%',
    backgroundColor: 'rgba(4, 4, 9, 0.64)',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.sm,
  },
  wideContent: {
    paddingHorizontal: spacing.sm,
  },
  icon: {
    marginBottom: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.88)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 5,
  },
  title: {
    width: '100%',
    color: colors.text,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '900',
    letterSpacing: -0.2,
    textAlign: 'center',
    textTransform: 'uppercase',
    textShadowColor: colors.black,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  wideTitle: {
    fontSize: 14,
    lineHeight: 17,
  },
  subtitle: {
    width: '100%',
    color: '#F0E9E3',
    fontSize: 11.5,
    lineHeight: 16,
    textAlign: 'center',
    textShadowColor: colors.black,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
