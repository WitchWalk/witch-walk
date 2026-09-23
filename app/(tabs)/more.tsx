import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText as Text } from '@/components/AppText';
import { useAppSettings } from '@/components/settings/AppSettingsProvider';
import { SettingsRow, SettingsSection, SettingsSwitchRow } from '@/components/settings/SettingsComponents';
import { usePublicContentSettings } from '@/hooks/usePublicContentSettings';
import {
  getLocationPermissionSummary,
  getNotificationPermissionSummary,
  type PermissionSummary,
} from '@/services/permissionStatus';
import { getInstalledAppVersionLabel } from '@/services/appMetadata';
import { createSupportEmailUrl } from '@/services/publicSettingsCore';
import { openExternalUrl } from '@/services/supportLinkCore';
import { WATCH_THRESHOLDS } from '@/services/witchWatchCore';
import { disableRemotePushTokens } from '@/services/witchWatchRemoteRepository';
import { enableRemoteWatchNotifications, enableWatchNotifications } from '@/services/witchWatchNotifications';
import { remoteWitchWatchEnabled } from '@/config/witchWatchBackend';
import { colors, radius, spacing, typography } from '@/theme/tokens';

const heroArtwork = require('../../Photos/Broomstick Header.png');
const unavailable: PermissionSummary = { label: 'Unavailable', canOpenSettings: false };

