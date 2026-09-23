import { forwardRef, useMemo } from 'react';
import {
  PixelRatio,
  StyleSheet,
  Text as NativeText,
  TextInput as NativeTextInput,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from 'react-native';

import { useAppSettings } from '@/components/settings/AppSettingsProvider';
import { getAppTextScale } from '@/services/textSize';

function useScaledTextStyle(style: TextProps['style']) {
  const { settings } = useAppSettings();
  const scale = getAppTextScale(settings.textSizePreference, PixelRatio.getFontScale());

  return useMemo(() => {
    if (scale === 1) return style;

    const flattened = StyleSheet.flatten(style) as TextStyle | undefined;
    const fontSize = typeof flattened?.fontSize === 'number' ? flattened.fontSize : 14;
    const lineHeight = typeof flattened?.lineHeight === 'number' ? flattened.lineHeight : undefined;
    return [
      style,
      {
        fontSize: fontSize * scale,
        ...(lineHeight ? { lineHeight: lineHeight * scale } : null),
      },
    ];
  }, [scale, style]);
}

export const AppText = forwardRef<NativeText, TextProps>(function AppText(
  { style, ...props },
  ref,
) {
  const scaledStyle = useScaledTextStyle(style);
  return <NativeText ref={ref} style={scaledStyle} {...props} />;
});

export const AppTextInput = forwardRef<NativeTextInput, TextInputProps>(function AppTextInput(
  { style, ...props },
  ref,
) {
  const scaledStyle = useScaledTextStyle(style);
  return <NativeTextInput ref={ref} style={scaledStyle} {...props} />;
});
