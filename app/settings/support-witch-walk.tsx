import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { SettingsInfoScreen } from '@/components/settings/SettingsInfoScreen';
import { openSupportPage } from '@/services/supportLink';
import { colors, radius, spacing } from '@/theme/tokens';

export default function SupportWitchWalkScreen() {
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState('');

  const openSupport = async () => {
    if (opening) return;
    setOpening(true);
    setError('');
    const opened = await openSupportPage();
    if (!opened) setError('Unable to open the support page right now. Please try again later.');
    setOpening(false);
  };

  return (
    <SettingsInfoScreen
      title="Enjoying Witch Walk?"
      icon="heart"
      body="Witch Walk is free to use. If it helped make your Salem visit easier and you'd like to help with the costs of keeping it running, you can leave an optional tip."
    >
      <Pressable
        accessibilityRole="link"
        accessibilityState={{ disabled: opening }}
        disabled={opening}
        onPress={() => void openSupport()}
        style={({ pressed }) => [styles.button, opening && styles.disabled, pressed && styles.pressed]}
      >
        <Text style={styles.buttonText}>{opening ? 'Opening Support Page…' : '❤️ Support Witch Walk'}</Text>
      </Pressable>
      <Text style={styles.thanks}>Thank you for helping keep Witch Walk free for everyone.</Text>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    </SettingsInfoScreen>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderRadius: radius.md, backgroundColor: colors.gold, paddingHorizontal: spacing.lg },
  buttonText: { minWidth: 0, flexShrink: 1, color: colors.black, fontSize: 17, lineHeight: 22, fontWeight: '900', textAlign: 'center' },
  thanks: { color: colors.textMuted, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  error: { color: colors.warning, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  disabled: { opacity: 0.62 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
});
