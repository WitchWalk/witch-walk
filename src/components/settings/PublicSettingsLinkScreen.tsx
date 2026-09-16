import type { ComponentProps } from 'react';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { usePublicContentSettings } from '@/hooks/usePublicContentSettings';
import { openExternalUrl } from '@/services/supportLinkCore';
import { colors, radius, spacing } from '@/theme/tokens';
import { SettingsInfoScreen } from './SettingsInfoScreen';

type IconName = ComponentProps<typeof Ionicons>['name'];

export function PublicSettingsLinkScreen({ title, icon, setting, buttonLabel, body }: {
  title: string;
  icon: IconName;
  setting: 'privacyPolicyUrl' | 'termsOfServiceUrl';
  buttonLabel: string;
  body: string;
}) {
  const { settings, ready } = usePublicContentSettings();
  const [error, setError] = useState('');
  const url = settings[setting];
  const open = async () => {
    if (!url) return;
    setError('');
    if (!(await openExternalUrl(url, Linking))) setError(`Unable to open ${title} right now. Please try again later.`);
  };

  const statusBody = !ready ? 'Loading…' : !url ? `${title} is unavailable right now.` : body;

  return (
    <SettingsInfoScreen title={title} icon={icon} body={statusBody}>
      {url ? <Pressable accessibilityRole="link" onPress={() => void open()} style={styles.button}><Text style={styles.buttonText}>{buttonLabel}</Text></Pressable> : null}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    </SettingsInfoScreen>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, backgroundColor: colors.gold, paddingHorizontal: spacing.md },
  buttonText: { color: colors.black, fontSize: 15, fontWeight: '900' },
  error: { color: colors.warning, fontSize: 13, lineHeight: 19, textAlign: 'center' },
});
