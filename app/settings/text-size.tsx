import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppSettings } from '@/components/settings/AppSettingsProvider';
import { SettingsInfoScreen } from '@/components/settings/SettingsInfoScreen';
import type { TextSizePreference } from '@/services/appSettingsRepository';
import { colors, radius, spacing } from '@/theme/tokens';

const options: { value: TextSizePreference; title: string; detail: string }[] = [
  { value: 'default', title: 'Default', detail: 'Use the current approved Witch Walk typography.' },
  { value: 'larger', title: 'Larger', detail: 'Save a preference for the planned app-wide larger-text layout pass.' },
];

export default function TextSizeScreen() {
  const { settings, updateSettings } = useAppSettings();
  return (
    <SettingsInfoScreen title="Text Size" icon="text-outline" body="Choose and save your preferred Witch Walk text size.">
      <View style={styles.options}>
        {options.map((option) => {
          const selected = settings.textSizePreference === option.value;
          return (
            <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={() => void updateSettings({ textSizePreference: option.value })} style={[styles.option, selected && styles.selected]}>
              <View style={styles.optionCopy}>
                <Text style={[styles.optionTitle, option.value === 'larger' && styles.larger]}>{option.title}</Text>
                <Text style={styles.optionDetail}>{option.detail}</Text>
              </View>
              <View style={[styles.radio, selected && styles.radioSelected]} />
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.note}>The preference persists now. To protect approved layouts, Larger will not alter every screen until responsive typography is validated app-wide.</Text>
    </SettingsInfoScreen>
  );
}

const styles = StyleSheet.create({
  options: { gap: spacing.sm },
  option: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderColor: '#536080', borderRadius: radius.sm, padding: spacing.md },
  selected: { borderColor: colors.gold, backgroundColor: '#2B1B26' },
  optionCopy: { minWidth: 0, flex: 1 },
  optionTitle: { color: colors.text, fontSize: 16, lineHeight: 21, fontWeight: '800' },
  larger: { fontSize: 19, lineHeight: 24 },
  optionDetail: { marginTop: 2, color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  radio: { width: 20, height: 20, borderWidth: 2, borderColor: colors.textMuted, borderRadius: radius.pill },
  radioSelected: { borderWidth: 6, borderColor: colors.gold },
  note: { color: colors.warning, fontSize: 12.5, lineHeight: 18 },
});
