import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WaitTimesHeader } from '@/components/wait-times/WaitTimesHeader';
import { crowdPresentation, getWaitTimeAttraction, type CrowdLevel } from '@/data/waitTimes';
import { waitReportProximityRules } from '@/services/proximity';
import {
  verifyWaitReportLocation,
  type WaitReportVerificationResult,
} from '@/services/waitReportVerification';
import { colors, radius, shadows, spacing, typography } from '@/theme/tokens';

const waits = [0, 10, 20, 30, 45, 60] as const;
const quickNotes = ['Line moving quickly', 'Ticket line only', 'Line wraps outside'];

export default function ReportWaitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = getWaitTimeAttraction(id);
  const [wait, setWait] = useState<number | null>(item?.estimatedMinutes ?? null);
  const [crowd, setCrowd] = useState<CrowdLevel | null>(item?.crowdLevel ?? null);
  const [note, setNote] = useState('');
  const [verification, setVerification] = useState<WaitReportVerificationResult | null>(null);
  const [verifying, setVerifying] = useState(false);

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
          <Text style={styles.notFoundTitle}>Attraction not found</Text>
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

    const currentVerification = await checkLocation();
    if (!currentVerification?.verified) return;

    Alert.alert('Location Verified', 'Your sample report passed GPS verification. It has not been transmitted or saved because backend reporting is not part of this phase.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  const verificationDetail = (() => {
    switch (verification?.reason) {
      case 'permission-denied': return 'Foreground location permission was not granted. You can continue browsing and viewing wait times.';
      case 'precise-location-required': return 'Precise Location is required. Enable it for Witch Walk in your phone settings.';
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
              <Ionicons name="people" size={20} color={crowdPresentation[item.crowdLevel].color} />
              <Text style={[styles.currentCrowd, { color: crowdPresentation[item.crowdLevel].color }]}>{crowdPresentation[item.crowdLevel].label}</Text>
              <Text style={styles.currentWait}>{item.estimatedMinutes} min sample</Text>
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
            {waits.map((minutes) => {
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
          <Text style={styles.sectionTitle}>Anything else to share? <Text style={styles.optional}>(Optional)</Text></Text>
          <View style={styles.quickNotes}>
            {quickNotes.map((quickNote) => (
              <Pressable key={quickNote} accessibilityRole="button" onPress={() => setNote(quickNote)} style={styles.noteChip}>
                <Text style={styles.noteChipText}>{quickNote}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.noteField}>
            <Ionicons name="chatbubble-outline" size={21} color={colors.textMuted} />
            <TextInput
              accessibilityLabel="Optional report note"
              maxLength={160}
              multiline
              onChangeText={setNote}
              placeholder="Add a quick note"
              placeholderTextColor="#8D8296"
              style={styles.noteInput}
              value={note}
            />
            <Text style={styles.characterCount}>{note.length}/160</Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !verification?.verified || verifying }}
          disabled={!verification?.verified || verifying}
          onPress={() => void submit()}
          style={({ pressed }) => [styles.submitButton, (!verification?.verified || verifying) && styles.submitDisabled, pressed && styles.pressed]}
        >
          <Ionicons name="paper-plane" size={22} color={colors.black} />
          <Text style={styles.submitText}>{verifying ? 'Verifying Location…' : 'Submit Report'}</Text>
        </Pressable>
        <Text style={styles.disclaimer}>Foreground location is checked only for this report. No location history or report is stored.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md },
  attractionCard: { ...shadows.card, minHeight: 132, flexDirection: 'row', overflow: 'hidden', borderWidth: 1, borderColor: '#4D5F85', borderRadius: radius.md, backgroundColor: '#0D111A' },
  attractionImage: { width: '40%', minHeight: 132 },
  attractionCopy: { minWidth: 0, flex: 1, justifyContent: 'center', padding: spacing.md },
  attractionName: { ...typography.title, fontSize: 19, lineHeight: 23 },
  address: { ...typography.caption, marginTop: 3, fontSize: 11.5 },
  currentRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: spacing.sm },
  currentCrowd: { fontSize: 11.5, fontWeight: '900' },
  currentWait: { marginLeft: 'auto', color: colors.textMuted, fontSize: 10.5 },
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
  crowdOption: { minWidth: 0, flex: 1, minHeight: 120, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#4A4055', borderRadius: radius.md, backgroundColor: '#0D0D14', padding: 6 },
  crowdTitle: { marginTop: 3, fontSize: 13, fontWeight: '900' },
  crowdHint: { color: colors.textMuted, fontSize: 9.5, lineHeight: 13, textAlign: 'center' },
  quickNotes: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  noteChip: { minHeight: 36, justifyContent: 'center', borderWidth: 1, borderColor: '#505A77', borderRadius: radius.sm, backgroundColor: '#11131E', paddingHorizontal: 10 },
  noteChipText: { color: colors.text, fontSize: 11 },
  noteField: { minHeight: 90, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, borderWidth: 1, borderColor: '#505A77', borderRadius: radius.md, backgroundColor: '#0F1320', padding: spacing.md },
  noteInput: { minWidth: 0, flex: 1, minHeight: 56, color: colors.text, fontSize: 14, lineHeight: 19, padding: 0, textAlignVertical: 'top' },
  characterCount: { alignSelf: 'flex-end', color: colors.textMuted, fontSize: 10 },
  submitButton: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderRadius: radius.md, backgroundColor: colors.gold, paddingHorizontal: spacing.lg },
  submitDisabled: { opacity: 0.42 },
  submitText: { color: colors.black, fontSize: 17, fontWeight: '900' },
  disclaimer: { ...typography.caption, textAlign: 'center', fontSize: 10.5 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  notFoundTitle: { ...typography.title },
});
