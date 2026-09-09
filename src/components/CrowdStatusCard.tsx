import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadows, spacing, typography } from '@/theme/tokens';

type CrowdStatusCardProps = {
  onPress: () => void;
};

export function CrowdStatusCard({ onPress }: CrowdStatusCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Downtown Salem is busy. Open the live map."
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.iconWrap}>
        <Ionicons name="people" size={28} color={colors.warning} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.label}>Downtown Salem</Text>
        <Text style={styles.statusLine}>
          Currently <Text style={styles.status}>Busy</Text>
        </Text>
      </View>
      <View style={styles.link}>
        <Text numberOfLines={1} style={styles.linkText}>See Live Map</Text>
        <Ionicons name="chevron-forward" size={22} color={colors.text} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    ...shadows.card,
    minHeight: 86,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#0C1019',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  iconWrap: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: 'rgba(255, 176, 46, 0.1)',
  },
  copy: {
    flex: 1,
  },
  label: {
    ...typography.heading,
    fontSize: 15.5,
    lineHeight: 20,
    textTransform: 'uppercase',
  },
  statusLine: {
    ...typography.body,
    color: colors.textMuted,
    fontSize: 14.5,
    lineHeight: 19,
  },
  status: {
    color: colors.warning,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  linkText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
});
