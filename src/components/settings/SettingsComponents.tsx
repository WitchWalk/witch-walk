import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { AppText as Text } from '@/components/AppText';
import { colors, radius, spacing, typography } from '@/theme/tokens';

type IconName = ComponentProps<typeof Ionicons>['name'];

export function SettingsSection({ icon, title, children }: { icon: IconName; title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={22} color={colors.gold} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View>{children}</View>
    </View>
  );
}

type RowProps = {
  icon: IconName;
  iconColor?: string;
  label: string;
  value?: string;
  onPress?: () => void;
  external?: boolean;
  hint?: string;
};

export function SettingsRow({ icon, iconColor = colors.lavender, label, value, onPress, external, hint }: RowProps) {
  const content = (
    <>
      <Ionicons name={icon} size={20} color={iconColor} style={styles.rowIcon} />
      <View style={styles.labelArea}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      {onPress ? <Ionicons name={external ? 'open-outline' : 'chevron-forward'} size={18} color={colors.textMuted} /> : null}
    </>
  );

  return onPress ? (
    <Pressable accessibilityRole={external ? 'link' : 'button'} accessibilityLabel={`${label}${value ? `, ${value}` : ''}`} onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      {content}
    </Pressable>
  ) : <View style={styles.row}>{content}</View>;
}

export function SettingsSwitchRow({ icon, iconColor = colors.gold, label, value, disabled, onValueChange }: {
  icon: IconName;
  iconColor?: string;
  label: string;
  value: boolean;
  disabled?: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={20} color={iconColor} style={styles.rowIcon} />
      <Text style={styles.switchLabel}>{label}</Text>
      <Switch
        accessibilityLabel={label}
        disabled={disabled}
        ios_backgroundColor="#3B3343"
        onValueChange={onValueChange}
        trackColor={{ false: '#3B3343', true: '#D68D19' }}
        thumbColor={value ? colors.text : '#B8ADBD'}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { overflow: 'hidden', borderWidth: 1, borderColor: '#536080', borderRadius: radius.md, backgroundColor: 'rgba(10, 17, 29, 0.92)' },
  sectionHeader: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#536080', backgroundColor: 'rgba(75, 42, 101, 0.18)' },
  sectionTitle: { ...typography.title, flex: 1, fontSize: 19, lineHeight: 24 },
  row: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#43506A' },
  rowIcon: { width: 24, textAlign: 'center' },
  labelArea: { minWidth: 0, flex: 1 },
  rowLabel: { color: colors.text, fontSize: 14.5, lineHeight: 19, fontWeight: '600' },
  switchLabel: { minWidth: 0, flex: 1, color: colors.text, fontSize: 14.5, lineHeight: 19, fontWeight: '600' },
  rowHint: { marginTop: 1, color: colors.textMuted, fontSize: 10.5, lineHeight: 14 },
  rowValue: { maxWidth: '34%', flexShrink: 1, color: colors.textMuted, fontSize: 12.5, lineHeight: 17, textAlign: 'right' },
  pressed: { backgroundColor: 'rgba(245, 181, 68, 0.08)' },
});
