import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText as Text } from '@/components/AppText';
import { WaitTimesHeader } from '@/components/wait-times/WaitTimesHeader';
import { useAttractions } from '@/components/attractions/AttractionsProvider';
import { crowdPresentation, getWaitTimeAttractionForContent, type CrowdLevel } from '@/data/waitTimes';
import { waitReportProximityRules } from '@/services/proximity';
import { getWaitTimeAggregate } from '@/services/waitAggregationService';
import { subscribeWaitAggregates } from '@/services/waitAggregateEvents';
import {
  verifyWaitReportLocation,
  type WaitReportVerificationResult,
} from '@/services/waitReportVerification';
import {
  APPROVED_WAIT_MINUTES,
  cooldownMinutesRemaining,
  createSubmissionKey,
  WAIT_QUICK_STATUS_OPTIONS,
  waitReportService,
} from '@/services/waitReportService';
import type { WaitQuickStatusTag, WaitTimeAggregate } from '@/services/waitReportCore';
import { colors, radius, shadows, spacing, typography } from '@/theme/tokens';

export default function ReportWaitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { attractions, ready } = useAttractions();
  const item = getWaitTimeAttractionForContent(id, attractions);
  const [wait, setWait] = useState<number | null>(null);
  const [crowd, setCrowd] = useState<CrowdLevel | null>(null);
  const [quickStatusTag, setQuickStatusTag] = useState<WaitQuickStatusTag | null>(null);
  const [aggregate, setAggregate] = useState<WaitTimeAggregate | null>(null);
  const [verification, setVerification] = useState<WaitReportVerificationResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submissionKey = useRef(createSubmissionKey());

  useEffect(() => {
    if (!item) return;
    let active = true;
    const unsubscribe = subscribeWaitAggregates(values => {
      const value = values.find(value => value.attractionId === item.attractionId);
      if (active && value) setAggregate(value);
    });
    void getWaitTimeAggregate(item.attractionId).then((result) => {
      if (active) setAggregate(result);
    });
    return () => { active = false; unsubscribe(); };
  }, [item]);

  useEffect(() => {
    if (!verification?.verified || !verification.locationTimestamp) return;

    const remaining = waitReportProximityRules.maximumAgeMilliseconds - (Date.now() - verification.locationTimestamp);
    const timeout = setTimeout(() => {
      setVerification((current) => current?.verified
        ? { ...current, verified: false, reason: 'stale' }
        : current);
    }, Math.max(remaining, 0));

    return () => clearTimeout(timeout);
  }, [verification]);

  if (!item) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.notFound}>
          <Ionicons name="alert-circle-outline" size={42} color={colors.gold} />
          <Text style={styles.notFoundTitle}>{ready ? 'Wait reporting unavailable' : 'Loading attraction…'}</Text>
          <Pressable accessibilityRole="button" onPress={() => router.replace('/wait-times')} style={styles.submitButton}>
            <Text style={styles.submitText}>Back to Wait Times</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const checkLocation = async () => {
    if (!item) return null;
    setVerifying(true);
    const result = await verifyWaitReportLocation({ latitude: item.latitude, longitude: item.longitude });
    setVerification(result);
    setVerifying(false);
    return result;
  };

  const submit = async () => {
    if (wait === null || crowd === null) {
      Alert.alert('Choose wait and crowd', 'Select both items before previewing your report.');
      return;
    }

    if (submitting) return;
    setSubmitting(true);

    try {
      const currentVerification = await checkLocation();
      if (!currentVerification?.verified) return;

      const result = await waitReportService.submit({
        attractionId: item.attractionId,
        waitMinutes: wait,
        crowdLevel: crowd,
        quickStatusTag,
        submissionKey: submissionKey.current,
        verification: currentVerification,
      });

      if (result.kind === 'cooldown') {
        const minutes = cooldownMinutesRemaining(result.remainingMilliseconds);
        Alert.alert('Thanks for helping', `You recently reported this attraction. Try again in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}.`);
        return;
      }

      if (result.kind === 'duplicate') {
        Alert.alert('Report already received', 'Your report was only saved once.');
        return;
      }

      if (result.kind === 'invalid') {
        Alert.alert('Check your report', `Please choose a valid ${result.field} value.`);
        return;
      }

      if (result.kind === 'location-failed') {
        const expired = result.reason === 'expired';
        if (expired) setVerification({ verified: false, reason: 'stale' });
        Alert.alert(
          expired ? 'Location verification expired' : 'Location not verified',
          expired ? 'Please verify your location again.' : result.reason === 'inaccurate' ? 'GPS accuracy is too low. Please try verifying your location again.' : 'You need to be near this attraction to report its wait time.',
        );
        return;
      }

      if (result.kind === 'unavailable' || result.kind === 'authentication-failed') {
        Alert.alert('Reporting unavailable', 'Live reporting is temporarily unavailable. Please try again shortly.');
        return;
      }
      if (result.kind === 'idempotency-conflict') {
        submissionKey.current = createSubmissionKey();
        Alert.alert('Please try again', 'Your previous request was already received. Check your selections before submitting another update.');
        return;
      }
      void getWaitTimeAggregate(item.attractionId);
      Alert.alert('Report submitted', 'Location Verified. Thank you for sharing your update.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Reporting unavailable', 'Live reporting is temporarily unavailable. Please try again shortly.');
    } finally {
      setSubmitting(false);
    }
  };

  const verificationDetail = (() => {
    switch (verification?.reason) {
      case 'permission-denied': return 'Foreground location permission was not granted. You can continue browsing and viewing wait times.';
      case 'precise-location-required': return 'Precise Location is required. Enable it for BROOMSTICK in your phone settings.';
      case 'stale': return 'The location reading expired. Check your location again before reporting.';
      case 'inaccurate': return 'GPS accuracy is currently too low. Move to an open area and try again.';
      case 'mocked': return 'This location reading could not be verified.';
      case 'outside-radius': return 'Your verified position is outside the approximately 400-foot reporting area.';
      case 'location-unavailable': return 'A current location reading is unavailable. Please try again outdoors.';
      default: return 'Verify your precise location when you are ready to report.';
    }
  })();

  const permissionBlocked = verification?.reason === 'permission-denied' || verification?.reason === 'precise-location-required';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <WaitTimesHeader report />

        <View style={styles.attractionCard}>
          <Image source={item.image} resizeMode="cover" style={styles.attractionImage} />
          <View style={styles.attractionCopy}>
            <Text style={styles.attractionName}>{item.name}</Text>
            <Text numberOfLines={2} style={styles.address}>{item.address}</Text>
            <View style={styles.currentRow}>
              <View style={styles.currentMetric}>
                <Ionicons name="people" size={18} color={aggregate?.crowdLevel ? crowdPresentation[aggregate.crowdLevel].color : colors.textMuted} />
                <View style={styles.currentMetricCopy}>
                  <Text style={[styles.currentCrowd, { color: aggregate?.crowdLevel ? crowdPresentation[aggregate.crowdLevel].color : colors.textMuted }]}>
                    {aggregate?.crowdLevel ? crowdPresentation[aggregate.crowdLevel].label : 'No reports'}
                  </Text>
                  <Text style={styles.currentLabel}>Current crowd</Text>
                </View>
              </View>
              <View style={styles.currentDivider} />
              <View style={styles.currentMetric}>
                <Ionicons name="time-outline" size={18} color={colors.text} />
                <View style={styles.currentMetricCopy}>
                  <Text style={styles.currentWait}>{aggregate?.crowdLevel ? aggregate.estimatedWaitLabel : '—'}</Text>
                  <Text style={styles.currentLabel}>Current wait</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.verificationCard, verification?.verified && styles.verificationCardSuccess, verification && !verification.verified && styles.verificationCardFailed]}>
          <Ionicons
            name={verification?.verified ? 'checkmark-circle' : verification ? 'location' : 'location-outline'}
            size={25}
            color={verification?.verified ? colors.success : verification ? '#FF8B73' : colors.lavender}
          />
          <View style={styles.verificationCopy}>
            <Text style={[styles.verificationTitle, verification?.verified && styles.verificationTitleSuccess]}>
              {verification?.verified ? 'Location Verified' : verification ? 'You need to be near this attraction to report its wait time.' : 'Verify Location to Report'}
            </Text>
            <Text style={styles.verificationText}>{verification?.verified ? 'You are close enough to submit a wait report.' : verificationDetail}</Text>
          </View>
          {permissionBlocked ? (
            <Pressable accessibilityRole="button" onPress={() => void Linking.openSettings()} style={styles.verifyButton}>
              <Text style={styles.verifyButtonText}>Settings</Text>
            </Pressable>
          ) : (
            <Pressable accessibilityRole="button" disabled={verifying} onPress={() => void checkLocation()} style={[styles.verifyButton, verifying && styles.buttonDisabled]}>
              <Text style={styles.verifyButtonText}>{verifying ? 'Checking…' : verification ? 'Check Again' : 'Verify'}</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What is the current wait time?</Text>
          <View style={styles.waitGrid}>
            {APPROVED_WAIT_MINUTES.map((minutes) => {
              const selected = wait === minutes;
              return (
                <Pressable key={minutes} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setWait(minutes)} style={[styles.waitOption, selected && styles.waitSelected]}>
                  <Text style={[styles.waitOptionText, selected && styles.waitSelectedText]}>{minutes === 0 ? 'No Wait' : minutes === 60 ? '60+ min' : `${minutes} min`}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What is the crowd level?</Text>
          <View style={styles.crowdGrid}>
            {(['light', 'moderate', 'busy'] as const).map((level) => {
              const selected = crowd === level;
              const presentation = crowdPresentation[level];
              return (
                <Pressable key={level} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setCrowd(level)} style={[styles.crowdOption, selected && { borderColor: presentation.color, backgroundColor: `${presentation.color}16` }]}>
                  <Ionicons name="people" size={28} color={presentation.color} />
                  <Text style={[styles.crowdTitle, { color: presentation.color }]}>{presentation.label}</Text>
                  <Text style={styles.crowdHint}>{level === 'light' ? 'Plenty of space' : level === 'moderate' ? 'Steady crowd' : 'Long lines'}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick status <Text style={styles.optional}>(Optional • choose one)</Text></Text>
          <View style={styles.quickStatuses}>
            {WAIT_QUICK_STATUS_OPTIONS.map((option) => {
              const selected = quickStatusTag === option.id;
              return (
                <Pressable
                  key={option.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setQuickStatusTag(selected ? null : option.id)}
                  style={[styles.statusChip, selected && styles.statusChipSelected]}
                >
                  <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={15} color={selected ? colors.gold : colors.textMuted} />
                  <Text style={[styles.statusChipText, selected && styles.statusChipTextSelected]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !verification?.verified || verifying || submitting }}
          disabled={!verification?.verified || verifying || submitting}
          onPress={() => void submit()}
          style={({ pressed }) => [styles.submitButton, (!verification?.verified || verifying || submitting) && styles.submitDisabled, pressed && styles.pressed]}
        >
          <Ionicons name="paper-plane" size={22} color={colors.black} />
          <Text style={styles.submitText}>{submitting ? 'Submitting…' : verifying ? 'Verifying Location…' : 'Submit Report'}</Text>
        </Pressable>
        <Text style={styles.disclaimer}>Precise coordinates are not stored. Only the report, its timestamp, and a private local identifier remain on this device.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md },
  attractionCard: { ...shadows.card, height: 138, flexDirection: 'row', overflow: 'hidden', borderWidth: 1, borderColor: '#4D5F85', borderRadius: radius.md, backgroundColor: '#0D111A' },
  attractionImage: { width: '38%', height: 138, flexShrink: 0 },
  attractionCopy: { minWidth: 0, flex: 1, justifyContent: 'center', paddingHorizontal: 11, paddingVertical: 9 },
  attractionName: { ...typography.title, flexShrink: 1, fontSize: 18, lineHeight: 21 },
  address: { ...typography.caption, flexShrink: 1, marginTop: 2, fontSize: 10.5, lineHeight: 13 },
  currentRow: { minWidth: 0, flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  currentMetric: { minWidth: 0, flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 },
  currentMetricCopy: { minWidth: 0, flex: 1 },
  currentDivider: { width: StyleSheet.hairlineWidth, height: 31, marginHorizontal: 6, backgroundColor: '#63708E' },
  currentCrowd: { fontSize: 11, lineHeight: 13, fontWeight: '900' },
  currentWait: { color: colors.text, fontSize: 12, lineHeight: 14, fontWeight: '900' },
  currentLabel: { color: colors.textMuted, fontSize: 8.5, lineHeight: 11 },
  verificationCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: '#8050B5', borderRadius: radius.md, backgroundColor: '#28133D', padding: spacing.md },
  verificationCardSuccess: { borderColor: colors.success, backgroundColor: '#0D2A23' },
  verificationCardFailed: { borderColor: '#A04E52', backgroundColor: '#281419' },
  verificationCopy: { minWidth: 0, flex: 1 },
  verificationTitle: { color: colors.text, fontSize: 12.5, lineHeight: 16, fontWeight: '900' },
  verificationTitleSuccess: { color: colors.success, fontSize: 15 },
  verificationText: { color: colors.textMuted, fontSize: 10.5, lineHeight: 14, marginTop: 2 },
  verifyButton: { minHeight: 36, justifyContent: 'center', borderWidth: 1, borderColor: colors.lavender, borderRadius: radius.sm, paddingHorizontal: 9 },
  verifyButtonText: { color: colors.text, fontSize: 10.5, fontWeight: '900' },
  buttonDisabled: { opacity: 0.55 },
  section: { gap: spacing.sm },
  sectionTitle: { ...typography.title, fontSize: 20, lineHeight: 25 },
  optional: { color: colors.textMuted, fontFamily: undefined, fontSize: 13, fontWeight: '500' },
  waitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  waitOption: { width: '30.8%', minHeight: 50, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#4E5873', borderRadius: radius.sm, backgroundColor: '#11131E', paddingHorizontal: 4 },
  waitSelected: { borderColor: colors.gold, backgroundColor: colors.gold },
  waitOptionText: { color: colors.text, fontSize: 13, fontWeight: '700' },
  waitSelectedText: { color: colors.black, fontWeight: '900' },
  crowdGrid: { flexDirection: 'row', gap: spacing.sm },
  crowdOption: { minWidth: 0, flex: 1, minHeight: 104, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#4A4055', borderRadius: radius.md, backgroundColor: '#0D0D14', padding: 6 },
  crowdTitle: { marginTop: 3, fontSize: 13, fontWeight: '900' },
  crowdHint: { color: colors.textMuted, fontSize: 9.5, lineHeight: 13, textAlign: 'center' },
  quickStatuses: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  statusChip: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: '#505A77', borderRadius: radius.sm, backgroundColor: '#11131E', paddingHorizontal: 10 },
  statusChipSelected: { borderColor: colors.gold, backgroundColor: '#2A1C1B' },
  statusChipText: { color: colors.textMuted, fontSize: 11 },
  statusChipTextSelected: { color: colors.text, fontWeight: '800' },
  submitButton: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderRadius: radius.md, backgroundColor: colors.gold, paddingHorizontal: spacing.lg },
  submitDisabled: { opacity: 0.42 },
  submitText: { color: colors.black, fontSize: 17, fontWeight: '900' },
  disclaimer: { ...typography.caption, textAlign: 'center', fontSize: 10.5 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  notFoundTitle: { ...typography.title },
});
