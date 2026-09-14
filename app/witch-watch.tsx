import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWitchWatch } from '@/components/WitchWatchProvider';
import { useAppSettings } from '@/components/settings/AppSettingsProvider';
import { getAttraction } from '@/data/attractions';
import { getWaitTimeAggregates } from '@/services/waitAggregationService';
import type { WaitTimeAggregate } from '@/services/waitReportCore';
import { WATCH_THRESHOLDS, watchRuleLabel, type Watch, type WatchRule } from '@/services/witchWatchCore';
import { enableRemoteWatchNotifications, enableWatchNotifications } from '@/services/witchWatchNotifications';
import { remoteWitchWatchEnabled } from '@/config/witchWatchBackend';
import { colors, typography } from '@/theme/tokens';

export default function WitchWatchScreen() {
  const { ready } = useWitchWatch();
  const { ready: settingsReady } = useAppSettings();
  return ready && settingsReady ? <WitchWatchContent /> : <SafeAreaView style={styles.safe}><Text style={styles.body}>Loading Witch Watch…</Text></SafeAreaView>;
}
function WitchWatchContent() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { watches, ready, save, remove } = useWitchWatch();
  const { settings } = useAppSettings();
  const existing = watches.find(w => w.attractionId === id);
  const [editing, setEditing] = useState<string | null>(id ?? null);
  const [rule, setRule] = useState<WatchRule>(existing?.crowdAlertType ?? 'busy-to-moderate');
  const [threshold, setThreshold] = useState<number | null>(existing ? existing.waitThresholdMinutes : settings.defaultWaitThresholdMinutes);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [aggregates, setAggregates] = useState<Record<string, WaitTimeAggregate>>({});
  useEffect(() => {
    let active = true;
    const refresh = () => { void getWaitTimeAggregates().then(v => { if (active) setAggregates(v); }).catch(() => undefined); };
    refresh(); const timer = setInterval(refresh, 30_000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  const edit = (watch: Watch) => { setEditing(watch.attractionId); setRule(watch.crowdAlertType); setThreshold(watch.waitThresholdMinutes); };
  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try { await action(); } catch { setMessage('Could not save your changes. Please try again.'); } finally { setBusy(false); }
  };
  const enable = async (watch: Watch) => {
    const registration = remoteWitchWatchEnabled
      ? await enableRemoteWatchNotifications().catch(() => 'unavailable' as const)
      : (await enableWatchNotifications().catch(() => false) ? 'local' as const : 'denied' as const);
    const latest = (await getWaitTimeAggregates())[watch.attractionId];
    await save({ ...watch, enabled: true, lastKnownCrowdStatus: latest?.crowdLevel ?? null, lastKnownEstimatedWait: latest?.estimatedWaitMinutes ?? null });
    setMessage(registration === 'registered'
      ? 'Watch saved. Witch Watch can alert you when conditions improve.'
      : registration === 'local'
        ? 'Watch saved. Alerts can arrive while BROOMSTICK is active.'
      : registration === 'denied'
        ? 'Watch saved. Enable notifications in device settings to receive alerts.'
        : 'Watch saved. Remote alerts will be available after notification setup is completed.');
  };
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.page}>
    <Pressable accessibilityRole="button" onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/more')}><Text style={styles.link}>‹ Back</Text></Pressable>
    <Text style={styles.title}>Witch Watch</Text>
    <Text style={styles.body}>Watch your favorite Salem attractions for improving conditions.</Text>
    <Text style={styles.note}>{remoteWitchWatchEnabled
      ? 'Witch Watch can alert you when shared wait conditions improve, even while the app is closed.'
      : 'Alerts use updates available while BROOMSTICK is open. Remote alerts are prepared but not deployed yet.'}</Text>
    {message ? <Text accessibilityRole="alert" style={styles.note}>{message}</Text> : null}
    <Pressable accessibilityRole="button" onPress={() => void Linking.openSettings().catch(() => setMessage('Open your device settings to enable notifications.'))}><Text style={styles.link}>Notification settings</Text></Pressable>
    {editing && getAttraction(editing) ? <View style={styles.card}>
      <Text style={styles.name}>{getAttraction(editing)?.name}</Text>
      <Text style={styles.body}>Notify me when</Text>
      {(['busy-to-moderate', 'moderate-to-light'] as WatchRule[]).map(value => <Pressable accessibilityRole="radio" accessibilityState={{ checked: rule === value }} key={value} onPress={() => setRule(value)} style={[styles.option, rule === value && styles.selected]}><Text style={styles.body}>{watchRuleLabel(value)}</Text></Pressable>)}
      <Text style={styles.body}>Or when wait drops to (optional)</Text>
      <View style={styles.row}>{[null, ...WATCH_THRESHOLDS].map(value => <Pressable accessibilityRole="button" accessibilityState={{ selected: threshold === value }} key={String(value)} onPress={() => setThreshold(value)} style={[styles.option, threshold === value && styles.selected]}><Text style={styles.body}>{value === null ? 'None' : `${value} min or less`}</Text></Pressable>)}</View>
      <Pressable disabled={busy || !ready} accessibilityRole="button" style={styles.option} onPress={() => void run(async () => {
        await enable({ attractionId: editing, enabled: true, crowdAlertType: rule, waitThresholdMinutes: threshold, lastKnownCrowdStatus: null, lastKnownEstimatedWait: null, lastTriggeredState: null, lastAlertTimestamp: null }); setEditing(null);
      })}><Text style={styles.link}>{busy ? 'Saving…' : 'Save Witch Watch'}</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={() => setEditing(null)}><Text style={styles.body}>Cancel</Text></Pressable>
    </View> : null}
    <Text style={styles.name}>Manage Witch Watch</Text>
    {!ready ? <Text style={styles.body}>Loading…</Text> : !watches.length ? <Text style={styles.body}>No watches yet. Choose Witch Watch on an attraction’s details page.</Text> : null}
    {watches.map(watch => <View style={styles.card} key={watch.attractionId}>
      <Text style={styles.name}>{getAttraction(watch.attractionId)?.name ?? 'Unavailable attraction'}</Text>
      <Text style={styles.body}>{aggregates[watch.attractionId]?.hasRecentReports ? `${aggregates[watch.attractionId].crowdLevel} • ${aggregates[watch.attractionId].estimatedWaitLabel}` : 'No recent reports • —'}</Text>
      <Text style={styles.body}>{watchRuleLabel(watch.crowdAlertType)}{watch.waitThresholdMinutes !== null ? ` or wait ≤ ${watch.waitThresholdMinutes} min` : ''}</Text>
      <View style={styles.row}><Text style={styles.body}>{watch.enabled ? 'Watching' : 'Disabled'}</Text><Switch accessibilityLabel={`Enable watch for ${getAttraction(watch.attractionId)?.name}`} disabled={busy} value={watch.enabled} onValueChange={value => void run(() => value ? enable(watch) : save({ ...watch, enabled: false }))} /></View>
      <View style={styles.row}><Pressable style={styles.option} accessibilityRole="button" onPress={() => edit(watch)}><Text style={styles.link}>Edit alert</Text></Pressable><Pressable style={styles.option} accessibilityRole="button" disabled={busy} onPress={() => Alert.alert('Remove watch?', 'You can add it again from Attraction Details.', [{ text: 'Cancel' }, { text: 'Remove', onPress: () => void run(() => remove(watch.attractionId)) }])}><Text style={styles.link}>Remove watch</Text></Pressable></View>
    </View>)}
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, page: { padding: 18, gap: 14, paddingBottom: 40 },
  title: { ...typography.display, fontSize: 32 }, name: { ...typography.title, fontSize: 20, lineHeight: 25 },
  body: { color: colors.text, fontSize: 14, lineHeight: 21 }, note: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  link: { color: colors.gold, fontSize: 15, fontWeight: '700' },
  card: { backgroundColor: '#140E20', borderColor: '#51415F', borderWidth: 1, borderRadius: 18, padding: 16, gap: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  option: { minHeight: 44, justifyContent: 'center', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#51415F' }, selected: { borderColor: colors.gold, backgroundColor: '#38233C' },
});
