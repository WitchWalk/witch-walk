import type { TextStyle, ViewStyle } from 'react-native';

export const colors = {
  background: '#09070D',
  backgroundRaised: '#130D1D',
  surface: '#1A1226',
  surfaceElevated: '#241731',
  border: '#49365F',
  borderSoft: '#30243F',
  text: '#FFF8E8',
  textMuted: '#C9BED0',
  gold: '#F5B544',
  orange: '#E77B38',
  purple: '#A967D5',
  lavender: '#D4A9EE',
  success: '#62C99B',
  warning: '#FFB02E',
  tabInactive: '#978CA3',
  black: '#000000',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  pill: 999,
} as const;

export const typography = {
  display: {
    fontFamily: 'Georgia',
    fontSize: 34,
    lineHeight: 39,
    fontWeight: '700',
    color: colors.text,
  } satisfies TextStyle,
  title: {
    fontFamily: 'Georgia',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    color: colors.text,
  } satisfies TextStyle,
  heading: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    color: colors.text,
  } satisfies TextStyle,
  body: {
    fontSize: 16,
    lineHeight: 23,
    color: colors.text,
  } satisfies TextStyle,
  caption: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  } satisfies TextStyle,
  eyebrow: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: colors.gold,
  } satisfies TextStyle,
} as const;

export const shadows = {
  card: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 7,
  } satisfies ViewStyle,
} as const;
