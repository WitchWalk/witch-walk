import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WaitTimeCard } from '@/components/wait-times/WaitTimeCard';
import { WaitTimesHeader } from '@/components/wait-times/WaitTimesHeader';
import { crowdPresentation, waitTimeAttractions } from '@/data/waitTimes';
import { colors, radius, spacing, typography } from '@/theme/tokens';

type WaitFilter = 'All' | 'Lowest Wait' | 'Highest Wait' | 'Nearby';
const filters: WaitFilter[] = ['All', 'Lowest Wait', 'Highest Wait', 'Nearby'];

export function WaitTimesScreenView() {
  const [filter, setFilter] = useState<WaitFilter>('All');

  const items = useMemo(() => {
    const next = [...waitTimeAttractions];
    if (filter === 'Lowest Wait') return next.sort((a, b) => a.estimatedMinutes - b.estimatedMinutes);
    if (filter === 'Highest Wait') return next.sort((a, b) => b.estimatedMinutes - a.estimatedMinutes);
    if (filter === 'Nearby') return next.sort((a, b) => Number.parseFloat(a.distance) - Number.parseFloat(b.distance));
    return next;
  }, [filter]);

  const openDetails = (id: string) => router.push({ pathname: '/attractions/[id]', params: { id } });
  const openReport = (id: string) => router.push({ pathname: '/report-wait/[id]', params: { id } });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <WaitTimesHeader />

        <ScrollView horizontal contentContainerStyle={styles.filters} showsHorizontalScrollIndicator={false}>
          {filters.map((item) => {
            const selected = filter === item;
            return (
              <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setFilter(item)} style={[styles.filter, selected && styles.filterSelected]}>
                <Ionicons name={item === 'Nearby' ? 'location' : item === 'All' ? 'grid' : 'time-outline'} size={17} color={selected ? colors.black : colors.textMuted} />
                <Text style={[styles.filterText, selected && styles.filterTextSelected]}>{item}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.snapshot}>
          <View style={styles.snapshotLead}>
            <Ionicons name="people" size={31} color={colors.gold} />
            <View><Text style={styles.snapshotTitle}>Downtown Salem</Text><Text style={styles.snapshotSubtitle}>Sample crowd snapshot</Text></View>
          </View>
          <View style={styles.snapshotCounts}>
            {(['light', 'moderate', 'busy'] as const).map((level) => (
              <View key={level} style={styles.snapshotItem}>
                <Text style={[styles.snapshotNumber, { color: crowdPresentation[level].color }]}>{waitTimeAttractions.filter((item) => item.crowdLevel === level).length}</Text>
                <Text style={styles.snapshotLabel}>{crowdPresentation[level].label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.sectionHeading}>
          <Ionicons name="sparkles" size={17} color={colors.gold} />
          <Text style={styles.sectionTitle}>Reported Wait Times</Text>
          <View style={styles.rule} />
        </View>

        <View style={styles.list}>
          {items.map((item) => <WaitTimeCard key={item.attractionId} item={item} onDetails={() => openDetails(item.attractionId)} onReport={() => openReport(item.attractionId)} />)}
        </View>

        <Pressable accessibilityRole="button" onPress={() => openReport(items[0]?.attractionId ?? 'witch-house')} style={({ pressed }) => [styles.reportBanner, pressed && styles.pressed]}>
          <Ionicons name="create" size={27} color={colors.text} />
          <View style={styles.reportCopy}><Text style={styles.reportTitle}>Report a Wait Time</Text><Text style={styles.reportText}>Help fellow travelers with a quick local update.</Text></View>
          <Ionicons name="chevron-forward" size={22} color={colors.text} />
        </Pressable>

        <Text style={styles.sampleNote}>Waits and update times shown in Phase 7A are sample data.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md },
  filters: { gap: spacing.sm, paddingRight: spacing.lg },
  filter: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: '#4E4567', borderRadius: radius.pill, backgroundColor: '#11101B', paddingHorizontal: spacing.md },
  filterSelected: { borderColor: colors.gold, backgroundColor: colors.gold },
  filterText: { color: colors.textMuted, fontSize: 12, fontWeight: '800' },
  filterTextSelected: { color: colors.black },
  snapshot: { gap: spacing.md, borderWidth: 1, borderColor: '#4A6695', borderRadius: radius.md, backgroundColor: '#0D1625', padding: spacing.md },
  snapshotLead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  snapshotTitle: { ...typography.heading, fontSize: 17 },
  snapshotSubtitle: { ...typography.caption, fontSize: 11 },
  snapshotCounts: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#263A57', paddingTop: spacing.sm },
  snapshotItem: { flex: 1, alignItems: 'center' },
  snapshotNumber: { fontSize: 19, fontWeight: '900' },
  snapshotLabel: { color: colors.textMuted, fontSize: 10.5 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionTitle: { ...typography.title, fontSize: 20, lineHeight: 25 },
  rule: { flex: 1, height: 1, backgroundColor: '#6B4D27' },
  list: { gap: spacing.sm },
  reportBanner: { minHeight: 88, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderColor: '#A65DE2', borderRadius: radius.md, backgroundColor: '#28133D', padding: spacing.md },
  reportCopy: { minWidth: 0, flex: 1 },
  reportTitle: { ...typography.title, fontSize: 18, lineHeight: 23 },
  reportText: { ...typography.caption, fontSize: 11.5 },
  sampleNote: { ...typography.caption, textAlign: 'center', fontSize: 10.5 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.99 }] },
});
