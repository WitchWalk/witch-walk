import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WaitTimesHeader } from '@/components/wait-times/WaitTimesHeader';
import { crowdPresentation, getWaitTimeAttraction, type CrowdLevel } from '@/data/waitTimes';
import { colors, radius, shadows, spacing, typography } from '@/theme/tokens';

const waits = [0, 10, 20, 30, 45, 60] as const;
const quickNotes = ['Line moving quickly', 'Ticket line only', 'Line wraps outside'];

export default function ReportWaitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = getWaitTimeAttraction(id);
  const [wait, setWait] = useState<number | null>(item?.estimatedMinutes ?? null);
  const [crowd, setCrowd] = useState<CrowdLevel | null>(item?.crowdLevel ?? null);
  const [note, setNote] = useState('');

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

  const submit = () => {
    if (wait === null || crowd === null) {
      Alert.alert('Choose wait and crowd', 'Select both items before previewing your report.');
      return;
    }

    Alert.alert('Sample report ready', 'Phase 7A keeps this report on-screen only. It has not been submitted or saved.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

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

        <View style={styles.phaseNotice}>
          <Ionicons name="information-circle" size={22} color={colors.lavender} />
          <Text style={styles.phaseNoticeText}>Phase 7A preview: location verification will be added in Phase 7B.</Text>
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

        <Pressable accessibilityRole="button" onPress={submit} style={({ pressed }) => [styles.submitButton, pressed && styles.pressed]}>
          <Ionicons name="paper-plane" size={22} color={colors.black} />
          <Text style={styles.submitText}>Preview Report</Text>
        </Pressable>
        <Text style={styles.disclaimer}>No report is transmitted or saved during Phase 7A.</Text>
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
  phaseNotice: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: '#8050B5', borderRadius: radius.md, backgroundColor: '#28133D', padding: spacing.md },
  phaseNoticeText: { minWidth: 0, flex: 1, color: colors.text, fontSize: 12.5, lineHeight: 17 },
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
  submitText: { color: colors.black, fontSize: 17, fontWeight: '900' },
  disclaimer: { ...typography.caption, textAlign: 'center', fontSize: 10.5 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  notFoundTitle: { ...typography.title },
});
