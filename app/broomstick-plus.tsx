import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText as Text } from '@/components/AppText';
import { usePlus } from '@/components/plus/PlusProvider';
import { colors, radius, spacing, typography } from '@/theme/tokens';

const benefits = [
  {
    icon: 'map-outline' as const,
    title: 'Curated Salem Tours',
    text: 'Choose ready-made narrated tours built around Salem.',
  },
  {
    icon: 'options-outline' as const,
    title: 'Build Your Own Tour',
    text: 'Choose the stops you want and let BROOMSTICK build the route.',
  },
  {
    icon: 'shield-checkmark-outline' as const,
    title: 'TourSafe Offline',
    text: 'Download purchased tour narration so weak service does not ruin the walk.',
  },
  {
    icon: 'navigate-outline' as const,
    title: 'Smart Tour Routing',
    text: 'Add or remove stops while touring and refresh the remaining route.',
  },
];

export default function BroomstickPlusScreen() {
  const {
    ready,
    configured,
    hasPlus,
    storePrice,
    busy,
    devUnlocked,
    purchase,
    restore,
    setDevUnlocked,
  } = usePlus();
  const [message, setMessage] = useState('');

  const buy = async () => {
    setMessage('');
    const result = await purchase();
    setMessage(result.message);
  };

  const restorePurchase = async () => {
    setMessage('');
    const result = await restore();
    setMessage(result.message);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={() => router.back()}
            style={styles.circleButton}
          >
            <Ionicons name="chevron-back" size={25} color={colors.text} />
          </Pressable>

          <Text style={styles.brand}>BROOMSTICK</Text>

          <View style={styles.circleButtonPlaceholder} />
        </View>

        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Text style={styles.broom}>🧹</Text>
          </View>
          <Text style={styles.eyebrow}>BROOMSTICK PLUS</Text>
          <Text style={styles.title}>Unlock Salem Tours</Text>
          <Text style={styles.subtitle}>
            Ready-made narrated tours, custom routes, and TourSafe offline access.
          </Text>

          <View style={styles.pricePill}>
            <Text style={styles.price}>{storePrice}</Text>
            <Text style={styles.priceCaption}>ONE-TIME UNLOCK</Text>
          </View>
        </View>

        <View style={styles.benefits}>
          {benefits.map((benefit) => (
            <View key={benefit.title} style={styles.benefit}>
              <View style={styles.benefitIcon}>
                <Ionicons
                  name={benefit.icon}
                  size={24}
                  color={colors.gold}
                />
              </View>
              <View style={styles.benefitCopy}>
                <Text style={styles.benefitTitle}>{benefit.title}</Text>
                <Text style={styles.benefitText}>{benefit.text}</Text>
              </View>
            </View>
          ))}
        </View>

        {hasPlus ? (
          <View style={styles.unlockedCard}>
            <Ionicons
              name="checkmark-circle"
              size={32}
              color={colors.success}
            />
            <View style={styles.unlockedCopy}>
              <Text style={styles.unlockedTitle}>
                BROOMSTICK Plus is unlocked
              </Text>
              <Text style={styles.unlockedText}>
                Your Salem Tours features are ready.
              </Text>
            </View>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            disabled={!ready || busy || !configured}
            onPress={() => void buy()}
            style={[
              styles.buyButton,
              (!ready || busy || !configured) && styles.disabled,
            ]}
          >
            <Ionicons
              name="sparkles"
              size={21}
              color={colors.background}
            />
            <Text style={styles.buyButtonText}>
              {busy
                ? 'CHECKING APP STORE…'
                : configured
                  ? `UNLOCK PLUS • ${storePrice}`
                  : 'PLUS PURCHASE SETUP PENDING'}
            </Text>
          </Pressable>
        )}

        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void restorePurchase()}
          style={[styles.restoreButton, busy && styles.disabled]}
        >
          <Ionicons
            name="refresh-outline"
            size={19}
            color={colors.gold}
          />
          <Text style={styles.restoreText}>RESTORE PURCHASES</Text>
        </Pressable>

        {message ? (
          <View style={styles.messageCard}>
            <Text style={styles.message}>{message}</Text>
          </View>
        ) : null}

        {!configured && !hasPlus ? (
          <View style={styles.setupNote}>
            <Ionicons
              name="construct-outline"
              size={20}
              color={colors.gold}
            />
            <Text style={styles.setupText}>
              The Plus storefront is not connected on this build yet. The feature gate is ready for App Store configuration.
            </Text>
          </View>
        ) : null}

        {__DEV__ ? (
          <View style={styles.devCard}>
            <View style={styles.devCopy}>
              <Text style={styles.devTitle}>Developer Plus Access</Text>
              <Text style={styles.devText}>
                Test the locked and unlocked Plus experience without making a purchase.
              </Text>
            </View>
            <Switch
              value={devUnlocked}
              onValueChange={(value) => void setDevUnlocked(value)}
              trackColor={{ false: '#4A4250', true: '#8A6730' }}
              thumbColor={devUnlocked ? colors.gold : '#D0C8D2'}
            />
          </View>
        ) : null}

        {hasPlus ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/tours')}
            style={styles.toursButton}
          >
            <Text style={styles.toursButtonText}>OPEN SALEM TOURS</Text>
            <Ionicons name="arrow-forward" size={19} color={colors.gold} />
          </Pressable>
        ) : null}

        <Text style={styles.footer}>
          Purchases are processed by the App Store. Restore Purchases can recover a previous BROOMSTICK Plus purchase made with the same Apple account.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  header: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  circleButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  circleButtonPlaceholder: {
    width: 44,
    height: 44,
  },
  brand: {
    ...typography.title,
    color: colors.gold,
    fontSize: 21,
  },
  hero: {
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#D4A94A',
    borderRadius: radius.lg,
    backgroundColor: '#27163A',
    padding: spacing.xl,
  },
  heroIcon: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 122, 0.55)',
    borderRadius: 36,
    backgroundColor: '#3B2455',
  },
  broom: {
    fontSize: 38,
    lineHeight: 44,
  },
  eyebrow: {
    ...typography.eyebrow,
    color: colors.gold,
    marginTop: spacing.md,
    letterSpacing: 1.3,
  },
  title: {
    ...typography.display,
    marginTop: 3,
    fontSize: 33,
    lineHeight: 39,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: '#E9E0EC',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  pricePill: {
    alignItems: 'center',
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: '#8E6D39',
    borderRadius: radius.pill,
    backgroundColor: '#17101E',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  price: {
    ...typography.title,
    color: colors.gold,
    fontSize: 25,
    lineHeight: 29,
  },
  priceCaption: {
    color: colors.textMuted,
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 1,
  },
  benefits: {
    gap: spacing.sm,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: '#51425F',
    borderRadius: radius.md,
    backgroundColor: '#111018',
    padding: spacing.md,
  },
  benefitIcon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: '#2A1C38',
  },
  benefitCopy: {
    flex: 1,
  },
  benefitTitle: {
    ...typography.heading,
    fontSize: 16,
  },
  benefitText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  buyButton: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.md,
  },
  buyButtonText: {
    color: colors.background,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  restoreButton: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radius.md,
    backgroundColor: '#17101E',
  },
  restoreText: {
    color: colors.gold,
    fontSize: 12.5,
    fontWeight: '900',
  },
  disabled: {
    opacity: 0.48,
  },
  messageCard: {
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  message: {
    ...typography.caption,
    color: colors.text,
    textAlign: 'center',
  },
  setupNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: '#6B572E',
    borderRadius: radius.md,
    backgroundColor: '#201A10',
    padding: spacing.md,
  },
  setupText: {
    ...typography.caption,
    flex: 1,
    color: '#E8DDC8',
  },
  unlockedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: radius.md,
    backgroundColor: '#122316',
    padding: spacing.md,
  },
  unlockedCopy: {
    flex: 1,
  },
  unlockedTitle: {
    ...typography.heading,
    color: colors.success,
  },
  unlockedText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  devCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: '#65547A',
    borderRadius: radius.md,
    backgroundColor: '#19131F',
    padding: spacing.md,
  },
  devCopy: {
    flex: 1,
  },
  devTitle: {
    color: colors.lavender,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  devText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  toursButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radius.md,
    backgroundColor: '#21172B',
  },
  toursButtonText: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: '900',
  },
  footer: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
});