export default function MoreScreen() {
  const { settings, ready, updateSettings } = useAppSettings();
  const [notificationPermission, setNotificationPermission] = useState(unavailable);
  const [locationPermission, setLocationPermission] = useState(unavailable);
  const [message, setMessage] = useState('');
  const { settings: publicSettings } = usePublicContentSettings();
  const versionLabel = getInstalledAppVersionLabel();

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

  const openWebLink = (url: string, failureMessage: string) => {
    setMessage('');
    void openExternalUrl(url, Linking).then((opened) => {
      if (!opened) setMessage(failureMessage);
    });
  };

  const openSupportEmail = () => {
    const url = publicSettings.supportEmail ? createSupportEmailUrl(publicSettings.supportEmail) : null;
    if (url) openWebLink(url, 'Unable to open your email app right now. Please try again later.');
  };

  const openPrivacyPolicy = () => {
    if (publicSettings.privacyPolicyUrl) openWebLink(publicSettings.privacyPolicyUrl, 'Unable to open the Privacy Policy right now.');
  };

  const openTerms = () => {
    if (publicSettings.termsOfServiceUrl) openWebLink(publicSettings.termsOfServiceUrl, 'Unable to open the Terms of Service right now.');
  };

  const openHouseArauz = () => {
    if (publicSettings.houseArauzYoutubeChannelUrl) openWebLink(publicSettings.houseArauzYoutubeChannelUrl, 'Unable to open HOUSE ARAUZ YouTube right now.');
  };

  const setWitchWatchEnabled = async (value: boolean) => {
    update({ witchWatchEnabled: value });
    if (!value && remoteWitchWatchEnabled) {
      await disableRemotePushTokens();
      return;
    }
    if (!value) return;
    if (!remoteWitchWatchEnabled) {
      if (!(await enableWatchNotifications())) setMessage('Witch Watch is saved. Enable notifications in device settings to receive alerts.');
      return;
    }
    const result = await enableRemoteWatchNotifications();
    if (result === 'denied') setMessage('Witch Watch is saved. Enable notifications in device settings to receive alerts.');
    else if (result === 'unavailable') setMessage('Witch Watch is saved, but remote alerts are not available on this build yet.');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.artworkWindow}>
            <Image
              source={heroArtwork}
              resizeMode="cover"
              style={styles.heroImage}
              accessibilityLabel="BROOMSTICK — The Salem Guidebook"
              accessibilityIgnoresInvertColors
            />
            <View style={styles.heroShade} />
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
          <SettingsSwitchRow icon="notifications-outline" label="Enable Witch Watch" value={settings.witchWatchEnabled} disabled={!ready} onValueChange={(value) => void setWitchWatchEnabled(value)} />
          <SettingsSwitchRow icon="people-outline" label="Busy → Moderate alerts" value={settings.busyToModerateAlertsEnabled} disabled={!ready || !settings.witchWatchEnabled} onValueChange={(value) => update({ busyToModerateAlertsEnabled: value })} />
          <SettingsSwitchRow icon="people-outline" iconColor={colors.success} label="Moderate → Light alerts" value={settings.moderateToLightAlertsEnabled} disabled={!ready || !settings.witchWatchEnabled} onValueChange={(value) => update({ moderateToLightAlertsEnabled: value })} />
          <SettingsRow icon="time-outline" iconColor={colors.gold} label="Default wait-time threshold" value={`${settings.defaultWaitThresholdMinutes} min`} onPress={cycleThreshold} hint="Tap to choose 10, 20, 30, or 45 minutes" />
          <SettingsRow icon="people" iconColor={colors.gold} label="Manage watched locations" onPress={() => router.push('/witch-watch')} />
        </View>

        <SettingsSection icon="notifications-outline" title="Notifications">
          <SettingsRow icon="notifications" label="Push Notifications" value={notificationPermission.label} onPress={notificationPermission.canOpenSettings ? openSystemSettings : undefined} hint={notificationPermission.canOpenSettings ? 'Open device settings to change' : undefined} />
        </SettingsSection>

        <SettingsSection icon="location-outline" title="Permissions">
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

        <SettingsSection icon="information-circle" title="About">
          {publicSettings.aboutBroomstickText ? (
            <View style={styles.aboutBlock}>
              <View style={styles.aboutHeading}>
                <Ionicons name="moon" size={20} color={colors.purple} />
                <Text style={styles.aboutTitle}>About BROOMSTICK</Text>
              </View>
              <Text style={styles.aboutText}>{publicSettings.aboutBroomstickText}</Text>
            </View>
          ) : null}
          <SettingsRow icon="sparkles" iconColor={colors.gold} label="App Version / Build" value={versionLabel} />
        </SettingsSection>

        {publicSettings.supportUrl || publicSettings.supportEmail ? (
          <SettingsSection icon="heart" title="Support">
            {publicSettings.supportUrl ? <SettingsRow icon="heart" iconColor="#E779C6" label="❤️ Support BROOMSTICK" hint="Help keep BROOMSTICK free and running." onPress={() => router.push('/settings/support-witch-walk')} /> : null}
            {publicSettings.supportEmail ? <SettingsRow icon="mail" label="Contact Support" external onPress={openSupportEmail} /> : null}
          </SettingsSection>
        ) : null}

        {publicSettings.privacyPolicyUrl || publicSettings.termsOfServiceUrl || publicSettings.houseArauzYoutubeChannelUrl ? (
          <SettingsSection icon="link" title="Links">
            {publicSettings.privacyPolicyUrl ? <SettingsRow icon="shield-checkmark-outline" label="Privacy Policy" external onPress={openPrivacyPolicy} /> : null}
            {publicSettings.termsOfServiceUrl ? <SettingsRow icon="document-text-outline" label="Terms of Service" external onPress={openTerms} /> : null}
            {publicSettings.houseArauzYoutubeChannelUrl ? <SettingsRow icon="play-circle-outline" iconColor={colors.orange} label="HOUSE ARAUZ YouTube" external onPress={openHouseArauz} /> : null}
          </SettingsSection>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { gap: spacing.md, paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  hero: { overflow: 'hidden', borderWidth: 1, borderColor: colors.borderSoft, borderRadius: radius.md, backgroundColor: colors.backgroundRaised },
  artworkWindow: { height: 102, overflow: 'hidden', backgroundColor: '#160D25' },
  heroImage: { width: '100%', height: '100%' },
  heroShade: { position: 'absolute', inset: 0, backgroundColor: 'rgba(8, 5, 14, 0.25)' },
  heroCopy: { minHeight: 66, justifyContent: 'center', paddingHorizontal: spacing.md, paddingVertical: 8 },
  title: { ...typography.display, fontSize: 30, lineHeight: 34 },
  subtitle: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  message: { color: colors.warning, fontSize: 12.5, lineHeight: 17, paddingHorizontal: spacing.xs },
  aboutBlock: { gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#43506A' },
  aboutHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  aboutTitle: { color: colors.text, fontSize: 14.5, lineHeight: 19, fontWeight: '700' },
  aboutText: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  watchCard: { overflow: 'hidden', borderWidth: 1, borderColor: '#6A5A96', borderRadius: radius.md, backgroundColor: 'rgba(10, 17, 29, 0.96)' },
  watchHeading: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#536080', backgroundColor: 'rgba(79, 34, 112, 0.25)' },
  watchHeadingCopy: { minWidth: 0, flex: 1 },
  watchTitle: { ...typography.title, fontSize: 23, lineHeight: 28 },
  watchSubtitle: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
});
