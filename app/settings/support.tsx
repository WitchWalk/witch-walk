import { Linking, Pressable, StyleSheet, Text } from 'react-native';

import { SettingsInfoScreen } from '@/components/settings/SettingsInfoScreen';
import { appLinks } from '@/config/appLinks';
import { colors, radius, spacing } from '@/theme/tokens';

export default function SupportScreen() {
  const body = appLinks.supportEmail
    ? 'Contact the BROOMSTICK team for help with the app.'
    : 'Final support contact information will be added before release.';

  return (
    <SettingsInfoScreen title="Contact / Support" icon="mail-outline" body={body}>
      {appLinks.supportEmail ? (
        <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(`mailto:${appLinks.supportEmail}`)} style={styles.button}>
          <Text style={styles.buttonText}>Contact Support</Text>
        </Pressable>
      ) : <Text style={styles.note}>No email address has been configured yet.</Text>}
    </SettingsInfoScreen>
  );
}

const styles = StyleSheet.create({
  note: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  button: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, backgroundColor: colors.gold, paddingHorizontal: spacing.md },
  buttonText: { color: colors.black, fontSize: 15, fontWeight: '900' },
});
