import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme/tokens';

const headerImage = require('../../../assets/images/home/wait-times.png');

type WaitTimesHeaderProps = {
  report?: boolean;
};

export function WaitTimesHeader({ report = false }: WaitTimesHeaderProps) {
  return (
    <ImageBackground source={headerImage} resizeMode="cover" style={[styles.hero, report && styles.reportHero]} imageStyle={styles.heroImage}>
      <View style={styles.shade} />
      <View style={styles.topRow}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10} onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={25} color={colors.text} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={styles.brand}>BROOMSTICK</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Open settings" hitSlop={10} onPress={() => router.push('/more')} style={styles.iconButton}>
          <Ionicons name="settings-outline" size={20} color={colors.text} />
        </Pressable>
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, report && styles.reportTitle]}>{report ? 'Report a\nWait Time' : 'Wait Times'}</Text>
        <Text style={styles.subtitle}>{report ? 'Help fellow travelers with a quick update.' : 'See what is busy right now in Salem.'}</Text>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  hero: { height: 208, overflow: 'hidden', justifyContent: 'space-between', borderRadius: radius.lg, padding: spacing.md },
  reportHero: { height: 230 },
  heroImage: { borderRadius: radius.lg },
  shade: { position: 'absolute', inset: 0, backgroundColor: 'rgba(6, 3, 12, 0.38)' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { minHeight: 40, flexDirection: 'row', alignItems: 'center', paddingRight: spacing.sm, borderRadius: radius.pill, backgroundColor: 'rgba(4, 3, 8, 0.68)' },
  backText: { color: colors.text, fontSize: 14, fontWeight: '800' },
  brand: { ...typography.title, flex: 1, textAlign: 'center', fontSize: 23, lineHeight: 29, textTransform: 'uppercase' },
  star: { color: colors.gold, fontSize: 17 },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, backgroundColor: 'rgba(4, 3, 8, 0.68)' },
  copy: { alignItems: 'flex-start' },
  title: { ...typography.display, fontSize: 39, lineHeight: 43 },
  reportTitle: { fontSize: 36, lineHeight: 37 },
  subtitle: { ...typography.body, color: '#F0E4D7', fontSize: 14, lineHeight: 19 },
});
