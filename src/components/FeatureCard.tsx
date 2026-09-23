import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText as Text } from '@/components/AppText';
import { colors, radius, spacing, typography } from '@/theme/tokens';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type FeatureCardProps = {
  title: string;
  subtitle: string;
  icon: IconName;
  accent: string;
  onPress: () => void;
};

export function FeatureCard({ title, subtitle, icon, accent, onPress }: FeatureCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${accent}20` }]}>
        <Ionicons name={icon} size={30} color={accent} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <View style={styles.arrowRow}>
        <Text style={[styles.openLabel, { color: accent }]}>OPEN</Text>
        <Ionicons name="arrow-forward" size={16} color={accent} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 168,
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  iconWrap: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.heading,
    fontSize: 16,
  },
  subtitle: {
    ...typography.caption,
    minHeight: 36,
    marginTop: spacing.xs,
  },
  arrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  openLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
});
