import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography } from '@/theme/tokens';

type IconName = ComponentProps<typeof Ionicons>['name'];

export function SettingsInfoScreen({ title, icon, body, children }: {
  title: string;
  icon: IconName;
  body: string;
  children?: ReactNode;
}) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.page}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to More" onPress={() => router.canGoBack() ? router.back() : router.replace('/more')} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <View style={styles.titleRow}>
          <View style={styles.iconCircle}><Ionicons name={icon} size={29} color={colors.gold} /></View>
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.body}>{body}</Text>
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  page: { flexGrow: 1, gap: spacing.xl, padding: spacing.lg, paddingBottom: spacing.xxxl },
  back: { minHeight: 44, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center' },
  backText: { color: colors.text, fontSize: 16, fontWeight: '700' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconCircle: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.gold, borderRadius: radius.pill, backgroundColor: '#25172D' },
  title: { ...typography.display, minWidth: 0, flex: 1, fontSize: 31, lineHeight: 37 },
  card: { gap: spacing.lg, borderWidth: 1, borderColor: '#536080', borderRadius: radius.md, backgroundColor: '#0D131E', padding: spacing.lg },
  body: { ...typography.body, color: colors.textMuted },
});
