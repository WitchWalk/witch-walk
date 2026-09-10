import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { WaitTimeAttraction } from '@/data/waitTimes';
import { crowdPresentation } from '@/data/waitTimes';
import { getQuickStatusLabel, type WaitTimeAggregate } from '@/services/waitReportCore';
import { colors, radius, shadows, typography } from '@/theme/tokens';

type WaitTimeCardProps = {
  item: WaitTimeAttraction;
  aggregate: WaitTimeAggregate;
  onDetails: () => void;
  onReport: () => void;
};

export function WaitTimeCard({ item, aggregate, onDetails, onReport }: WaitTimeCardProps) {
  const crowd = aggregate.crowdLevel ? crowdPresentation[aggregate.crowdLevel] : null;
  const quickStatus = getQuickStatusLabel(aggregate.quickStatusTag);

  return (
    <View style={styles.card}>
      <Image source={item.image} resizeMode="cover" style={styles.image} />
      <View style={styles.content}>
        <Text style={styles.name}>{item.name}</Text>
        <View style={styles.statusRow}>
          <Ionicons name="people" size={17} color={crowd?.color ?? colors.textMuted} />
          <Text style={[styles.crowd, { color: crowd?.color ?? colors.textMuted }]}>{crowd?.label ?? 'No recent reports'}</Text>
          <Text style={styles.wait}>{aggregate.hasRecentReports ? aggregate.estimatedWaitLabel : '—'}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text numberOfLines={1} style={styles.updated}>{aggregate.freshnessLabel}</Text>
          <Ionicons name="walk" size={13} color={colors.gold} />
          <Text style={styles.distance}>{item.distance}</Text>
        </View>
        {quickStatus ? <Text numberOfLines={1} style={styles.quickStatus}>• {quickStatus}</Text> : null}
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" onPress={onDetails} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
            <Text style={styles.secondaryText}>View Details</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onReport} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
            <Ionicons name="create-outline" size={15} color={colors.black} />
            <Text style={styles.primaryText}>Report Wait</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...shadows.card, minHeight: 154, flexDirection: 'row', overflow: 'hidden', backgroundColor: '#0D111A', borderWidth: 1, borderColor: '#46516D', borderRadius: radius.md },
  image: { width: 112, alignSelf: 'stretch' },
  content: { minWidth: 0, flex: 1, padding: 10 },
  name: { ...typography.title, fontSize: 16, lineHeight: 20 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  crowd: { fontSize: 12, fontWeight: '900' },
  wait: { marginLeft: 'auto', color: colors.text, fontSize: 16, fontWeight: '900' },
  metaRow: { minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  updated: { minWidth: 0, flex: 1, color: colors.textMuted, fontSize: 10.5 },
  quickStatus: { color: colors.gold, fontSize: 10.5, lineHeight: 14, marginTop: 2 },
  distance: { color: colors.textMuted, fontSize: 10.5, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 6, marginTop: 'auto' },
  secondaryButton: { minWidth: 0, flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 36, borderWidth: 1, borderColor: '#71509A', borderRadius: radius.sm, paddingHorizontal: 4 },
  primaryButton: { minWidth: 0, flex: 1.15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 36, backgroundColor: colors.gold, borderRadius: radius.sm, paddingHorizontal: 4 },
  secondaryText: { color: colors.text, fontSize: 10.5, fontWeight: '800' },
  primaryText: { color: colors.black, fontSize: 10.5, fontWeight: '900' },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
});
