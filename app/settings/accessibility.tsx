import { Linking, Pressable, StyleSheet } from 'react-native';

import { AppText as Text } from '@/components/AppText';
import { SettingsInfoScreen } from '@/components/settings/SettingsInfoScreen';
import { settingsContent } from '@/config/settingsContent';
import { colors, radius, spacing } from '@/theme/tokens';

export default function AccessibilityScreen() {
  return (
    <SettingsInfoScreen {...settingsContent.accessibility}>
      <Text style={styles.note}>You can continue using system features such as VoiceOver, TalkBack, increased contrast, and display zoom.</Text>
      <Pressable accessibilityRole="button" onPress={() => void Linking.openSettings()} style={styles.button}>
        <Text style={styles.buttonText}>Open Device Settings</Text>
      </Pressable>
    </SettingsInfoScreen>
  );
}

const styles = StyleSheet.create({
  note: { color: colors.text, fontSize: 14, lineHeight: 21 },
  button: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.gold, borderRadius: radius.sm, paddingHorizontal: spacing.md },
  buttonText: { color: colors.gold, fontSize: 15, fontWeight: '800' },
});
