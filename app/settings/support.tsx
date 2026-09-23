import { Linking, Pressable, StyleSheet } from 'react-native';

import { AppText as Text } from '@/components/AppText';
import { SettingsInfoScreen } from '@/components/settings/SettingsInfoScreen';
import { usePublicContentSettings } from '@/hooks/usePublicContentSettings';
import { createSupportEmailUrl } from '@/services/publicSettingsCore';
import { openExternalUrl } from '@/services/supportLinkCore';
import { colors, radius, spacing } from '@/theme/tokens';

export default function SupportScreen() {
  const { settings, ready } = usePublicContentSettings();
  const mailto = settings.supportEmail ? createSupportEmailUrl(settings.supportEmail) : null;
  const body = mailto
    ? 'Contact the BROOMSTICK team for help with the app.'
    : ready ? 'Support contact information is unavailable right now.' : 'Loading…';

  return (
    <SettingsInfoScreen title="Contact / Support" icon="mail-outline" body={body}>
      {mailto ? (
        <Pressable accessibilityRole="link" onPress={() => void openExternalUrl(mailto, Linking)} style={styles.button}>
          <Text style={styles.buttonText}>Contact Support</Text>
        </Pressable>
      ) : null}
    </SettingsInfoScreen>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, backgroundColor: colors.gold, paddingHorizontal: spacing.md },
  buttonText: { color: colors.black, fontSize: 15, fontWeight: '900' },
});
