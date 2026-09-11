import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

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
  const { width } = useWindowDimensions();
  const narrow = width < 375;
  const crowd = aggregate.crowdLevel ? crowdPresentation[aggregate.crowdLevel] : null;
  const quickStatus = getQuickStatusLabel(aggregate.quickStatusTag);

  return (
    <View style={styles.card}>
      <View style={styles.imageFrame}>
        <Image source={item.image} resizeMode="cover" style={styles.image} />
        {quickStatus ? <Text numberOfLines={2} style={styles.quickStatus}>• {quickStatus}</Text> : null}
      </View>
      <View style={styles.content}>
        <Text style={[styles.name, narrow && styles.nameNarrow]}>{item.name}</Text>
        <View style={styles.statusRow}>
          <Ionicons name="people" size={15} color={crowd?.color ?? colors.textMuted} />
          <Text style={[styles.crowd, { color: crowd?.color ?? colors.textMuted }]}>{crowd?.label ?? 'No recent reports'}</Text>
          <Text style={styles.wait}>{aggregate.hasRecentReports ? aggregate.estimatedWaitLabel : '—'}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text numberOfLines={1} style={styles.updated}>{aggregate.hasRecentReports ? aggregate.freshnessLabel : ''}</Text>
          <Ionicons name="walk" size={13} color={colors.gold} />
          <Text style={styles.distance}>{item.distance}</Text>
        </View>
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" onPress={onDetails} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
            <Text style={styles.secondaryText}>View Details</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onReport} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
            <Ionicons name="create-outline" size={13} color={colors.black} />
            <Text style={styles.primaryText}>Report Wait</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...shadows.card, flexDirection: 'row', alignItems: 'center', overflow: 'hidden', backgroundColor: '#0D111A', borderWidth: 1, borderColor: '#46516D', borderRadius: radius.md },
  imageFrame: { width: '28%', maxWidth: 112, aspectRatio: 1.08, marginLeft: 7, overflow: 'hidden', borderRadius: radius.sm, backgroundColor: '#171322' },
  image: { width: '100%', height: '100%' },
  content: { minWidth: 0, flex: 1, alignSelf: 'stretch', paddingHorizontal: 7, paddingVertical: 4 },
  name: { ...typography.title, height: 42, fontSize: 14, lineHeight: 14 },
  nameNarrow: { height: 42, fontSize: 13, lineHeight: 14 },
  statusRow: { minWidth: 0, height: 15, flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  crowd: { minWidth: 0, flexShrink: 1, fontSize: 11, fontWeight: '900' },
  wait: { flexShrink: 0, marginLeft: 'auto', color: colors.text, fontSize: 13, fontWeight: '900' },
  metaRow: { minWidth: 0, height: 12, flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 },
  updated: { minWidth: 0, flex: 1, color: colors.textMuted, fontSize: 9 },
  quickStatus: { position: 'absolute', right: 3, bottom: 3, left: 3, overflow: 'hidden', borderRadius: 5, backgroundColor: '#090713D9', color: colors.gold, paddingHorizontal: 3, paddingVertical: 1, fontSize: 8, lineHeight: 9, textAlign: 'center', fontWeight: '800' },
  distance: { flexShrink: 0, color: colors.textMuted, fontSize: 9, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 5, marginTop: 2 },
  secondaryButton: { minWidth: 0, flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 27, borderWidth: 1, borderColor: '#71509A', borderRadius: radius.sm, paddingHorizontal: 3 },
  primaryButton: { minWidth: 0, flex: 1.12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 27, backgroundColor: colors.gold, borderRadius: radius.sm, paddingHorizontal: 3 },
  secondaryText: { color: colors.text, fontSize: 9, fontWeight: '800' },
  primaryText: { color: colors.black, fontSize: 9, fontWeight: '900' },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
});
