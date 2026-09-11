import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppSettings } from '@/components/settings/AppSettingsProvider';
import { SettingsRow, SettingsSection, SettingsSwitchRow } from '@/components/settings/SettingsComponents';
import { appLinks } from '@/config/appLinks';
import {
  getLocationPermissionSummary,
  getNotificationPermissionSummary,
  type PermissionSummary,
} from '@/services/permissionStatus';
import { WATCH_THRESHOLDS } from '@/services/witchWatchCore';
import { colors, radius, spacing, typography } from '@/theme/tokens';

const heroArtwork = require('../../Screen Designs/Style design.png');
const unavailable: PermissionSummary = { label: 'Unavailable', canOpenSettings: false };

export default function MoreScreen() {
  const { settings, ready, updateSettings } = useAppSettings();
  const [notificationPermission, setNotificationPermission] = useState(unavailable);
  const [locationPermission, setLocationPermission] = useState(unavailable);
  const [message, setMessage] = useState('');

  useFocusEffect(useCallback(() => {
    let active = true;
    void Promise.all([getNotificationPermissionSummary(), getLocationPermissionSummary()]).then(([notifications, location]) => {
      if (active) {
        setNotificationPermission(notifications);
        setLocationPermission(location);
      }
    });
    return () => { active = false; };
  }, []));

  const update = (changes: Parameters<typeof updateSettings>[0]) => {
    setMessage('');
    void updateSettings(changes).catch(() => setMessage('Could not save that setting. Please try again.'));
  };

  const cycleThreshold = () => {
    const currentIndex = WATCH_THRESHOLDS.indexOf(settings.defaultWaitThresholdMinutes);
    const next = WATCH_THRESHOLDS[(currentIndex + 1) % WATCH_THRESHOLDS.length];
    update({ defaultWaitThresholdMinutes: next });
  };

  const openSystemSettings = () => {
    void Linking.openSettings().catch(() => setMessage('Open your phone settings to manage this permission.'));
  };

  const openHouseArauz = () => {
    if (appLinks.houseArauzUrl) {
      void Linking.openURL(appLinks.houseArauzUrl).catch(() => setMessage('The HOUSE ARAUZ destination could not be opened.'));
      return;
    }
    router.push('/house-arauz');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.artworkWindow}>
            <Image source={heroArtwork} resizeMode="cover" style={styles.heroImage} accessibilityIgnoresInvertColors />
            <View style={styles.heroShade} />
            <Text style={styles.wordmark}>Witch <Text style={styles.star}>✦</Text> Walk</Text>
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.title}>More</Text>
            <Text style={styles.subtitle}>Settings, alerts, and app information.</Text>
          </View>
        </View>

        {message ? <Text accessibilityRole="alert" style={styles.message}>{message}</Text> : null}

        <View style={styles.watchCard}>
          <View style={styles.watchHeading}>
            <Ionicons name="notifications" size={29} color={colors.gold} />
            <View style={styles.watchHeadingCopy}>
              <Text style={styles.watchTitle}>Witch Watch Alerts</Text>
              <Text style={styles.watchSubtitle}>Get notified when wait times improve.</Text>
            </View>
          </View>
          <SettingsSwitchRow icon="notifications-outline" label="Enable Witch Watch" value={settings.witchWatchEnabled} disabled={!ready} onValueChange={(value) => update({ witchWatchEnabled: value })} />
          <SettingsSwitchRow icon="people-outline" label="Busy → Moderate alerts" value={settings.busyToModerateAlertsEnabled} disabled={!ready || !settings.witchWatchEnabled} onValueChange={(value) => update({ busyToModerateAlertsEnabled: value })} />
          <SettingsSwitchRow icon="people-outline" iconColor={colors.success} label="Moderate → Light alerts" value={settings.moderateToLightAlertsEnabled} disabled={!ready || !settings.witchWatchEnabled} onValueChange={(value) => update({ moderateToLightAlertsEnabled: value })} />
          <SettingsRow icon="time-outline" iconColor={colors.gold} label="Default wait-time threshold" value={`${settings.defaultWaitThresholdMinutes} min`} onPress={cycleThreshold} hint="Tap to choose 10, 20, 30, or 45 minutes" />
          <SettingsRow icon="people" iconColor={colors.gold} label="Manage watched locations" onPress={() => router.push('/witch-watch')} />
        </View>

        <SettingsSection icon="notifications-outline" title="Notifications">
          <SettingsRow icon="notifications" label="Push Notifications" value={notificationPermission.label} onPress={notificationPermission.canOpenSettings ? openSystemSettings : undefined} hint={notificationPermission.canOpenSettings ? 'Open device settings to change' : undefined} />
          <SettingsRow icon="location" iconColor={colors.purple} label="Location Access" value={locationPermission.label} onPress={locationPermission.canOpenSettings ? openSystemSettings : undefined} hint={locationPermission.canOpenSettings ? 'Open device settings to change' : undefined} />
        </SettingsSection>

        <SettingsSection icon="settings" title="Appearance & Accessibility">
          <SettingsRow icon="text" iconColor={colors.purple} label="Text Size" value={settings.textSizePreference === 'larger' ? 'Larger' : 'Default'} onPress={() => router.push('/settings/text-size')} />
          <SettingsRow icon="accessibility" iconColor="#8FA8FF" label="Accessibility Options" onPress={() => router.push('/settings/accessibility')} />
        </SettingsSection>

        <SettingsSection icon="heart" title="My Stuff">
          <SettingsRow icon="heart" iconColor="#E779C6" label="Favorites / Saved Places" onPress={() => router.push('/favorites')} />
          <SettingsRow icon="people" iconColor={colors.gold} label="Manage Witch Watch Locations" onPress={() => router.push('/witch-watch')} />
        </SettingsSection>

        <SettingsSection icon="document-text" title="Legal & Support">
          <SettingsRow icon="heart" iconColor="#E779C6" label="❤️ Support Witch Walk" hint="Help keep Witch Walk free and running." onPress={() => router.push('/settings/support-witch-walk')} />
          <SettingsRow icon="shield-checkmark-outline" label="Privacy Policy" onPress={() => router.push('/settings/privacy')} />
          <SettingsRow icon="document-text-outline" label="Terms of Service" onPress={() => router.push('/settings/terms')} />
          <SettingsRow icon="mail" label="Contact / Support" onPress={() => router.push('/settings/support')} />
          <SettingsRow icon="play-circle-outline" iconColor={colors.orange} label="HOUSE ARAUZ" value={appLinks.houseArauzUrl ? undefined : 'Coming soon'} external={Boolean(appLinks.houseArauzUrl)} onPress={openHouseArauz} />
        </SettingsSection>

        <SettingsSection icon="information-circle" title="About">
          <SettingsRow icon="moon" iconColor={colors.purple} label="About Witch Walk" onPress={() => router.push('/settings/about')} />
          <SettingsRow icon="sparkles" iconColor={colors.gold} label="App Version" value={`Witch Walk v${Constants.expoConfig?.version ?? 'Unavailable'}`} />
        </SettingsSection>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { gap: spacing.md, paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  hero: { overflow: 'hidden', borderWidth: 1, borderColor: colors.borderSoft, borderRadius: radius.md, backgroundColor: colors.backgroundRaised },
  artworkWindow: { height: 102, overflow: 'hidden', backgroundColor: '#160D25' },
  heroImage: { position: 'absolute', top: -70, right: -60, width: 480, height: 480 },
  heroShade: { position: 'absolute', inset: 0, backgroundColor: 'rgba(8, 5, 14, 0.25)' },
  wordmark: { ...typography.display, position: 'absolute', top: 11, left: spacing.md, overflow: 'hidden', borderRadius: radius.sm, backgroundColor: 'rgba(5, 3, 9, 0.68)', paddingHorizontal: 9, paddingVertical: 2, fontSize: 19, lineHeight: 24, textTransform: 'uppercase', textShadowColor: colors.black, textShadowRadius: 4 },
  star: { color: colors.gold, fontSize: 14 },
  heroCopy: { minHeight: 66, justifyContent: 'center', paddingHorizontal: spacing.md, paddingVertical: 8 },
  title: { ...typography.display, fontSize: 30, lineHeight: 34 },
  subtitle: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  message: { color: colors.warning, fontSize: 12.5, lineHeight: 17, paddingHorizontal: spacing.xs },
  watchCard: { overflow: 'hidden', borderWidth: 1, borderColor: '#6A5A96', borderRadius: radius.md, backgroundColor: 'rgba(10, 17, 29, 0.96)' },
  watchHeading: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#536080', backgroundColor: 'rgba(79, 34, 112, 0.25)' },
  watchHeadingCopy: { minWidth: 0, flex: 1 },
  watchTitle: { ...typography.title, fontSize: 23, lineHeight: 28 },
  watchSubtitle: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
});
