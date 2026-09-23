import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { AppText as Text } from '@/components/AppText';
import { SettingsInfoScreen } from '@/components/settings/SettingsInfoScreen';
import { usePublicContentSettings } from '@/hooks/usePublicContentSettings';
import { openSupportPage } from '@/services/supportLink';
import { colors, radius, spacing } from '@/theme/tokens';

export default function SupportWitchWalkScreen() {
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState('');
  const { settings, ready } = usePublicContentSettings();

  const openSupport = async () => {
    if (opening || !settings.supportUrl) return;
    setOpening(true);
    setError('');
    const opened = await openSupportPage(settings.supportUrl);
    if (!opened) setError('Unable to open the support page right now. Please try again later.');
    setOpening(false);
  };

  return (
    <SettingsInfoScreen
      title="Enjoying BROOMSTICK?"
      icon="heart"
      body={!ready ? 'Loading…' : !settings.supportUrl ? 'The optional support page is unavailable right now.' : "BROOMSTICK is free to use. If it helped make your Salem visit easier and you'd like to help with the costs of keeping it running, you can leave an optional tip."}
    >
      {settings.supportUrl ? <Pressable
        accessibilityRole="link"
        accessibilityState={{ disabled: opening }}
        disabled={opening}
        onPress={() => void openSupport()}
        style={({ pressed }) => [styles.button, opening && styles.disabled, pressed && styles.pressed]}
      >
        <Text style={styles.buttonText}>{opening ? 'Opening Support Page…' : '❤️ Support BROOMSTICK'}</Text>
      </Pressable> : null}
      {settings.supportUrl ? <Text style={styles.thanks}>Thank you for helping keep BROOMSTICK free for everyone.</Text> : null}
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
