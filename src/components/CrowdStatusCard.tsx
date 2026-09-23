import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText as Text } from '@/components/AppText';
import { crowdPresentation } from '@/data/waitTimes';
import {
  getDowntownCrowdAccessibilityLabel,
  type DowntownCrowdStatus,
} from '@/services/downtownCrowdStatus';
import { colors, radius, shadows, spacing, typography } from '@/theme/tokens';

type CrowdStatusCardProps = {
  onPress: () => void;
  status: DowntownCrowdStatus;
};

export function CrowdStatusCard({ onPress, status }: CrowdStatusCardProps) {
  const liveStatus = status.kind === 'crowd' ? crowdPresentation[status.level] : null;
  const statusText = status.kind === 'crowd'
    ? liveStatus?.label.toUpperCase()
    : status.kind === 'unavailable' ? 'Live status unavailable' : 'No recent crowd data';
  const statusColor = liveStatus?.color ?? colors.textMuted;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={getDowntownCrowdAccessibilityLabel(status)}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.iconWrap}>
        <Ionicons name={liveStatus ? 'people' : 'people-outline'} size={28} color={statusColor} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.label}>Downtown Salem</Text>
        <Text adjustsFontSizeToFit minimumFontScale={0.78} numberOfLines={1} style={styles.statusLine}>
          {liveStatus ? 'Currently ' : ''}<Text style={[styles.status, { color: statusColor }]}>{statusText}</Text>
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
    fontWeight: '900',
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
